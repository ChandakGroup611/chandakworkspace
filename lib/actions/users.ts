"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";

// Admin client that uses service role key to bypass RLS and perform Auth updates
const getAdminClient = () => {
  return supabaseAdmin;
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
  const { hasPermission } = await import('@/lib/permissions');
  // User master rules (as defined in IAM): create = USERS_CREATE, edit = USERS_UPDATE, USERS_MANAGE = both.
  const isCallerSuper = await hasPermission(authUser.id, 'SUPER_ADMIN');
  let isCallerAdmin = isCallerSuper ||
                      await hasPermission(authUser.id, 'USERS_MANAGE') ||
                      (editUserId ? await hasPermission(authUser.id, 'USERS_UPDATE') : await hasPermission(authUser.id, 'USERS_CREATE'));

  // Only a Super Admin may hand out a Super Admin role (otherwise USERS_UPDATE could be used to promote oneself).
  if (!isCallerSuper && payload?.role_id) {
    const { data: targetRole } = await getAdminClient().from("roles").select("code").eq("id", payload.role_id).maybeSingle();
    const code = String(targetRole?.code || payload.role_id).toUpperCase();
    if (["SUPER_ADMIN", "ROLE_ADMIN", "ADMIN", "SUPERADMIN", "ROLE_SUPER_ADMIN", "SUPER_ADMINISTRATOR", "ADMIN-ROLE-ID"].includes(code)) {
      const { data: current } = editUserId ? await getAdminClient().from("user_master").select("role_id").eq("id", editUserId).maybeSingle() : { data: null };
      if (!current || current.role_id !== payload.role_id) {
        return { success: false, error: "Unauthorized: only a Super Admin can assign the Super Admin role." };
      }
    }
  }

  // Self-deactivation guard: users cannot deactivate their own account
  if (editUserId === authUser.id && payload?.is_active === false) {
    return { success: false, error: "Unauthorized: users cannot deactivate their own account." };
  }

  // Self-role-change guard: non-super users cannot change their own role
  if (!isCallerSuper && editUserId === authUser.id && payload?.role_id) {
    const { data: currentSelf } = await getAdminClient().from("user_master").select("role_id").eq("id", authUser.id).maybeSingle();
    if (currentSelf && currentSelf.role_id !== payload.role_id) {
      return { success: false, error: "Unauthorized: users cannot modify their own assigned role." };
    }
  }

  if (!isCallerAdmin && editUserId !== authUser.id) {
    return { success: false, error: "Unauthorized: You do not have permissions to manage other user records." };
  }

  const isServiceRoleAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminClient = getAdminClient();
  const targetClient = isServiceRoleAvailable ? adminClient : supabase;

  // 3. Perform the Mutation
  let savedUserId: string | null = editUserId;
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

    if (isCallerAdmin) {
      if (payload.email && payload.email !== existingUser?.email) {
        authUpdates.email = payload.email;
      }
      if (password && password.trim()) {
        authUpdates.password = password.trim();
      }
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
    let updatePayload: any;
    if (!isCallerAdmin) {
      // Standard users are strictly restricted to updating only their profile picture
      updatePayload = {
        profile_photo: payload.profile_photo,
        updated_at: new Date().toISOString()
      };
    } else {
      updatePayload = {
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

      if (editUserId === authUser.id && !isCallerSuper) {
        // Admin editing own account cannot change own role or active status
        delete updatePayload.role_id;
        delete updatePayload.is_active;
      }
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

    // Automatically remove disabled user from all workspaces, sub-workspaces, tasks, and subtasks
    if (updatePayload.is_active === false) {
      const { cleanupDisabledUserAssignments } = await import("@/lib/actions/tasks");
      await cleanupDisabledUserAssignments(editUserId);
      revalidatePath("/workspaces");
      revalidatePath("/tasks");
    }

    // Sync to user_roles to properly update backend RBAC permissions
    if (updatePayload.role_id) {
      await targetClient.from("user_roles").delete().eq("user_id", editUserId);
      await targetClient.from("user_roles").insert({ user_id: editUserId, role_id: updatePayload.role_id });
    }

    // C. Update asset assignments in the assets table (admins only)
    if (isCallerAdmin) {
      await updateAssetAssignments(targetClient, editUserId, payload.assigned_assets || []);
    }

  } else {
    // ── CREATE NEW USER ──
    if (!isCallerAdmin) {
      return { success: false, error: "Unauthorized: you need the 'create users' permission to add user records." };
    }
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
      savedUserId = newUserId;

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
      savedUserId = newUserId;

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

  // 4. Assign workspace modules if provided in payload
  if (savedUserId && payload.module_codes && Array.isArray(payload.module_codes)) {
    try {
      const { assignUserModules } = await import("@/lib/actions/module-switcher");
      const defaultMod = payload.default_module_code || payload.module_codes[0] || "TASK_WORKFLOW";
      await assignUserModules(savedUserId, payload.module_codes, defaultMod, payload.dashboard_keys || payload.dashboardKeys);
    } catch (modErr) {
      console.error("[saveUserAction] Error saving module assignments:", modErr);
    }
  }

  // 5. Revalidate cache
  revalidatePath("/users");
  if (savedUserId) {
    revalidatePath(`/users/${savedUserId}`);
  }
  return { success: true, userId: savedUserId };
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

  let user: any = null;
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authUser) {
    user = authUser;
  } else {
    const { data: sessionData } = await supabase.auth.getSession();
    user = sessionData?.session?.user || null;
  }

  if (!user) {
    throw new Error("Unauthenticated. Please log in first.");
  }

  const { getVisibleUsers, checkIsSuperAdmin } = await import('@/lib/repositories/users');
  const isSuperAdmin = await checkIsSuperAdmin(user.id);
  // The signed-in person's User master rights (the same rules the save/delete/invite actions enforce)
  const { hasPermission } = await import('@/lib/permissions');
  const canManageUsers = isSuperAdmin || await hasPermission(user.id, 'USERS_MANAGE');
  const userRights = {
    canView: isSuperAdmin || canManageUsers || await hasPermission(user.id, 'USERS_VIEW') || await hasPermission(user.id, 'USERS_CREATE') || await hasPermission(user.id, 'USERS_UPDATE') || await hasPermission(user.id, 'USERS_DELETE'),
    canCreate: canManageUsers || await hasPermission(user.id, 'USERS_CREATE'),
    canUpdate: canManageUsers || await hasPermission(user.id, 'USERS_UPDATE'),
    canDelete: canManageUsers || await hasPermission(user.id, 'USERS_DELETE'),
  };
  
  // Parallelize ALL network requests (Users list + metadata lists) to eliminate waterfall latency
  const [users, [deptRes, desigRes, roleRes, astRes, modRes, modRolesRes, dProjRes, dTowerRes]] = await Promise.all([
    getVisibleUsers(user.id, isSuperAdmin),
    Promise.all([
      supabaseAdmin.from("departments").select("id, code, name").eq("is_deleted", false),
      supabaseAdmin.from("designations").select("id, code, name, department_id").eq("is_deleted", false),
      supabaseAdmin.from("roles").select("id, code, name").eq("is_deleted", false),
      supabaseAdmin.from("assets").select("id, code, name, asset_tag, assigned_user_id").eq("is_deleted", false),
      supabaseAdmin.from("modules_master").select("id, code, name, description, icon, display_order").eq("is_active", true).order("display_order", { ascending: true }),
      supabaseAdmin.from("module_roles").select("module_code, role_code, name, description, permissions").order("role_code", { ascending: true }),
      supabaseAdmin.from("design_projects").select("id, code, name").order("name", { ascending: true }),
      supabaseAdmin.from("design_towers").select("id, project_id, tower_name").order("tower_name", { ascending: true })
    ])
  ]);

  return {
    users: users || [],
    authUser: user,
    isSuperAdmin,
    userRights,
    departments: deptRes.data || [],
    designations: desigRes.data || [],
    roles: roleRes.data || [],
    assets: astRes.data || [],
    modules: modRes.data || [],
    moduleRoles: modRolesRes.data || [],
    designProjects: dProjRes.data || [],
    designTowers: dTowerRes.data || []
  };
}

/**
 * Fetches module assignments for a specific user.
 */
export async function fetchUserModulesAction(targetUserId: string) {
  noStore();
  const { data, error } = await supabaseAdmin
    .from("user_modules")
    .select("module_id, is_default, module:modules_master(id, code, name, icon)")
    .eq("user_id", targetUserId);

  if (error) {
    console.error("[fetchUserModulesAction] Error:", error);
    return [];
  }
  return data || [];
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

  // Authorize the caller (SUPER_ADMIN, USERS_DELETE or USERS_MANAGE — the rule defined in IAM)
  const { hasPermission } = await import('@/lib/permissions');
  const isCallerSuper = await hasPermission(authUser.id, 'SUPER_ADMIN');
  const isCallerAdmin = isCallerSuper ||
                        await hasPermission(authUser.id, 'USERS_DELETE') ||
                        await hasPermission(authUser.id, 'USERS_MANAGE');

  if (!isCallerAdmin) {
    return { success: false, error: "Unauthorized: you need the 'delete users' permission to remove user records." };
  }
  if (userId === authUser.id) {
    return { success: false, error: "You cannot remove your own user record." };
  }

  // Non-super users cannot delete a Super Admin
  if (!isCallerSuper) {
    const isTargetSuper = await hasPermission(userId, 'SUPER_ADMIN');
    if (isTargetSuper) {
      return { success: false, error: "Unauthorized: only a Super Admin can delete a Super Admin account." };
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

  const { cleanupDisabledUserAssignments } = await import("@/lib/actions/tasks");
  await cleanupDisabledUserAssignments(userId);

  revalidatePath("/users");
  revalidatePath("/workspaces");
  revalidatePath("/tasks");
  return { success: true };
}

export interface InviteUserPayload {
  email: string;
  fullName?: string;
  userCode?: string;
  roleId?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  managerId?: string | null;
  moduleCodes?: string[];
  defaultModuleCode?: string;
  dashboardKeys?: string[];
  moduleAccess?: Array<{ module_code: string; role_code: string; scope?: any }>;
  dashboardAccess?: Array<{ dashboard_key: string; role_code: string; company_ids?: number[] }>;
  redirectTo?: string;
}

export async function inviteUserAction(
  emailOrPayload: string | InviteUserPayload,
  legacyRoleId?: string | null
) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  // 1. Authenticate the caller
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return { success: false, error: "Unauthenticated request. Please log in." };
  }

  // 2. Authorize the caller (Must be SUPER_ADMIN or have USERS_CREATE/USERS_MANAGE to invite users)
  const { hasPermission } = await import('@/lib/permissions');
  const isCallerSuper = await hasPermission(authUser.id, 'SUPER_ADMIN');
  const isCallerAdmin = isCallerSuper ||
                        await hasPermission(authUser.id, 'USERS_MANAGE') ||
                        await hasPermission(authUser.id, 'USERS_CREATE');

  if (!isCallerAdmin) {
    return { success: false, error: "Unauthorized: You do not have permission to invite users." };
  }

  const isServiceRoleAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isServiceRoleAvailable) {
    return { success: false, error: "Missing Service Role Key. Cannot send invites from this environment." };
  }

  const payload: InviteUserPayload = typeof emailOrPayload === "string" 
    ? { email: emailOrPayload, roleId: legacyRoleId }
    : emailOrPayload;

  const roleId = payload.roleId || null;

  // Only a Super Admin may hand out a Super Admin role
  if (!isCallerSuper && roleId) {
    const { data: targetRole } = await getAdminClient().from("roles").select("code").eq("id", roleId).maybeSingle();
    const code = String(targetRole?.code || roleId).toUpperCase();
    if (["SUPER_ADMIN", "ROLE_ADMIN", "ADMIN", "SUPERADMIN", "ROLE_SUPER_ADMIN", "SUPER_ADMINISTRATOR", "ADMIN-ROLE-ID"].includes(code)) {
      return { success: false, error: "Unauthorized: only a Super Admin can assign the Super Admin role." };
    }
  }

  const email = payload.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { success: false, error: "A valid email address is required." };
  }

  const fullName = payload.fullName?.trim() || "";
  const departmentId = payload.departmentId || null;
  const designationId = payload.designationId || null;
  const managerId = payload.managerId || null;
  const moduleCodes = payload.moduleCodes && payload.moduleCodes.length > 0 
    ? payload.moduleCodes 
    : ["TASK_WORKFLOW", "VEHICLE_DESK", "DESIGN_TRACKING"];
  const defaultModuleCode = payload.defaultModuleCode || moduleCodes[0] || "TASK_WORKFLOW";

  const adminClient = getAdminClient();

  // 3. Send the invite via Supabase Auth Admin
  const inviteOptions: any = {
    data: {
      full_name: fullName || email.split("@")[0],
      invited_by: authUser.id
    }
  };

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://chandakgroup.tech').replace(/\/+$/, '');
  if (payload.redirectTo) {
    inviteOptions.redirectTo = payload.redirectTo;
  } else {
    inviteOptions.redirectTo = siteUrl ? `${siteUrl}/auth/callback?next=/select-module` : 'https://chandakgroup.tech/auth/callback?next=/select-module';
  }

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, inviteOptions);

  let targetUserId: string | null = inviteData?.user?.id || null;

  if (inviteError) {
    // If the user already exists in auth.users, fetch their ID and update roles/modules
    const isAlreadyRegistered = inviteError.message.toLowerCase().includes("already") || 
      inviteError.message.toLowerCase().includes("registered") ||
      inviteError.message.toLowerCase().includes("exists");

    if (isAlreadyRegistered) {
      // Find existing user in user_master
      const { data: existingUser } = await adminClient
        .from("user_master")
        .select("id, is_deleted")
        .eq("email", email)
        .maybeSingle();

      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        // Find in auth.users
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const found = listData?.users?.find(u => u.email?.toLowerCase() === email);
        if (found) {
          targetUserId = found.id;
        }
      }

      if (!targetUserId) {
        return { success: false, error: `Invite failed: ${inviteError.message}` };
      }
    } else {
      console.error("[Server Action] Invite error:", inviteError);
      return { success: false, error: `Invite failed: ${inviteError.message}` };
    }
  }

  if (!targetUserId) {
    return { success: false, error: "Failed to resolve invited user ID." };
  }

  // 4. Update / Upsert user profile in user_master
  const userCode = `USR-${targetUserId.substring(0, 8).toUpperCase()}`;
  const updatePayload: any = {
    id: targetUserId,
    email: email,
    full_name: fullName || email.split("@")[0],
    user_code: userCode,
    is_active: true,
    is_deleted: false,
    updated_at: new Date().toISOString()
  };

  if (roleId) updatePayload.role_id = roleId;
  if (departmentId) updatePayload.department_id = departmentId;
  if (designationId) updatePayload.designation_id = designationId;
  if (managerId) updatePayload.manager_id = managerId;

  const { error: dbError } = await adminClient
    .from("user_master")
    .upsert(updatePayload, { onConflict: "id" });

  if (dbError) {
    console.error("[Server Action] DB upsert error for invite:", dbError);
    return { success: false, error: `Database error creating user profile: ${dbError.message}` };
  }

  // 5. Update user_roles mapping
  if (roleId) {
    await adminClient.from("user_roles").delete().eq("user_id", targetUserId);
    const { error: roleErr } = await adminClient.from("user_roles").insert({ user_id: targetUserId, role_id: roleId });
    if (roleErr) {
      console.error("[Server Action] Failed to assign role on invite:", roleErr);
      return { success: false, error: `Failed to assign user role: ${roleErr.message}` };
    }
  }

  // 6. Refresh permissions snapshot
  try {
    await adminClient.rpc("refresh_single_user_permissions_snapshot", { p_user_id: targetUserId });
  } catch (snapErr) {
    // Handled by DB triggers
  }

  // 7. Configure and assign operational module RBAC
  try {
    let moduleAccessToSave = payload.moduleAccess || [];
    if (moduleAccessToSave.length === 0 && moduleCodes.length > 0) {
      // Generate standard fallback roles for selected module codes
      moduleAccessToSave = moduleCodes.map(code => {
        let roleCode = "MEMBER";
        if (code === "VEHICLE_DESK") roleCode = "REQUESTER";
        else if (code === "DESIGN_TRACKING") roleCode = "VIEWER";
        else if (code === "CHANDAK_MEET") roleCode = "STANDARD";
        else if (code === "ORG_BUDGET") roleCode = "VIEWER";
        else if (code === "TASK_WORKFLOW") roleCode = "MEMBER";
        return { module_code: code, role_code: roleCode, scope: { type: "all" } };
      });
    }

    let dashboardAccessToSave = payload.dashboardAccess || [];
    if (dashboardAccessToSave.length === 0 && payload.dashboardKeys && payload.dashboardKeys.length > 0) {
      dashboardAccessToSave = payload.dashboardKeys.map(k => ({
        dashboard_key: k,
        role_code: "VIEWER",
        company_ids: []
      }));
    }

    await saveUserModuleAccessAction(
      targetUserId,
      moduleAccessToSave,
      dashboardAccessToSave,
      defaultModuleCode
    );
  } catch (modErr) {
    console.error("[Server Action] Error assigning modules during invite:", modErr);
  }

  // 8. Log audit entry
  try {
    await adminClient.from("user_master_audit_logs").insert({
      user_id: targetUserId,
      operation: "INVITE",
      performed_by: authUser.id,
      payload: {
        email,
        full_name: fullName,
        role_id: roleId,
        department_id: departmentId,
        designation_id: designationId,
        manager_id: managerId,
        module_codes: moduleCodes,
        default_module: defaultModuleCode
      }
    });
  } catch (auditErr) {
    // Non-blocking
  }

  revalidatePath("/users");
  return { 
    success: true, 
    message: `Invitation successfully sent to ${email} with assigned role and module access.` 
  };
}

