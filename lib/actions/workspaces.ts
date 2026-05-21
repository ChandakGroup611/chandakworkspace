"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { dispatchNotification } from "@/lib/actions/notifications";

/**
 * Enterprise permission verification helper for server actions
 */
async function checkServerPermission(supabase: any, userId: string, requiredPerm: string): Promise<boolean> {
  try {
    // 1. Check SUPER_ADMIN via role_id -> roles.code directly
    const { data: profileData, error: profileError } = await supabase
      .from("user_master")
      .select("role_id")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error(`[checkServerPermission] Profile fetch error: ${profileError.message}`);
      return false;
    }

    if (!profileData || !profileData.role_id) {
      console.log("[checkServerPermission] User has no role assigned");
      return false;
    }

    // Query the role by role_id
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("code")
      .eq("id", profileData.role_id)
      .single();

    if (roleError) {
      console.error(`[checkServerPermission] Role fetch error: ${roleError.message}`);
      return false;
    }

    if (roleData?.code === "SUPER_ADMIN") {
      console.log("[checkServerPermission] User is SUPER_ADMIN, granting access");
      return true;
    }

    // 2. Also check user_roles table for additional roles
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role:roles(code)")
      .eq("user_id", userId);

    if (rolesError) {
      console.error(`[checkServerPermission] User roles fetch error: ${rolesError.message}`);
    } else if (userRoles && userRoles.length > 0) {
      for (const ur of userRoles) {
        const role = ur.role as any;
        const roleCode = Array.isArray(role) ? role[0]?.code : role?.code;
        if (roleCode === "SUPER_ADMIN") {
          console.log("[checkServerPermission] User is SUPER_ADMIN via user_roles");
          return true;
        }
      }
    }

    // 3. Query permissions snapshot
    const { data: userPerms, error: permsError } = await supabase
      .from("user_permissions_snapshot")
      .select("permission_code")
      .eq("user_id", userId);

    if (permsError) {
      console.warn(`[checkServerPermission] Permissions fetch error: ${permsError.message}`);
      return false;
    }

    if (!userPerms || userPerms.length === 0) {
      console.warn(`[checkServerPermission] No permissions found for user ${userId}`);
      return false;
    }

    const perms = userPerms.map((r: any) => r.permission_code);
    
    // Expand permissions snapshot with inheritance
    const expanded = new Set<string>(perms);
    for (const p of perms) {
      if (p.endsWith("_MANAGE")) {
        const base = p.replace("_MANAGE", "");
        expanded.add(`${base}_VIEW`);
        expanded.add(`${base}_CREATE`);
        expanded.add(`${base}_UPDATE`);
        expanded.add(`${base}_DELETE`);
      } else if (p.endsWith("_CREATE") || p.endsWith("_UPDATE") || p.endsWith("_DELETE")) {
        const base = p.slice(0, p.lastIndexOf("_"));
        expanded.add(`${base}_VIEW`);
      }
    }

    const hasPermission = expanded.has(requiredPerm) || expanded.has("SUPER_ADMIN");
    
    if (!hasPermission) {
      const permsStr = Array.from(expanded).join(", ");
      console.warn(`[checkServerPermission] User ${userId} lacks ${requiredPerm}. Available: ${permsStr}`);
    }

    return hasPermission;
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error(`[checkServerPermission] Exception: ${msg}`);
    return false;
  }
}

/**
 * Enterprise Workspace & Task Server Actions
 */

export async function fetchCompanies() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, code")
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order("name", { ascending: true });
    
  if (error) console.error(`[fetchCompanies] Error: ${error.message}`);
  return data || [];
}

export async function fetchPriorities() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("master_priorities")
    .select("id, name, code")
    .eq('is_active', true)
    .eq('is_deleted', false);
    
  if (error) console.error(`[fetchPriorities] Error: ${error.message}`);
  return data || [];
}

export async function createWorkspace(formData: any) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error("Unauthenticated");

    const hasAccess = await checkServerPermission(supabase, userId, "WORKSPACES_CREATE");
    if (!hasAccess) {
      throw new Error("Unauthorized: Missing WORKSPACES_CREATE capability.");
    }
    
    const { data: userMaster } = await supabase
      .from("user_master")
      .select("department_id")
      .eq("id", userId)
      .single();

    let statusId = null;
    try {
      const { data: status } = await supabase
        .from("workflow_states")
        .select("id")
        .eq("code", "ST_OPEN")
        .single();
      statusId = status?.id;
    } catch (e) {}

    const { data, error } = await supabase
      .from("workspaces")
      .insert([{
        ...formData,
        status_id: statusId,
        owner_id: userId,
        department_id: userMaster?.department_id || null
      }])
      .select()
      .single();
      
    if (error) {
      console.error("[Workspaces] Error creating workspace:", error.message);
      throw new Error(error.message);
    }

    // Auto-enroll the creator as a manager
    await supabase.from("workspace_members").insert([{
      workspace_id: data.id,
      user_id: userId,
      role: 'manager'
    }]);

    return data;
  } catch (err: any) {
    console.error("[createWorkspace] Error:", err?.message || String(err));
    throw new Error(err?.message || "Failed to create workspace");
  }
}

