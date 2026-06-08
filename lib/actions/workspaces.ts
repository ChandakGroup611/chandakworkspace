"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { dispatchNotification } from "@/lib/actions/notifications";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { revalidatePath } from "next/cache";

import { hasPermission } from "@/lib/permissions";
import { getVisibleWorkspaces } from "@/lib/repositories/workspaces";

/**
 * Enterprise permission verification helper for server actions
 * Replaced by the centralized Authorization Service
 */
async function checkServerPermission(supabase: any, userId: string, requiredPerm: string): Promise<boolean> {
  return hasPermission(userId, requiredPerm);
}

/**
 * Enterprise Workspace & Task Server Actions
 */

export async function fetchEnrolledWorkspaces() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Fetch workspaces the user is explicitly a member of
  const { data: wsMembers } = await supabaseAdmin.from("workspace_members").select("workspace_id").eq("user_id", user.id);
  const wsIds = wsMembers?.map(m => m.workspace_id) || [];
  
  let workspaces: any[] = [];
  if (wsIds.length > 0) {
    const { data: ws } = await supabaseAdmin
      .from('workspaces')
      .select('*, status:status_master!workspaces_status_id_fkey(status_name, status_color), company:company_master(company_name)')
      .in('id', wsIds)
      .eq('is_deleted', false);
    workspaces = ws || [];
  }

  // Fetch sub-workspaces the user is explicitly a member of
  const { data: swMembers } = await supabaseAdmin.from("sub_workspace_members").select("sub_workspace_id").eq("user_id", user.id);
  const swIds = swMembers?.map(m => m.sub_workspace_id) || [];
  
  let subWorkspaces: any[] = [];
  if (swIds.length > 0) {
    const { data: sw } = await supabaseAdmin
      .from('sub_workspaces')
      .select('*, status:status_master!sub_workspaces_status_id_fkey(status_name, status_color)')
      .in('id', swIds)
      .eq('is_deleted', false);
    subWorkspaces = sw || [];
  }

  return { workspaces, subWorkspaces };
}

export async function fetchCompanies() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("company_master")
    .select("id, name:company_name, code:company_code")
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order("company_name", { ascending: true });
    
  if (error) console.error(`[fetchCompanies] Error: ${error.message}`);
  return data || [];
}

export async function fetchPriorities(scopeId?: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  let query = supabase
    .from("priority_master")
    .select("id, name:priority_name, code:priority_code, scope_id")
    .eq('is_active', true)
    .eq('is_deleted', false);
    
  if (scopeId) {
    query = query.or(`scope_id.eq.${scopeId},scope_id.is.null`);
  } else {
    query = query.is('scope_id', null);
  }
    
  const { data, error } = await query;
  if (error) console.error(`[fetchPriorities] Error: ${error.message}`);
  
  let results = data || [];
  if (scopeId && results.length > 0) {
    const uniqueMap = new Map();
    for (const p of results) {
       const existing = uniqueMap.get(p.name);
       if (!existing || p.scope_id) {
          uniqueMap.set(p.name, p);
       }
    }
    results = Array.from(uniqueMap.values());
  }
  
  return results;
}

