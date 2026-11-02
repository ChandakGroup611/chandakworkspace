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
  let isCallerAdmin = await hasPermission(authUser.id, 'SUPER_ADMIN');

  if (!isCallerAdmin && editUserId !== authUser.id) {
    return { success: false, error: "Unauthorized: Only Super Administrators can manage other user records." };
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

    if (!isCallerAdmin) {
      // Regular users cannot modify their own administrative assignments
      delete updatePayload.role_id;
      delete updatePayload.is_active;
      delete updatePayload.department_id;
      delete updatePayload.designation_id;
      delete updatePayload.manager_id;
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
    if (!isCallerAdmin) {
      return { success: false, error: "Unauthorized: Only Super Administrators can create user records." };
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
      await assignUserModules(savedUserId, payload.module_codes, defaultMod);
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

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthenticated. Please log in first.");
  }

  const { getVisibleUsers, checkIsSuperAdmin } = await import('@/lib/repositories/users');
  const isSuperAdmin = await checkIsSuperAdmin(user.id);
  
  // Parallelize ALL network requests (Users list + metadata lists) to eliminate waterfall latency
  const [users, [deptRes, desigRes, roleRes, astRes, modRes]] = await Promise.all([
    getVisibleUsers(user.id, isSuperAdmin),
    Promise.all([
      supabase.from("departments").select("id, code, name").eq("is_deleted", false),
      supabase.from("designations").select("id, code, name, department_id").eq("is_deleted", false),
      supabase.from("roles").select("id, code, name").eq("is_deleted", false),
      supabase.from("assets").select("id, code, name, asset_tag, assigned_user_id").eq("is_deleted", false),
      supabase.from("modules_master").select("id, code, name, description, icon, display_order").eq("is_active", true).order("display_order", { ascending: true })
    ])
  ]);

  return {
    users,
    authUser: user,
    isSuperAdmin,
    departments: deptRes.data || [],
    designations: desigRes.data || [],
    roles: roleRes.data || [],
    assets: astRes.data || [],
    modules: modRes.data || []
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

  // Authorize the caller (Must be SUPER_ADMIN to delete a user)
  const { hasPermission } = await import('@/lib/permissions');
  const isCallerAdmin = await hasPermission(authUser.id, 'SUPER_ADMIN');

  if (!isCallerAdmin) {
    return { success: false, error: "Unauthorized: Only Super Administrators can delete user records." };
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

export interface InviteUserPayload {
  email: string;
  fullName?: string;
  roleId?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  moduleCodes?: string[];
  defaultModuleCode?: string;
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

  // 2. Authorize the caller (Must be SUPER_ADMIN to invite users)
  const { hasPermission } = await import('@/lib/permissions');
  const isCallerAdmin = await hasPermission(authUser.id, 'SUPER_ADMIN');

  if (!isCallerAdmin) {
    return { success: false, error: "Unauthorized: Only Super Administrators can invite users." };
  }

  const isServiceRoleAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isServiceRoleAvailable) {
    return { success: false, error: "Missing Service Role Key. Cannot send invites from this environment." };
  }

  const payload: InviteUserPayload = typeof emailOrPayload === "string" 
    ? { email: emailOrPayload, roleId: legacyRoleId }
    : emailOrPayload;

  const email = payload.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { success: false, error: "A valid email address is required." };
  }

  const fullName = payload.fullName?.trim() || "";
  const roleId = payload.roleId || null;
  const departmentId = payload.departmentId || null;
  const designationId = payload.designationId || null;
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

  const { error: dbError } = await adminClient
    .from("user_master")
    .upsert(updatePayload, { onConflict: "id" });

  if (dbError) {
    console.error("[Server Action] DB upsert error for invite:", dbError);
  }

  // 5. Update user_roles mapping
  if (roleId) {
    await adminClient.from("user_roles").delete().eq("user_id", targetUserId);
    await adminClient.from("user_roles").insert({ user_id: targetUserId, role_id: roleId });
  }

  // 6. Refresh permissions snapshot
  try {
    await adminClient.rpc("refresh_single_user_permissions_snapshot", { p_user_id: targetUserId });
  } catch (snapErr) {
    // Handled by DB triggers
  }

  // 7. Configure and assign operational modules
  try {
    const { assignUserModules } = await import("@/lib/actions/module-switcher");
    await assignUserModules(targetUserId, moduleCodes, defaultModuleCode);
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