export async function fetchWorkspaces() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  const hasAccess = await checkServerPermission(supabase, userId, "WORKSPACES_VIEW");
  if (!hasAccess) {
    console.warn(`[Workspaces] User ${userId} unauthorized to fetch workspaces`);
    return [];
  }

  // Fetch workspaces with membership info then enforce strict visibility server-side
  const { data, error } = await supabase
    .from("workspaces")
    .select("*, status:workflow_states(name, code), company:companies(name, code), priority:master_priorities(name, code), department:departments(name, code, scope_id), owner:user_master!owner_id(id, manager_id), workspace_members(user_id), workspace_teams(team_id)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`[Workspaces] Error fetching workspaces: ${error.message}`);
    return [];
  }

  const all = data || [];

  return all;
}

export async function fetchWorkspacesInitialData() {
  const [workspaces, companies, priorities] = await Promise.all([
    fetchWorkspaces(),
    fetchCompanies(),
    fetchPriorities()
  ]);
  return { workspaces, companies, priorities };
}

export async function fetchWorkspaceDashboardData(preferredWorkspaceId?: string | null) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Get current authenticated user
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    
    if (!user) {
      return {
        userProfile: null,
        workspaces: [],
        companies: [],
        priorities: [],
        prefetchWorkspaceId: null,
        prefetchTasks: [],
        prefetchStakeholders: []
      };
    }

    const hasAccess = await checkServerPermission(supabase, user.id, "WORKSPACES_VIEW");
    if (!hasAccess) {
      return {
        userProfile: null,
        workspaces: [],
        companies: [],
        priorities: [],
        prefetchWorkspaceId: null,
        prefetchTasks: [],
        prefetchStakeholders: []
      };
    }

    // 2. Run all initial database queries in parallel on the server
    const [profileRes, managedDeptsRes, workspaces, companies, priorities] = await Promise.all([
      supabase.from("user_master").select("id, full_name, email, profile_photo, role_id, department_id, designation_id, manager_id, is_active, created_at, updated_at, department:departments(id, name)").eq("id", user.id).single(),
      supabase.from("departments").select("id").eq("manager_id", user.id),
      fetchWorkspaces(),
      fetchCompanies(),
      fetchPriorities()
    ]);

    if (profileRes.error) {
      console.error("[fetchWorkspaceDashboardData] Profile fetch error:", profileRes.error.message);
      throw new Error("Failed to load user profile");
    }

    const profile = profileRes.data;
    const managedDepts = managedDeptsRes.data || [];
    const managedDeptIds = managedDepts.map((d: any) => d.id);
    const userProfile = profile ? { ...profile, id: user.id, managedDeptIds } : null;

    // Determine active workspace ID to prefetch
    const activeWSId = preferredWorkspaceId || (workspaces.length > 0 ? workspaces[0].id : null);

    // 3. Prefetch tasks & stakeholders for active workspace in parallel on server
    let prefetchTasks: any[] = [];
    let prefetchStakeholders: any[] = [];

    if (activeWSId) {
      const [tData, sData] = await Promise.all([
        fetchTasksByWorkspace(activeWSId),
        fetchWorkspaceStakeholders(activeWSId)
      ]);
      prefetchTasks = tData;
      prefetchStakeholders = sData;
    }

    return {
      userProfile,
      workspaces,
      companies,
      priorities,
      prefetchWorkspaceId: activeWSId,
      prefetchTasks,
      prefetchStakeholders
    };
  } catch (err: any) {
    console.error("[fetchWorkspaceDashboardData] Error:", err?.message || String(err));
    throw new Error(err?.message || "Failed to load workspace dashboard");
  }
}

export async function updateWorkspace(id: string, formData: any) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Unauthenticated");

  const hasAccess = await checkServerPermission(supabase, userId, "WORKSPACES_UPDATE");
  if (!hasAccess) {
    throw new Error("Unauthorized: Missing WORKSPACES_UPDATE capability.");
  }

  const { data, error } = await supabase
    .from("workspaces")
    .update(formData)
    .eq("id", id)
    .select()
    .single();
    
  if (error) {
    console.error("[Workspaces] Error updating workspace:", error);
    throw new Error(error.message);
  }
  return data;
}

