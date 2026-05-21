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

  // 2. Authorize the caller (Must be SUPER_ADMIN or have USERS_CREATE/USERS_UPDATE/USERS_MANAGE permission)
  // Check SUPER_ADMIN via role_id
  const { data: myProfileData } = await supabase
    .from("user_master")
    .select("role_id")
    .eq("id", authUser.id)
    .single();

  let isCallerAdmin = false;

  if (myProfileData?.role_id) {
    const { data: roleData } = await supabase
      .from("roles")
      .select("code")
      .eq("id", myProfileData.role_id)
      .single();

    if (roleData?.code === "SUPER_ADMIN") {
      isCallerAdmin = true;
    }
  }

  // Also check user_roles table
  if (!isCallerAdmin) {
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role:roles(code)")
      .eq("user_id", authUser.id);

    if (userRoles && userRoles.length > 0) {
      for (const ur of userRoles) {
        const role = ur.role as any;
        const roleCode = Array.isArray(role) ? role[0]?.code : role?.code;
        if (roleCode === "SUPER_ADMIN") {
          isCallerAdmin = true;
          break;
        }
      }
    }
  }

  if (!isCallerAdmin && editUserId !== authUser.id) {
    // Check permissions in snapshot
    const { data: userPerms } = await supabase
      .from("user_permissions_snapshot")
      .select("permission_code")
      .eq("user_id", authUser.id);
      
    const perms = userPerms ? userPerms.map((r: any) => r.permission_code) : [];
    const isEditing = !!editUserId;
    const requiredPerm = isEditing ? "USERS_UPDATE" : "USERS_CREATE";
    const canManage = perms.includes(requiredPerm) || perms.includes("USERS_MANAGE");

    if (!canManage) {
      throw new Error("Unauthorized: You do not have permissions to manage user records.");
    }
  }

  const isServiceRoleAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminClient = getAdminClient();
  const targetClient = isServiceRoleAvailable ? adminClient : supabase;

  // 3. Perform the Mutation
  if (editUserId) {
    // ── UPDATE EXISTING USER ──
    
    // A. Update in Supabase Auth if password or email is changed and different
    const authUpdates: any = {};
    
    // Fetch existing email and role_id to verify difference
    const { data: existingUser } = await supabase
      .from("user_master")
      .select("email, role_id")
      .eq("id", editUserId)
      .single();

    if (payload.email && payload.email !== existingUser?.email) {
      authUpdates.email = payload.email;
    }
    if (password && password.trim()) {
      authUpdates.password = password.trim();
    }

    if (Object.keys(authUpdates).length > 0) {
      if (isServiceRoleAvailable) {
        const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(editUserId, authUpdates);
        if (authUpdateError) {
          console.error("[Server Action] Auth update error:", authUpdateError);
          throw new Error(`Auth Update Failed: ${authUpdateError.message}`);
        }
      } else {
        // Fallback: If editing self, we can update via the authenticated client
        if (editUserId === authUser.id) {
          const { error: authUpdateError } = await supabase.auth.updateUser(authUpdates);
          if (authUpdateError) {
            console.error("[Server Action] Self Auth update error:", authUpdateError);
            throw new Error(`Self Auth Update Failed: ${authUpdateError.message}`);
          }
        } else {
          // Editing another user's auth record requires service role key, skip but proceed with database updates
          console.warn(`[Server Action] Skipping Auth email/password update for user ID ${editUserId} due to missing SUPABASE_SERVICE_ROLE_KEY.`);
        }
      }
    }

    // Build update payload dynamically
    const updatePayload: any = {
      full_name: payload.full_name,
      email: payload.email,
      user_code: payload.user_code,
      profile_photo: payload.profile_photo,
      is_active: payload.is_active,
      department_id: payload.department_id,
      designation_id: payload.designation_id,
      manager_id: payload.manager_id,
      updated_at: new Date().toISOString()
    };

    // ONLY include role_id if it has actually changed, to prevent firing the broken DB trigger
    if (existingUser && existingUser.role_id !== payload.role_id) {
      updatePayload.role_id = payload.role_id;
    } else if (!existingUser && payload.role_id) {
      updatePayload.role_id = payload.role_id;
    }

    // B. Update in user_master (using target client based on environment capability)
    const { error: dbError } = await targetClient
      .from("user_master")
      .update(updatePayload)
      .eq("id", editUserId);

    if (dbError) {
      console.error("[Server Action] DB update error:", dbError);
      throw new Error(`Database Update Failed: ${dbError.message}`);
    }

    // C. Update asset assignments in the assets table
    await updateAssetAssignments(targetClient, editUserId, payload.assigned_assets || []);

  } else {
    // ── CREATE NEW USER ──
    const targetPassword = password || "DefaultWelcomePass123!";
    
    if (!isServiceRoleAvailable) {
      // Local/development fallback using standard signup when service role key is absent
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: payload.email,
        password: targetPassword,
        options: {
          data: {
            full_name: payload.full_name
          }
        }
      });

      if (signUpError) {
        console.error("[Server Action] Local SignUp error:", signUpError);
        throw new Error(`User Creation Failed: ${signUpError.message}`);
      }

      const newUserId = signUpData.user?.id;
      if (!newUserId) {
        throw new Error("User creation failed: No ID returned.");
      }

      // Update in user_master
      const { error: dbError } = await supabase
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
          updated_at: new Date().toISOString()
        });

      if (dbError) {
        console.error("[Server Action] DB create error:", dbError);
        throw new Error(`Database Profile Creation Failed: ${dbError.message}`);
      }

      await updateAssetAssignments(supabase, newUserId, payload.assigned_assets || []);
    } else {
      // Standard service role admin flow
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
  }

  // 4. Revalidate cache
  revalidatePath("/users");
  return { success: true };
}

