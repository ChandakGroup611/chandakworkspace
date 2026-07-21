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
  // Sanitize empty string UUIDs to null to avoid database type syntax errors
  if (payload) {
    payload.role_id = (payload.role_id && payload.role_id.trim()) ? payload.role_id : null;
    payload.department_id = (payload.department_id && payload.department_id.trim()) ? payload.department_id : null;
    payload.designation_id = (payload.designation_id && payload.designation_id.trim()) ? payload.designation_id : null;
    payload.manager_id = (payload.manager_id && payload.manager_id.trim()) ? payload.manager_id : null;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  // 1. Authenticate the caller
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return { success: false, error: "Unauthenticated request. Please log in." };
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

    if (roleData?.code?.toUpperCase() === "SUPER_ADMIN" || roleData?.code?.toUpperCase() === "ROLE_ADMIN") {
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
        if (roleCode?.toUpperCase() === "SUPER_ADMIN" || roleCode?.toUpperCase() === "ROLE_ADMIN") {
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
      return { success: false, error: "Unauthorized: You do not have permissions to manage user records." };
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
    const { data: existingUser } = await targetClient
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
          return { success: false, error: `Auth Update Failed: ${authUpdateError.message}` };
        }
      } else {
        // Fallback: If editing self, we can update via the authenticated client
        if (editUserId === authUser.id) {
          const { error: authUpdateError } = await supabase.auth.updateUser(authUpdates);
          if (authUpdateError) {
            console.error("[Server Action] Self Auth update error:", authUpdateError);
            return { success: false, error: `Self Auth Update Failed: ${authUpdateError.message}` };
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
      return { success: false, error: `Database Update Failed: ${dbError.message}` };
    }

    // Sync to user_roles to properly update backend RBAC permissions
    if (updatePayload.role_id) {
      await targetClient.from("user_roles").delete().eq("user_id", editUserId);
      await targetClient.from("user_roles").insert({ user_id: editUserId, role_id: updatePayload.role_id });
    }

    // C. Update asset assignments in the assets table
    await updateAssetAssignments(targetClient, editUserId, payload.assigned_assets || []);

  } else {
    // ── CREATE NEW USER ──
    const targetPassword = password || "DefaultWelcomePass123!";

    // RESURRECTION MECHANISM for trapped soft-deleted users
    // If a user was deleted before the backend fix, they might still exist in Auth but be soft-deleted in user_master.
    // Trying to recreate them throws "User already registered". 
    const { data: existingSoftDeleted } = await targetClient
      .from("user_master")
      .select("id, is_deleted")
      .eq("email", payload.email)
      .maybeSingle();

    if (existingSoftDeleted && existingSoftDeleted.is_deleted) {
      console.log(`[Server Action] Resurrecting soft-deleted user: ${existingSoftDeleted.id}`);
      
      // Update Auth Password if possible
      if (isServiceRoleAvailable) {
        await adminClient.auth.admin.updateUserById(existingSoftDeleted.id, { password: targetPassword });
      }

      // Reactivate in user_master
      const { error: resurrectDbError } = await targetClient
        .from("user_master")
        .update({
          full_name: payload.full_name,
          user_code: payload.user_code,
          profile_photo: payload.profile_photo,
          is_active: payload.is_active,
          is_deleted: false,
          role_id: payload.role_id || null,
          department_id: payload.department_id || null,
          designation_id: payload.designation_id || null,
          manager_id: payload.manager_id || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingSoftDeleted.id);

      if (resurrectDbError) {
        return { success: false, error: `Resurrection Failed: ${resurrectDbError.message}` };
      }

      if (payload.role_id) {
        await targetClient.from("user_roles").delete().eq("user_id", existingSoftDeleted.id);
        await targetClient.from("user_roles").insert({ user_id: existingSoftDeleted.id, role_id: payload.role_id });
      }

      await updateAssetAssignments(targetClient, existingSoftDeleted.id, payload.assigned_assets || []);
      
      revalidatePath("/users");
      return { success: true };
    }
    
    if (!isServiceRoleAvailable) {
      // Local/development fallback using standard signup when service role key is absent
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: payload.email,
        password: targetPassword,
        options: {
          data: {
            full_name: payload.full_name,
            user_code: payload.user_code
          }
        }
      });

      if (signUpError) {
        console.error("[Server Action] Local SignUp error:", signUpError);
        return { success: false, error: `User Creation Failed: ${signUpError.message}` };
      }

      const newUserId = signUpData.user?.id;
      if (!newUserId) {
        return { success: false, error: "User creation failed: No ID returned." };
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
        return { success: false, error: `Database Profile Creation Failed: ${dbError.message}` };
      }

      if (payload.role_id) {
        await supabase.from("user_roles").insert({ user_id: newUserId, role_id: payload.role_id });
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
          full_name: payload.full_name,
          user_code: payload.user_code
        }
      });

      if (authCreateError) {
        console.error("[Server Action] Auth create error:", authCreateError);
        return { success: false, error: `Auth Creation Failed: ${authCreateError.message}` };
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
        return { success: false, error: `Database Profile Creation Failed: ${dbError.message}` };
      }

      if (payload.role_id) {
        await adminClient.from("user_roles").insert({ user_id: newUserId, role_id: payload.role_id });
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
import { unstable_noStore as noStore } from 'next/cache';

export async function fetchAssignees() {
  noStore();
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

/**
 * Fetches all data required for the Users Dashboard
 * Uses optimized repositories and explicit queries
 */
export async function fetchUsersDashboardData() {
  noStore();
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthenticated. Please log in first.");
  }

  const { getVisibleUsers } = await import('@/lib/repositories/users');
  
  // Parallelize ALL network requests (Users list + 4 metadata lists) to eliminate waterfall latency
  const [users, [deptRes, desigRes, roleRes, astRes]] = await Promise.all([
    getVisibleUsers(user.id),
    Promise.all([
      supabase.from("departments").select("id, code, name").eq("is_deleted", false),
      supabase.from("designations").select("id, code, name, department_id").eq("is_deleted", false),
      supabase.from("roles").select("id, code, name").eq("is_deleted", false),
      supabase.from("assets").select("id, code, name, asset_tag, assigned_user_id").eq("is_deleted", false)
    ])
  ]);

  return {
    users,
    authUser: user,
    departments: deptRes.data || [],
    designations: desigRes.data || [],
    roles: roleRes.data || [],
    assets: astRes.data || []
  };
}

/**
 * Soft deletes a user in user_master and scrambles their email in Auth to free it up.
 * We cannot hard delete from auth.users due to foreign key constraints from other tables.
 */
export async function deleteUserAction(userId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  // Authenticate caller
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return { success: false, error: "Unauthenticated request." };
  }

  // Authorize the caller (Must be SUPER_ADMIN or have USERS_DELETE permission)
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

    if (roleData?.code?.toUpperCase() === "SUPER_ADMIN" || roleData?.code?.toUpperCase() === "ROLE_ADMIN") {
      isCallerAdmin = true;
    }
  }

  if (!isCallerAdmin) {
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role:roles(code)")
      .eq("user_id", authUser.id);

    if (userRoles && userRoles.length > 0) {
      for (const ur of userRoles) {
        const role = ur.role as any;
        const roleCode = Array.isArray(role) ? role[0]?.code : role?.code;
        if (roleCode?.toUpperCase() === "SUPER_ADMIN" || roleCode?.toUpperCase() === "ROLE_ADMIN") {
          isCallerAdmin = true;
          break;
        }
      }
    }
  }

  if (!isCallerAdmin) {
    // Check permissions in snapshot
    const { data: userPerms } = await supabase
      .from("user_permissions_snapshot")
      .select("permission_code")
      .eq("user_id", authUser.id);
      
    const perms = userPerms ? userPerms.map((r: any) => r.permission_code) : [];
    const canManage = perms.includes("USERS_DELETE") || perms.includes("USERS_MANAGE");

    if (!canManage) {
      return { success: false, error: "Unauthorized: You do not have permissions to delete user records." };
    }
  }

  const isServiceRoleAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isServiceRoleAvailable) {
    return { success: false, error: "CRITICAL: Cannot modify user in authentication backend. SUPABASE_SERVICE_ROLE_KEY is missing in your environment variables. Please add it to your deployment." };
  }

  // Check for any activities associated with the user
  const [taskRes, partRes, eventRes] = await Promise.all([
    supabase.from("tasks").select("*", { count: "exact", head: true }).or(`assigned_to.eq.${userId},created_by.eq.${userId}`),
    supabase.from("task_participants").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("activity_events").select("*", { count: "exact", head: true }).eq("performed_by", userId)
  ]);

  if (taskRes.error) return { success: false, error: `Error checking tasks: ${taskRes.error.message}` };
  if (partRes.error) return { success: false, error: `Error checking participation: ${partRes.error.message}` };
  if (eventRes.error) return { success: false, error: `Error checking activity events: ${eventRes.error.message}` };

  if ((taskRes.count && taskRes.count > 0) || (partRes.count && partRes.count > 0) || (eventRes.count && eventRes.count > 0)) {
    return { success: false, error: "Cannot delete user because they have associated activities in the system. Please deactivate the user instead." };
  }

  const adminClient = getAdminClient();
  
  // Scramble email to free it up for future registrations
  const scrambledEmail = `deleted_${Date.now()}_${userId.substring(0, 8)}@adios.local`;
  
  const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
    email: scrambledEmail,
    password: `Deleted!${Math.random()}`,
    user_metadata: { deleted: true },
    email_confirm: true
  });
  
  if (authUpdateError && !authUpdateError.message.includes("User not found") && !authUpdateError.message.includes("Database error loading user") && !authUpdateError.message.includes("invalid input syntax")) {
    console.error("[Server Action] Auth update error:", authUpdateError);
    return { success: false, error: `Failed to remove user from authentication system: ${authUpdateError.message}. Database deletion aborted to prevent clash.` };
  }

  // Soft delete in user_master and update the email to match the scrambled one
  const { error: dbError } = await supabase
    .from("user_master")
    .update({ 
      is_deleted: true, 
      is_active: false,
      email: scrambledEmail
    })
    .eq("id", userId);

  if (dbError) {
    return { success: false, error: `Database update failed: ${dbError.message}` };
  }

  revalidatePath("/users");
  return { success: true };
}