export async function fetchStatusesByScope(scopeType: string, scopeId?: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  let query = supabase
    .from("status_master")
    .select("id, name:status_name, code:status_code, scope_id, status_order")
    .eq('is_active', true)
    .eq('is_deleted', false)
    .eq('scope_type', scopeType);
    
  if (scopeId) {
    query = query.or(`scope_id.eq.${scopeId},scope_id.is.null`);
  } else {
    query = query.is('scope_id', null);
  }

  const { data, error } = await query;
  if (error) console.error(`[fetchStatusesByScope] Error: ${error.message}`);
  
  let results = data || [];
  if (scopeId && results.length > 0) {
    const uniqueMap = new Map();
    for (const s of results) {
       const existing = uniqueMap.get(s.name);
       if (!existing || s.scope_id) {
          uniqueMap.set(s.name, s);
       }
    }
    results = Array.from(uniqueMap.values());
  }
  
  // Sort by status_order after deduplication
  results.sort((a, b) => (a.status_order || 0) - (b.status_order || 0));
  
  return results;
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

    let statusId = formData.status_id || null;
    if (!statusId) {
      try {
        const { data: status } = await supabase
          .from("status_master")
          .select("id")
          .eq("status_code", "ST_OPEN")
          .single();
        statusId = status?.id;
        if (!statusId) {
          const { data: fallback } = await supabaseAdmin.from("status_master").select("id").limit(1);
          statusId = fallback?.[0]?.id || null;
        }
      } catch (e) {
        const { data: fallback } = await supabaseAdmin.from("status_master").select("id").limit(1);
        statusId = fallback?.[0]?.id || null;
      }
    }

    const { data, error } = await supabase
      .from("workspaces")
      .insert([{
        workspace_name: formData.name,
        workspace_code: formData.code || null,
        description: formData.description,
        company_id: (formData.company_id && formData.company_id.trim()) ? formData.company_id : null,
        start_date: (formData.start_date && formData.start_date.trim()) ? formData.start_date : null,
        end_date: (formData.end_date && formData.end_date.trim()) ? formData.end_date : null,
        status_id: statusId,
        workspace_owner_id: userId,
        parent_workspace_id: (formData.parent_workspace_id && formData.parent_workspace_id.trim()) ? formData.parent_workspace_id : null,
        visibility_settings: formData.visibility_settings || { public: false }
      }])
      .select()
      .single();
      
    if (error) {
      console.error("[Workspaces] Error creating workspace:", error.message);
      throw new Error(error.message);
    }

    // Insert assignees
    const assigneesArray = Array.from(new Set([userId, ...(formData.assigneeIds || [])])).filter(Boolean) as string[];

    if (assigneesArray.length > 0) {
      await supabaseAdmin.from("workspace_members").insert(
        assigneesArray.map((id: string) => ({
          workspace_id: data.id,
          user_id: id,
          role: id === userId ? 'manager' : 'member'
        }))
      );
    }

    // 4. Dispatch Notifications concurrently in the background
    const notifications = assigneesArray.map(async (assigneeId) => {
      if (assigneeId === userId) return; // Skip notifying the user who just created it

      const isSub = !!formData.parent_workspace_id;
      const title = isSub ? "Assigned to New Sub-Workspace" : "Assigned to New Workspace";
      const message = `You have been assigned to the ${isSub ? 'Sub-Workspace' : 'Workspace'}: "${data.workspace_name}" (${data.workspace_code}).`;
      
      try {
        await dispatchNotification(
          assigneeId,
          title,
          message,
          `/workspaces`
        );
      } catch (e) {
        console.error("Failed to dispatch notification to", assigneeId, e);
      }
    });

    // Fire and forget so we don't block the UI response
    Promise.all(notifications).catch(console.error);

    // Map to frontend expected shape
    return {
      ...data,
      name: data.workspace_name,
      code: data.workspace_code,
      members: formData.assigneeIds?.map((uid: any) => ({ user_id: uid, role: 'member' })) || []
    };
  } catch (err: any) {
    console.error("[createWorkspace] Error:", err?.message || String(err));
    return { error: err?.message || "Failed to create workspace" };
  }
}