/**
 * Fetches dashboard assignments (keys) for a specific user.
 */
export async function fetchUserDashboardsAction(targetUserId: string): Promise<string[]> {
  noStore();
  const { fetchUserDashboardKeys } = await import("@/lib/actions/module-switcher");
  return fetchUserDashboardKeys(targetUserId);
}

/**
 * Fetches granular module-wise roles and scopes for a specific user from user_module_access.
 */
export async function fetchUserModuleAccessAction(targetUserId: string) {
  noStore();
  const { data, error } = await getAdminClient()
    .from("user_module_access")
    .select("module_code, role_code, dashboard_key, scope, is_default")
    .eq("user_id", targetUserId);

  if (error) {
    console.error("[fetchUserModuleAccessAction] Error:", error);
    return [];
  }
  return data || [];
}

/**
 * Saves granular module-wise roles and scopes for a user atomically.
 */
export async function saveUserModuleAccessAction(
  targetUserId: string,
  moduleAccess: Array<{ module_code: string; role_code: string; scope?: any; is_default?: boolean }>,
  dashboardAccess?: Array<{ dashboard_key: string; role_code: string; company_ids?: number[] }>,
  defaultModuleCode?: string
) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return { success: false, error: "Unauthenticated request." };
  }

  const { hasPermission } = await import('@/lib/permissions');
  const isCallerSuper = await hasPermission(authUser.id, 'SUPER_ADMIN');
  const canUpdate = isCallerSuper || 
                    await hasPermission(authUser.id, 'USERS_MANAGE') || 
                    await hasPermission(authUser.id, 'USERS_UPDATE') ||
                    await hasPermission(authUser.id, 'USERS_CREATE');

  if (!canUpdate) {
    return { success: false, error: "Unauthorized: Missing USERS_UPDATE permission." };
  }

  const adminClient = getAdminClient();

  // 1. Delete existing user_module_access for target user
  await adminClient
    .from("user_module_access")
    .delete()
    .eq("user_id", targetUserId);

  // 2. Prepare new rows
  const rowsToInsert: any[] = [];
  const activeCodes: string[] = [];

  for (const item of moduleAccess) {
    activeCodes.push(item.module_code);
    rowsToInsert.push({
      user_id: targetUserId,
      module_code: item.module_code,
      role_code: item.role_code,
      scope: item.scope || { type: "all" },
      is_default: item.module_code === defaultModuleCode,
      granted_by: authUser.id,
      granted_at: new Date().toISOString()
    });
  }

  if (dashboardAccess && dashboardAccess.length > 0) {
    activeCodes.push("DASHBOARDS");
    for (const d of dashboardAccess) {
      rowsToInsert.push({
        user_id: targetUserId,
        module_code: "DASHBOARDS",
        role_code: d.role_code || "VIEWER",
        dashboard_key: d.dashboard_key,
        scope: d.company_ids && d.company_ids.length > 0 
          ? { type: "companies", company_ids: d.company_ids } 
          : { type: "all" },
        is_default: defaultModuleCode === "DASHBOARDS",
        granted_by: authUser.id,
        granted_at: new Date().toISOString()
      });
    }
  }

  if (rowsToInsert.length > 0) {
    const { error: insertErr } = await adminClient
      .from("user_module_access")
      .insert(rowsToInsert);
    if (insertErr) {
      console.error("[saveUserModuleAccessAction] Insert error:", insertErr);
      return { success: false, error: `Failed to save module access: ${insertErr.message}` };
    }
  }

  // 3. Synchronize legacy tables (user_modules, dashboard_user_access, design_user_access)
  try {
    const { assignUserModules } = await import("@/lib/actions/module-switcher");
    const dashKeys = dashboardAccess ? dashboardAccess.map(d => d.dashboard_key) : [];
    await assignUserModules(targetUserId, Array.from(new Set(activeCodes)), defaultModuleCode || "TASK_WORKFLOW", dashKeys);

    const designMod = moduleAccess.find((m) => m.module_code === "DESIGN_TRACKING");
    if (designMod) {
      const sc = designMod.scope || { type: "all" };
      const projectIds: string[] = sc.type === "projects" && Array.isArray(sc.project_ids) ? sc.project_ids.map(String) : [];
      const subProjectIds: string[] = sc.type === "projects" && Array.isArray(sc.sub_project_ids) ? sc.sub_project_ids.map(String) : [];
      const rc = String(designMod.role_code || "VIEWER").toUpperCase();
      const mappedRole =
        rc === "DESIGN_ADMIN" || rc === "ADMIN"
          ? "DESIGN_ADMIN"
          : rc === "DESIGN_LEAD"
          ? "DESIGN_LEAD"
          : rc === "CONTRIBUTOR" || rc === "STANDARD"
          ? "CONSULTANT_CONTRIBUTOR"
          : "VIEWER";
      const isLeadOrAdmin = mappedRole === "DESIGN_ADMIN" || mappedRole === "DESIGN_LEAD";
      const isContrib = mappedRole === "CONSULTANT_CONTRIBUTOR" || isLeadOrAdmin;

      await adminClient.from("design_user_access").upsert(
        {
          user_id: targetUserId,
          design_role: mappedRole,
          project_access_type: projectIds.length > 0 ? "SPECIFIC" : "ALL",
          assigned_project_ids: projectIds,
          assigned_sub_project_ids: subProjectIds,
          can_matrix_edit: isContrib,
          can_drawings_upload: isContrib,
          can_drawings_approve_gfc: isLeadOrAdmin,
          can_transmittals_create: isContrib,
          can_rfis_manage: isContrib,
          can_masters_manage: mappedRole === "DESIGN_ADMIN",
          updated_by: authUser.email || authUser.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } else {
      await adminClient.from("design_user_access").delete().eq("user_id", targetUserId);
    }
  } catch (syncErr) {
    console.warn("[saveUserModuleAccessAction] Legacy sync warning:", syncErr);
  }

  // 4. Invalidate permission cache
  try {
    const { invalidateModuleAccessCache } = await import("@/lib/permissions/module-access");
    invalidateModuleAccessCache(targetUserId);
  } catch (e) {}

  revalidatePath("/users");
  return { success: true };
}