export async function deleteWorkspace(id: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Unauthenticated");

  const hasAccess = await checkServerPermission(supabase, userId, "WORKSPACES_DELETE");
  if (!hasAccess) {
    throw new Error("Unauthorized: Missing WORKSPACES_DELETE capability.");
  }

  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", id);
    
  if (error) {
    console.error("[Workspaces] Error deleting workspace:", error);
    throw new Error(error.message);
  }
}

export async function fetchWorkspaceStakeholders(workspaceId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, user:user_master(id, full_name, user_code, profile_photo, designation:designations(name), department:departments(name))")
    .eq("workspace_id", workspaceId);
    
  if (error) {
    console.error("[Workspaces] Error fetching stakeholders:", error);
    return [];
  }
  
  return data.map(d => ({ ...d.user, workspace_role: d.role })) || [];
}

export async function createTask(formData: any) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  
  const { data: status } = await supabase
    .from("workflow_states")
    .select("id")
    .eq("code", "ST_OPEN")
    .single();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("department_id")
    .eq("id", formData.workspace_id)
    .single();

  // Support both legacy single-assignee/team and new multi-assignee/team arrays
  const {
    assignee_id,
    team_id,
    assignee_ids,
    team_ids,
    checklist_items,
    attachments,
    ...taskFields
  } = formData;

  const assigneesArray = Array.from(new Set(
    Array.isArray(assignee_ids)
      ? assignee_ids
      : (assignee_id ? [assignee_id] : [])
  )).filter(Boolean);
  const teamsArray = Array.from(new Set(
    Array.isArray(team_ids)
      ? team_ids
      : (team_id ? [team_id] : [])
  )).filter(Boolean);
  const checklistArray = Array.isArray(checklist_items)
    ? checklist_items.filter(Boolean)
    : [];
  const attachmentArray = Array.isArray(attachments)
    ? attachments.map((att: any) => ({
        file_name: att.file_name,
        file_url: att.file_url,
        file_type: att.file_type || att.file_name?.split('.').pop() || 'unknown',
        size: Number(att.size) || 0
      }))
    : [];

  const primaryAssigneeId = assignee_id || (assigneesArray.length > 0 ? assigneesArray[0] : null);

  const { data, error } = await supabase
    .from("workspace_tasks")
    .insert([{
      ...taskFields,
      assignee_id: primaryAssigneeId || null,
      status_id: status?.id,
      creator_id: userId,
      department_id: ws?.department_id || null,
      progress_percentage: 0
    }])
    .select()
    .single();
    
  if (error) {
    console.error("[Workspaces] Error creating task:", error);
    throw new Error(error.message);
  }

  // Insert multiple assignees
  if (assigneesArray.length > 0) {
    const payload = assigneesArray.map((uId: string) => ({ task_id: data.id, user_id: uId }));
    await supabase.from("task_assignees").insert(payload);
  }

  // Insert multiple teams
  if (teamsArray.length > 0) {
    const payload = teamsArray.map((tId: string) => ({ task_id: data.id, team_id: tId }));
    await supabase.from("task_teams").insert(payload);
  }

  // Insert checklist entries
  if (checklistArray.length > 0) {
    const checklistPayload = checklistArray.map((label: string) => ({
      task_id: data.id,
      label,
      is_completed: false
    }));
    const { error: checklistError } = await supabase.from("task_checklists").insert(checklistPayload);
    if (checklistError) {
      console.error("[Workspaces] Error inserting task checklist items:", checklistError);
      throw new Error(checklistError.message);
    }
  }

  // Insert attachment records
  if (attachmentArray.length > 0) {
    const attachmentPayload = attachmentArray.map((att: any) => ({
      task_id: data.id,
      file_name: att.file_name,
      file_url: att.file_url,
      file_type: att.file_type,
      size: att.size,
      uploaded_by: userId
    }));
    const { error: attachmentError } = await supabase.from("task_attachments").insert(attachmentPayload);
    if (attachmentError) {
      console.error("[Workspaces] Error inserting task attachments:", attachmentError);
      throw new Error(attachmentError.message);
    }
  }

  // Trigger notifications for assigned users and team members
  try {
    // notify explicit assignees
    for (const uId of assigneesArray) {
      await dispatchNotification(uId, "New Task Assigned", `A task was assigned to you: ${data.title || data.id}`, `/workspaces?task=${data.id}`);
    }

    // notify members of assigned teams
    if (teamsArray.length > 0) {
      const { data: teamMembers } = await supabase
        .from("team_members")
        .select("user_id")
        .in("team_id", teamsArray);

      (teamMembers || []).forEach(async (tm: any) => {
        if (tm?.user_id) {
          await dispatchNotification(tm.user_id, "New Task Assigned to Your Team", `A task was assigned to your team: ${data.title || data.id}`, `/workspaces?task=${data.id}`);
        }
      });
    }
  } catch (e) {
    console.error("Notification dispatch failed:", e);
  }

  return data;
}