export async function fetchWorkspaces() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  // Fetch workspaces using the explicit repository layer
  return await getVisibleWorkspaces(userId);
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


    // 2. Fetch independent data first
    const [profileRes, managedDeptsRes, workspaces, companies, priorities, taskStatuses] = await Promise.all([
      supabase.from("user_master").select("id, full_name, email, role_id, department_id, designation_id, manager_id, is_active, created_at, updated_at").eq("id", user.id).single(),
      supabase.from("departments").select("id").eq("manager_id", user.id),
      getVisibleWorkspaces(user.id), // Direct fast repository call
      fetchCompanies(),
      fetchPriorities(),
      import('@/lib/actions/tasks').then(m => m.getTaskStatuses())
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

    // 3. Hierarchy Roots Only (Level 1)
    const masterHierarchy = await fetchHierarchyRoots(user.id, workspaces);

    // 4. Extract all unique User IDs needed for UI mapping (restricted to root workspaces)
    const uniqueUserIds = new Set<string>();
    uniqueUserIds.add(user.id);
    
    // Scan workspaces for owners, creators, and members
    workspaces.forEach((w: any) => {
      if (w.owner_id) uniqueUserIds.add(w.owner_id);
      if (w.created_by) uniqueUserIds.add(w.created_by);
      if (w.members) w.members.forEach((m: any) => uniqueUserIds.add(m.user_id));
    });

    // Scan hierarchy
    masterHierarchy.forEach((w: any) => {
      if (w.owner_id) uniqueUserIds.add(w.owner_id);
      if (w.created_by) uniqueUserIds.add(w.created_by);
      if (w.members) w.members.forEach((m: any) => uniqueUserIds.add(m.user_id));
    });

    // Fetch ONLY the required users (drastically reduces Server-to-Client JSON payload)
    const allUsersResult = await supabaseAdmin
      .from("user_master")
      .select("id, full_name, user_code")
      .in("id", Array.from(uniqueUserIds))
      .eq("is_deleted", false);

    const allUsers = allUsersResult.data || [];

    return {
      userProfile,
      workspaces,
      companies,
      priorities,
      prefetchWorkspaceId: activeWSId,
      prefetchTasks: [], // DEFERRED TO LAZY LOAD
      prefetchStakeholders: [], // DEFERRED TO LAZY LOAD
      masterHierarchy,
      taskStatuses,
      allUsers
    };
  } catch (err: any) {
    console.error("[fetchWorkspaceDashboardData] Error:", err?.message || String(err));
    throw new Error(err?.message || "Failed to load workspace dashboard");
  }
}

export async function fetchHierarchyRoots(userId: string, cachedVisibleWorkspaces?: any[]) {
  // 1. Fetch ALL Visible Workspaces (use cached if provided to save DB queries)
  const visibleWorkspaces = cachedVisibleWorkspaces || await getVisibleWorkspaces(userId);
  const wsIds = visibleWorkspaces.map((w: any) => w.id);
  
  if (wsIds.length === 0) return [];

  // Filter to roots: Nodes where parent_workspace_id is null OR parent is not in the visible set
  const rootWorkspaces = visibleWorkspaces.filter((ws: any) => !ws.parent_workspace_id || !wsIds.includes(ws.parent_workspace_id));

  // Note: Statistics (direct_task_count, etc.) will be handled by Phase 10 Statistics Table in the future.
  // For now, we return 0 or rely on a lightweight cache to prevent N+1 COUNT queries.
  return rootWorkspaces.map((ws: any) => ({
    ...ws,
    type: ws.parent_workspace_id ? 'SUB_WORKSPACE' : 'WORKSPACE',
    subworkspace_count: ws.hierarchy_subws_count || 0,
    direct_task_count: (Array.isArray(ws.stats) ? ws.stats[0] : ws.stats)?.task_count || 0,
    total_hierarchy_task_count: ws.hierarchy_task_count || 0,
    children: [] // Children will be fetched on demand
  }));
}