async function updateAssetAssignments(dbClient: any, userId: string, newAssetTags: string[]) {
  // Get all currently assigned assets
  const { data: currentAssets } = await dbClient
    .from("assets")
    .select("id, code, asset_tag")
    .eq("assigned_user_id", userId)
    .eq("is_deleted", false);

  const currentAssetTags = (currentAssets || []).map((a: any) => a.asset_tag || a.code).filter(Boolean);

  // 1. Assets to unassign: in current but not in new
  const tagsToUnassign = currentAssetTags.filter((t: string) => !newAssetTags.includes(t));
  if (tagsToUnassign.length > 0) {
    const { data: assetsToUnassign } = await dbClient
      .from("assets")
      .select("id")
      .or(`asset_tag.in.(${tagsToUnassign.map((t: string) => `"${t}"`).join(",")}),code.in.(${tagsToUnassign.map((t: string) => `"${t}"`).join(",")})`);

    if (assetsToUnassign && assetsToUnassign.length > 0) {
      await dbClient
        .from("assets")
        .update({ assigned_user_id: null })
        .in("id", assetsToUnassign.map((a: any) => a.id));
    }
  }

  // 2. Assets to assign: in new but not in current
  const tagsToAssign = newAssetTags.filter((t: string) => !currentAssetTags.includes(t));
  if (tagsToAssign.length > 0) {
    const { data: assetsToAssign } = await dbClient
      .from("assets")
      .select("id")
      .or(`asset_tag.in.(${tagsToAssign.map((t: string) => `"${t}"`).join(",")}),code.in.(${tagsToAssign.map((t: string) => `"${t}"`).join(",")})`);

    if (assetsToAssign && assetsToAssign.length > 0) {
      await dbClient
        .from("assets")
        .update({ assigned_user_id: userId })
        .in("id", assetsToAssign.map((a: any) => a.id));
    }
  }
}

/**
 * Fetches all active assignees for ticket selection dropdowns
 * Bypasses SELECT RLS limits via service role if available
 */
export async function fetchAssignees() {
  const cookieStore = await cookies();
  const isServiceRoleAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminClient = getAdminClient();
  const supabase = isServiceRoleAvailable ? adminClient : createServerClient(cookieStore);

  const { data, error } = await supabase
    .from("user_master")
    .select("id, full_name, email, department_id, department:departments(name)")
    .eq("is_active", true)
    .eq("is_deleted", false)
    .order("full_name");

  if (error) {
    console.error("[Server Action] Error fetching assignees:", error);
    return [];
  }
  return data || [];
}