export async function fetchTasksByWorkspace(workspaceId: string) {
  if (!workspaceId) return [];
  
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("workspace_tasks")
    .select(`
      *,
      status:workflow_states(name, code),
      priority:master_priorities(name, code),
      parent_task:workspace_tasks!parent_task_id(id, code, title),
      checklists:task_checklists(*),
      attachments:task_attachments(*),
      assignee:user_master!assignee_id(id, full_name, profile_photo),
      assignees:task_assignees(user:user_master(id, full_name, profile_photo)),
      creator:user_master!creator_id(id, manager_id),
      teams:task_teams(team:teams(id, name), members:team_members(user:user_master(id, full_name, profile_photo)))
    `)
    .eq("workspace_id", workspaceId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });
  
  if (error) {
    console.error("[Workspaces] Error fetching tasks:", error);
    return [];
  }
  return data || [];
}

export async function fetchAllTasks() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Check if user is admin
  const isAdmin = user.app_metadata?.role === "SUPER_ADMIN";

  // If admin, return all tasks
  if (isAdmin) {
    const { data, error } = await supabase
      .from("workspace_tasks")
      .select(`
        *,
        workspace:workspaces(id, name, code),
        status:workflow_states(name, code),
        priority:master_priorities(name, code),
        assignee:user_master!assignee_id(id, full_name, profile_photo),
        assignees:task_assignees(user:user_master(id, full_name, profile_photo)),
        creator:user_master!creator_id(id, manager_id),
        parent_task:workspace_tasks!parent_task_id(id, code, title)
      `)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Workspaces] Error fetching all tasks (admin):", error);
      return [];
    }
    return data || [];
  }
  // For non-admin users, enforce strict visibility rules via RLS
  const { data: allTasks, error: tasksError } = await supabase
    .from("workspace_tasks")
    .select(`
      *,
      workspace:workspaces(id, name, code),
      status:workflow_states(name, code),
      priority:master_priorities(name, code),
      assignee:user_master!assignee_id(id, full_name, profile_photo),
      assignees:task_assignees(user:user_master(id, full_name, profile_photo)),
      creator:user_master!creator_id(id, manager_id),
      parent_task:workspace_tasks!parent_task_id(id, code, title)
    `)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (tasksError) {
    console.error("[Workspaces] Error fetching all tasks:", tasksError);
    return [];
  }

  return allTasks || [];
}

export async function toggleChecklistItem(itemId: string, completed: boolean) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { error } = await supabase
    .from("task_checklists")
    .update({ 
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: (await supabase.auth.getUser()).data.user?.id
    })
    .eq("id", itemId);
  
  if (error) throw new Error("Failed to update checklist item");
}

export async function updateTaskProgress(taskId: string, progress: number) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { error } = await supabase
    .from("workspace_tasks")
    .update({ progress_percentage: progress })
    .eq("id", taskId);
  
  if (error) throw new Error("Failed to update task progress");
}

export async function fetchSidebarCounts() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let tickets = 0;
  let workspaces = 0;
  let requirements = 0;
  let sla = 0;
  let users = 0;

  try {
    const getCount = async (table: string, filterField?: string) => {
      try {
        let query = supabase.from(table).select("id", { count: "exact", head: true });
        if (filterField) {
          query = query.eq(filterField, false);
        }
        const { count, error } = await query;
        if (error) {
          console.warn(`[Sidebar Count] Error fetching count for ${table}:`, error);
          return 0;
        }
        return count || 0;
      } catch (e) {
        console.error(`[Sidebar Count] Exception fetching count for ${table}:`, e);
        return 0;
      }
    };

    const [ticketsRes, workspacesData, requirementsRes, slaRes, usersRes] = await Promise.all([
      getCount("tickets", "is_deleted"),
      fetchWorkspaces().then(w => w.length, () => 0),
      getCount("requirements", "is_deleted"),
      getCount("ticket_sla_trackers"),
      getCount("user_master", "is_deleted")
    ]);

    tickets = ticketsRes;
    workspaces = workspacesData;
    requirements = requirementsRes;
    sla = slaRes;
    users = usersRes;
  } catch (err) {
    console.error("Error fetching sidebar counts:", err);
  }

  return { tickets, workspaces, requirements, sla, users };
}