export async function fetchHierarchyChildren(parentId: string, parentType: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  // If expanding a Workspace/Sub-Workspace, fetch its Sub-Workspaces and Direct Tasks
  if (parentType === 'WORKSPACE' || parentType === 'SUB_WORKSPACE') {
    // Check if user is super admin
    const canManageAll = await checkServerPermission(supabase, userId, "WORKSPACES_MANAGE");
    
    let allowedWorkspaceIds: string[] = [];
    if (!canManageAll) {
      const [memberRes, ownerRes] = await Promise.all([
        supabaseAdmin.from('workspace_members').select('workspace_id').eq('user_id', userId).eq('is_deleted', false),
        supabaseAdmin.from('workspaces').select('id').eq('workspace_owner_id', userId).eq('is_deleted', false)
      ]);
      const wsIds = new Set<string>();
      memberRes.data?.forEach((w: any) => wsIds.add(w.workspace_id));
      ownerRes.data?.forEach((w: any) => wsIds.add(w.id));
      allowedWorkspaceIds = Array.from(wsIds);
    }

    let subWsQuery = supabaseAdmin
        .from('workspaces')
        .select('id, name:workspace_name, code:workspace_code, description, owner_id:workspace_owner_id, parent_workspace_id, company_id, status_id, start_date, end_date, created_at, company:company_master(name:company_name), status:status_master(name:status_name, status_color), hierarchy_task_count, hierarchy_subws_count, parent:workspaces!parent_workspace_id(name:workspace_name, code:workspace_code)')
        .eq('parent_workspace_id', parentId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

    if (!canManageAll) {
      if (allowedWorkspaceIds.length === 0) {
        // If they have no workspace memberships, they can't see any subworkspaces
        subWsQuery = subWsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      } else {
        subWsQuery = subWsQuery.in('id', allowedWorkspaceIds);
      }
    }

    // 1 & 2. Fetch Sub-Workspaces & Tasks Concurrently
    const [subWsRes, tasksRes] = await Promise.all([
      subWsQuery,
      supabaseAdmin
        .from('tasks')
        .select('id, name:subject, code:task_code, description, owner_id, workspace_id, parent_task_id, status_id, start_date, end_date, created_at, created_by, status:status_master!tasks_status_id_fkey(name:status_name, status_color), subtasks:tasks!parent_task_id(count), parent:tasks!parent_task_id(name:subject, code:task_code)')
        .eq('workspace_id', parentId)
        .is('parent_task_id', null)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(100) // Safety net to prevent UI freeze on expansion
    ]);

    const subWs = subWsRes.data;
    const tasks = tasksRes.data;

    const nodes = [];
    if (subWs) {
      nodes.push(...subWs.map((ws: any) => ({
        ...ws,
        type: 'SUB_WORKSPACE',
        subworkspace_count: ws.hierarchy_subws_count || 0,
        direct_task_count: (Array.isArray(ws.stats) ? ws.stats[0] : ws.stats)?.task_count || 0,
        total_hierarchy_task_count: ws.hierarchy_task_count || 0,
        children: []
      })));
    }
    if (tasks) {
      nodes.push(...tasks.map((t: any) => ({
        ...t,
        type: 'TASK',
        child_task_count: (Array.isArray(t.subtasks) ? t.subtasks[0]?.count : t.subtasks?.count) || 0,
        children: []
      })));
    }
    return nodes;
  }

  // If expanding a Task/Sub-Task, fetch its Sub-Tasks
  if (parentType === 'TASK' || parentType === 'SUB_TASK') {
    const { data: subTasks } = await supabaseAdmin
      .from('tasks')
      .select('id, name:subject, code:task_code, description, owner_id, workspace_id, parent_task_id, status_id, start_date, end_date, created_at, created_by, status:status_master!tasks_status_id_fkey(name:status_name, status_color), subtasks:tasks!parent_task_id(count), parent:tasks!parent_task_id(name:subject, code:task_code)')
      .eq('parent_task_id', parentId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100);

    if (subTasks) {
      return subTasks.map((t: any) => ({
        ...t,
        type: 'SUB_TASK',
        child_task_count: (Array.isArray(t.subtasks) ? t.subtasks[0]?.count : t.subtasks?.count) || 0,
        children: []
      }));
    }
  }

  return [];
}

export async function updateWorkspace(id: string, formData: any) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { error: "Unauthenticated" };

  const hasAccess = await checkServerPermission(supabase, userId, "WORKSPACES_UPDATE");
  
  // Check if user is a member of the workspace
  const { data: member } = await supabaseAdmin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!hasAccess && !member) {
    return { error: "Unauthorized: Missing WORKSPACES_UPDATE capability or workspace membership." };
  }

  const { data: oldWs } = await supabaseAdmin.from("workspaces").select("workspace_name").eq("id", id).single();

  const updatePayload = {
    workspace_name: formData.name,
    description: formData.description,
    company_id: (formData.company_id && formData.company_id.trim()) ? formData.company_id : null,
    start_date: (formData.start_date && formData.start_date.trim()) ? formData.start_date : null,
    end_date: (formData.end_date && formData.end_date.trim()) ? formData.end_date : null,
    parent_workspace_id: (formData.parent_workspace_id !== undefined)
      ? ((formData.parent_workspace_id && formData.parent_workspace_id.trim()) ? formData.parent_workspace_id : null)
      : undefined,
    ...(formData.visibility_settings !== undefined && { visibility_settings: formData.visibility_settings }),
  };

  // Prevent cyclical assignments: Workspace cannot be its own parent
  if (updatePayload.parent_workspace_id === id) {
    return { error: "Validation Error: A workspace cannot be assigned as its own parent." };
  }

  const { data, error } = await supabase
    .from("workspaces")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();
    
  if (error) {
    console.error("[Workspaces] Error updating workspace:", error);
    if (error.code === 'PGRST116' || error.message.includes('JSON object')) {
      return { error: "Unauthorized: You do not have permission to modify this workspace." };
    }
    return { error: error.message };
  }

  // Audit Log for title change
  if (oldWs && formData.name && oldWs.workspace_name !== formData.name) {
    await supabaseAdmin.from('activity_events').insert({
      module_type: 'WORKSPACE',
      record_id: id,
      event_type: 'TITLE',
      old_value: { title: oldWs.workspace_name },
      new_value: { title: formData.name },
      performed_by: userId
    });
  }

  // Update assignees and teams if provided
  if (formData.assigneeIds !== undefined) {
    // 1. Get existing members to preserve roles and manage soft-deletes
    const { data: existingMembers } = await supabaseAdmin
      .from("workspace_members")
      .select("id, user_id, role, is_deleted")
      .eq("workspace_id", id);
    
    const roleMap = new Map();
    const idMap = new Map();
    existingMembers?.forEach(m => {
      roleMap.set(m.user_id, m.role);
      idMap.set(m.user_id, m.id);
    });

    // 2. Ensure owner is not locked out
    const { data: ws } = await supabaseAdmin.from("workspaces").select("workspace_owner_id").eq("id", id).single();
    const ownerId = ws?.workspace_owner_id;

    let assigneesArray = Array.from(new Set(formData.assigneeIds)).filter(Boolean) as string[];
    if (ownerId && !assigneesArray.includes(ownerId)) {
        assigneesArray.push(ownerId);
    }

    // 3. Perform soft-deletes and upserts
    const usersToSoftDelete = (existingMembers || []).filter(m => !assigneesArray.includes(m.user_id) && !m.is_deleted).map(m => m.id);
    if (usersToSoftDelete.length > 0) {
      await supabaseAdmin.from("workspace_members").update({ is_deleted: true }).in("id", usersToSoftDelete);
    }

    for (const uid of assigneesArray) {
      const existingRole = roleMap.get(uid);
      const role = existingRole ? existingRole : (uid === ownerId ? 'manager' : 'member');
      const recordId = idMap.get(uid);

      if (recordId) {
        await supabaseAdmin.from("workspace_members").update({ is_deleted: false, role }).eq("id", recordId);
      } else {
        await supabaseAdmin.from("workspace_members").insert({ workspace_id: id, user_id: uid, role, is_deleted: false });
      }
    }
  }

  // Dispatch Notifications for updates if new assignees were provided
  if (formData.assigneeIds !== undefined) {
    const assigneesArray = Array.from(new Set(formData.assigneeIds)).filter(Boolean) as string[];
    for (const assigneeId of assigneesArray) {
      if (assigneeId === userId) continue; // Skip the updater

      const isSub = !!formData.parent_workspace_id;
      const title = isSub ? "Workspace Assignment Updated" : "Workspace Assignment Updated";
      const message = `You have been added/re-assigned to the workspace: "${data.workspace_name}".`;
      
      await dispatchNotification(
        assigneeId,
        title,
        message,
        `/workspaces`
      );
    }
  }

  revalidatePath("/workspaces");

  // Map to frontend expected shape
  return {
    ...data,
    name: data.workspace_name,
    code: data.workspace_code,
    members: formData.assigneeIds?.map((uid: any) => ({ user_id: uid, role: 'member' })) || []
  };
  } catch (err: any) {
    console.error("[updateWorkspace] Error:", err?.message || String(err));
    return { error: err?.message || "Failed to update workspace" };
  }
}

