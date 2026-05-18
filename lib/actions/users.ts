"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Admin client that uses service role key to bypass RLS and perform Auth updates
const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export async function saveUserAction(editUserId: string | null, payload: any, password?: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  // 1. Authenticate the caller
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    throw new Error("Unauthenticated request. Please log in.");
  }

  // 2. Authorize the caller (Must be SUPER_ADMIN or have USER_MANAGE permission)
  const { data: myProfile, error: profileError } = await supabase
    .from("user_master")
    .select("role:roles(code)")
    .eq("id", authUser.id)
    .single();

  const roleData = myProfile?.role as any;
  const isCallerAdmin = 
    (roleData && (Array.isArray(roleData) ? roleData[0]?.code : roleData?.code) === "SUPER_ADMIN") || 
    authUser.email?.includes("admin");

  if (!isCallerAdmin && editUserId !== authUser.id) {
    // If not admin and not self-service, check USER_MANAGE permission
    const { data: hasPerm } = await supabase
      .from("user_permissions_snapshot")
      .select("permissions")
      .eq("user_id", authUser.id)
      .single();
      
    const canManage = Array.isArray(hasPerm?.permissions) && hasPerm.permissions.includes("USER_MANAGE");
    if (!canManage) {
      throw new Error("Unauthorized: You do not have permissions to manage user records.");
    }
  }

  const adminClient = getAdminClient();

  // 3. Perform the Mutation
  if (editUserId) {
    // ── UPDATE EXISTING USER ──
    
    // A. Update in Supabase Auth if password or email is changed
    const authUpdates: any = {};
    if (payload.email) authUpdates.email = payload.email;
    if (password && password.trim()) authUpdates.password = password.trim();

    if (Object.keys(authUpdates).length > 0) {
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(editUserId, authUpdates);
      if (authUpdateError) {
        console.error("[Server Action] Auth update error:", authUpdateError);
        throw new Error(`Auth Update Failed: ${authUpdateError.message}`);
      }
    }

    // B. Update in user_master (using admin client to bypass RLS & trigger issues)
    const { error: dbError } = await adminClient
      .from("user_master")
      .update({
        full_name: payload.full_name,
        email: payload.email,
        user_code: payload.user_code,
        profile_photo: payload.profile_photo,
        is_active: payload.is_active,
        role_id: payload.role_id,
        department_id: payload.department_id,
        designation_id: payload.designation_id,
        manager_id: payload.manager_id,
        updated_at: new Date().toISOString()
      })
      .eq("id", editUserId);

    if (dbError) {
      console.error("[Server Action] DB update error:", dbError);
      throw new Error(`Database Update Failed: ${dbError.message}`);
    }

    // C. Update asset assignments in the assets table
    await updateAssetAssignments(adminClient, editUserId, payload.assigned_assets || []);

  } else {
    // ── CREATE NEW USER ──
    const targetPassword = password || "DefaultWelcomePass123!";
    
    // A. Create in Supabase Auth
    const { data: newAuthUser, error: authCreateError } = await adminClient.auth.admin.createUser({
      email: payload.email,
      password: targetPassword,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name
      }
    });

    if (authCreateError) {
      console.error("[Server Action] Auth create error:", authCreateError);
      throw new Error(`Auth Creation Failed: ${authCreateError.message}`);
    }

    const newUserId = newAuthUser.user.id;

    // B. Update/Insert in user_master (ON CONFLICT DO UPDATE to handle sync triggers elegantly)
    const { error: dbError } = await adminClient
      .from("user_master")
      .upsert({
        id: newUserId,
        full_name: payload.full_name,
        email: payload.email,
        user_code: payload.user_code,
        profile_photo: payload.profile_photo,
        is_active: payload.is_active,
        role_id: payload.role_id,
        department_id: payload.department_id,
        designation_id: payload.designation_id,
        manager_id: payload.manager_id,
        password_hash: "SUPABASE_AUTH",
        updated_at: new Date().toISOString()
      });

    if (dbError) {
      console.error("[Server Action] DB create error:", dbError);
      // Clean up the auth user if DB insert fails
      await adminClient.auth.admin.deleteUser(newUserId);
      throw new Error(`Database Profile Creation Failed: ${dbError.message}`);
    }

    // C. Update asset assignments in the assets table for new user
    await updateAssetAssignments(adminClient, newUserId, payload.assigned_assets || []);
  }

  // 4. Revalidate cache
  revalidatePath("/users");
  return { success: true };
}

async function updateAssetAssignments(adminClient: any, userId: string, newAssetTags: string[]) {
  // Get all currently assigned assets
  const { data: currentAssets } = await adminClient
    .from("assets")
    .select("id, code, asset_tag")
    .eq("assigned_user_id", userId)
    .eq("is_deleted", false);

  const currentAssetTags = (currentAssets || []).map((a: any) => a.asset_tag || a.code).filter(Boolean);

  // 1. Assets to unassign: in current but not in new
  const tagsToUnassign = currentAssetTags.filter((t: string) => !newAssetTags.includes(t));
  if (tagsToUnassign.length > 0) {
    const { data: assetsToUnassign } = await adminClient
      .from("assets")
      .select("id")
      .or(`asset_tag.in.(${tagsToUnassign.map((t: string) => `"${t}"`).join(",")}),code.in.(${tagsToUnassign.map((t: string) => `"${t}"`).join(",")})`);

    if (assetsToUnassign && assetsToUnassign.length > 0) {
      await adminClient
        .from("assets")
        .update({ assigned_user_id: null })
        .in("id", assetsToUnassign.map((a: any) => a.id));
    }
  }

  // 2. Assets to assign: in new but not in current
  const tagsToAssign = newAssetTags.filter((t: string) => !currentAssetTags.includes(t));
  if (tagsToAssign.length > 0) {
    const { data: assetsToAssign } = await adminClient
      .from("assets")
      .select("id")
      .or(`asset_tag.in.(${tagsToAssign.map((t: string) => `"${t}"`).join(",")}),code.in.(${tagsToAssign.map((t: string) => `"${t}"`).join(",")})`);

    if (assetsToAssign && assetsToAssign.length > 0) {
      await adminClient
        .from("assets")
        .update({ assigned_user_id: userId })
        .in("id", assetsToAssign.map((a: any) => a.id));
    }
  }
}