export async function deleteWorkspace(id: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { error: "Unauthenticated" };

  const hasAccess = await checkServerPermission(supabase, userId, "WORKSPACES_DELETE");
  if (!hasAccess) {
    const { data: ws } = await supabaseAdmin.from("workspaces").select("workspace_owner_id").eq("id", id).single();
    if (!ws || ws.workspace_owner_id !== userId) {
      return { error: "Unauthorized: Missing WORKSPACES_DELETE capability." };
    }
  }

  const { error } = await supabase
    .from("workspaces")
    .update({ is_deleted: true })
    .eq("id", id);
    
  if (error) {
    console.error("[Workspaces] Error deleting workspace:", error);
    return { error: error.message };
  }

  revalidatePath("/workspaces");
  return { success: true };
  } catch (err: any) {
    console.error("[deleteWorkspace] Error:", err?.message || String(err));
    return { error: err?.message || "Failed to delete workspace" };
  }
}

export async function fetchWorkspaceStakeholders(workspaceId: string) {
  // 1. Fetch workspace members
  const { data: members, error } = await supabaseAdmin
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspaceId)
    .eq("is_deleted", false);
    
  if (error || !members || members.length === 0) {
    if (error) console.error("[Workspaces] Error fetching stakeholders:", error);
    return [];
  }
  
  // 2. Fetch user details for those members
  const userIds = members.map(m => m.user_id);
  const { data: users, error: userError } = await supabaseAdmin
    .from("user_master")
    .select(`id, full_name, user_code`)
    .in("id", userIds);
    
  if (userError || !users) {
    console.error("[Workspaces] Error fetching users for stakeholders:", userError);
    return [];
  }
  
  // 3. Map them together
  return members.map(mem => {
    const user = users.find(u => u.id === mem.user_id);
    if (!user) return null;
    return {
      ...user,
      workspace_role: mem.role || 'MEMBER'
    };
  }).filter(Boolean);
}


export async function fetchTasksByWorkspace(workspaceId: string, page: number = 1, limit: number = 50, includeDescendants: boolean = false) {
  if (!workspaceId) return [];
  
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  let targetWorkspaceIds = [workspaceId];

  if (includeDescendants) {
    // 1. Fetch all workspaces to build the descendant tree
    const { data: allWs } = await supabaseAdmin.from("workspaces").select("id, parent_workspace_id").eq("is_deleted", false);
    
    const getDescendants = (id: string, all: any[]): string[] => {
      const children = all.filter((w: any) => w.parent_workspace_id === id);
      return [id, ...children.flatMap((c: any) => getDescendants(c.id, all))];
    };
    
    targetWorkspaceIds = getDescendants(workspaceId, allWs || []);
  }
  
  const startIdx = (page - 1) * limit;
  const endIdx = startIdx + limit - 1;

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      title:subject,
      status:status_master(name:status_name, code:status_code, status_color),
      priority:priority_master(name:priority_name, code:priority_code),
      assignee:user_master!tasks_assigned_to_fkey(id, full_name, user_code)
    `)
    .in("workspace_id", targetWorkspaceIds)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .range(startIdx, endIdx);
    
  if (error) {
    console.error("[Workspaces] Error fetching tasks:", error);
    return [];
  }
  
  if (data && data.length > 0) {
    // Note: Participants and Attachments are now lazy-loaded in the Task Details Drawer per Phase 6 optimization.
    data.forEach((t: any) => {
      t.workspace = null;
      t.creator = null;
      t.attachmentCount = 0;
      t.participants = [];
      t.assignees = [];
      
      // Calculate progress percentage
      if (t.status?.code === "CLOSED" || t.status?.code === "RESOLVED" || t.status?.code === "DONE") {
        t.progress_percentage = 100;
      } else if (t.checklists && t.checklists.length > 0) {
        const completed = t.checklists.filter((c: any) => c.is_completed).length;
        t.progress_percentage = Math.round((completed / t.checklists.length) * 100);
      } else {
        // Fallback: Use status to infer progress if no checklists exist
        if (t.status?.code === "IN_PROGRESS" || t.status?.code === "WIP") {
          t.progress_percentage = 50;
        } else if (t.status?.code === "REVIEW" || t.status?.code === "TESTING") {
          t.progress_percentage = 80;
        } else {
          t.progress_percentage = 0;
        }
      }
    });

    // Structure parent/child tasks
    const taskMap = new Map(data.map((t: any) => [t.id, t]));
    data.forEach((t: any) => {
      if (t.parent_task_id && taskMap.has(t.parent_task_id)) {
        t.parent_task = taskMap.get(t.parent_task_id);
      }
    });
  }
  
  return data || [];
}

export async function fetchAllTasks() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch workspaces the user has access to
  const visibleWorkspaces = await getVisibleWorkspaces(user.id);
  const visibleWsIds = visibleWorkspaces.map((w: any) => w.id);

  if (visibleWsIds.length === 0) {
    return [];
  }

  const { data: allTasks, error: tasksError } = await supabase
    .from("tasks")
    .select(`
      *,
      title:subject,
      status:status_master(name:status_name, code:status_code, status_color),
      priority:priority_master(name:priority_name, code:priority_code)
    `)
    .in("workspace_id", visibleWsIds)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (tasksError) {
    console.error("[Workspaces] Error fetching all tasks:", tasksError);
    return [];
  }
  
  if (allTasks && allTasks.length > 0) {
      const wsIds = Array.from(new Set(allTasks.map((t: any) => t.workspace_id).filter(Boolean)));
      const creatorIds = Array.from(new Set(allTasks.map((t: any) => t.created_by).filter(Boolean)));
      
      const [
        { data: workspaces },
        { data: users }
      ] = await Promise.all([
        supabaseAdmin.from("workspaces").select("id, name:workspace_name, code:workspace_code").in("id", wsIds),
        supabaseAdmin.from("user_master").select("id, full_name, manager_id").in("id", creatorIds)
      ]);
        
      allTasks.forEach((t: any) => {
        t.workspace = workspaces?.find((w: any) => w.id === t.workspace_id) || null;
        t.creator = users?.find((u: any) => u.id === t.created_by) || null;
        t.assignees = []; // Implicitly workspace members

        // Calculate progress percentage
        if (t.status?.code === "CLOSED" || t.status?.code === "RESOLVED" || t.status?.code === "DONE") {
          t.progress_percentage = 100;
        } else if (t.checklists && t.checklists.length > 0) {
          const completed = t.checklists.filter((c: any) => c.is_completed).length;
          t.progress_percentage = Math.round((completed / t.checklists.length) * 100);
        } else {
          // Fallback: Use status to infer progress if no checklists exist
          if (t.status?.code === "IN_PROGRESS" || t.status?.code === "WIP") {
            t.progress_percentage = 50;
          } else if (t.status?.code === "REVIEW" || t.status?.code === "TESTING") {
            t.progress_percentage = 80;
          } else {
            t.progress_percentage = 0;
          }
        }
      });
  }

  return allTasks || [];
}

export async function toggleChecklistItem(itemId: string, completed: boolean) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Unauthenticated");
  
  const { data, error } = await supabaseAdmin
    .from("task_checklists")
    .update({ 
      is_completed: completed
    })
    .eq("id", itemId)
    .select()
    .single();
  
  if (error) throw new Error("Failed to update checklist item");

  if (data) {
    await supabaseAdmin.from('task_activity_logs').insert([{
      task_id: data.task_id,
      actor_id: userId,
      action: 'CHECKLIST_UPDATE',
      new_state: { label: data.label, is_completed: completed }
    }]);
  }
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

  try {
    const { data, error } = await supabase.rpc('get_sidebar_counts');
    if (error) {
      console.warn(`[fetchSidebarCounts] Error:`, error);
      return { tickets: 0, workspaces: 0, requirements: 0, sla: 0, users: 0 };
    }
    return {
      tickets: data.tickets || 0,
      workspaces: data.workspaces || 0,
      requirements: data.requirements || 0,
      sla: data.sla || 0,
      users: data.users || 0
    };
  } catch (err) {
    console.error("Error fetching sidebar counts:", err);
    return { tickets: 0, workspaces: 0, requirements: 0, sla: 0, users: 0 };
  }
}

export async function fetchAssignableUsers() {
  const { data, error } = await supabaseAdmin
    .from("user_master")
    .select("id, full_name, user_code")
    .eq("is_deleted", false)
    .order("full_name", { ascending: true });
    
  if (error) {
    console.error("[fetchAssignableUsers] Error:", error);
    return [];
  }
  return data || [];
}

export async function createSprint(workspaceId: string, formData: any) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data, error } = await supabaseAdmin.from("sprints").insert([{
    workspace_id: workspaceId,
    name: formData.name,
    goal: formData.goal,
    start_date: (formData.start_date && formData.start_date.trim()) ? formData.start_date : null,
    end_date: (formData.end_date && formData.end_date.trim()) ? formData.end_date : null,
    status: formData.status || 'PLANNING',
    created_by: user.id
  }]).select().single();

  if (error) throw error;
  return data;
}

export async function fetchSprints(workspaceId: string) {
  const { data: allWs } = await supabaseAdmin.from("workspaces").select("id, parent_workspace_id").eq("is_deleted", false);
  if (!allWs) return [];
  
  // Find the root workspace
  let rootId = workspaceId;
  let current = allWs.find(w => w.id === rootId);
  while (current && current.parent_workspace_id) {
    rootId = current.parent_workspace_id;
    current = allWs.find(w => w.id === rootId);
  }
  
  // Now get all descendants of the root
  const getDescendants = (id: string, all: any[]): string[] => {
    const children = all.filter((w: any) => w.parent_workspace_id === id);
    return [id, ...children.flatMap((c: any) => getDescendants(c.id, all))];
  };
  
  const hierarchyIds = getDescendants(rootId, allWs);

  const { data, error } = await supabaseAdmin.from("sprints")
    .select("*")
    .in("workspace_id", hierarchyIds)
    .order("start_date", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function updateSprint(id: string, formData: any) {
  const { data, error } = await supabaseAdmin.from("sprints")
    .update({
      name: formData.name,
      goal: formData.goal,
      start_date: (formData.start_date && formData.start_date.trim()) ? formData.start_date : null,
      end_date: (formData.end_date && formData.end_date.trim()) ? formData.end_date : null,
      status: formData.status,
      updated_at: new Date().toISOString()
    })
    .eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function createTaskTemplate(workspaceId: string, formData: any) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { data, error } = await supabaseAdmin.from("task_templates").insert([{
    workspace_id: workspaceId,
    template_name: formData.template_name,
    subject: formData.subject,
    description: formData.description,
    default_priority_id: (formData.default_priority_id && formData.default_priority_id.trim()) ? formData.default_priority_id : null,
    default_tags: formData.default_tags || [],
    created_by: user.id
  }]).select().single();

  if (error) throw error;
  return data;
}

export async function fetchTaskTemplates(workspaceId: string) {
  const { data, error } = await supabaseAdmin.from("task_templates")
    .select("*")
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .order("template_name", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function deleteTaskTemplate(id: string) {
  const { error } = await supabaseAdmin.from("task_templates").delete().eq("id", id);
  if (error) throw error;
}
