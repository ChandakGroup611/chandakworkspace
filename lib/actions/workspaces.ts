"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { dispatchNotification } from "@/lib/actions/notifications";
import { queueBusinessEvent } from "@/lib/actions/notification-engine";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { revalidatePath } from "next/cache";
import { getCachedUser } from "@/lib/auth/cached-user";

import { hasPermission } from "@/lib/permissions";
import { getVisibleWorkspaces } from "@/lib/repositories/workspaces";
import { logActivityEvent } from "@/lib/actions/tasks";
import { LifecycleManager } from "@/lib/services/LifecycleManager";
import { HierarchyManager } from "@/lib/services/HierarchyManager";

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
    query = query.eq('scope_id', scopeId);
  } else {
    query = query.is('scope_id', null);
  }
    
  const { data, error } = await query;
  if (error) console.error(`[fetchPriorities] Error: ${error.message}`);
  
  let results = data || [];
  
  // If a scope was specified but no custom priorities exist for it, fallback to global
  if (scopeId && results.length === 0) {
    const { data: fallback } = await supabase
      .from("priority_master")
      .select("id, name:priority_name, code:priority_code, scope_id")
      .eq('is_active', true)
      .eq('is_deleted', false)
      .is('scope_id', null);
    results = fallback || [];
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
    query = query.eq('scope_id', scopeId);
  } else {
    query = query.is('scope_id', null);
  }

  const { data, error } = await query;
  if (error) console.error(`[fetchStatusesByScope] Error: ${error.message}`);
  
  let results = data || [];
  
  // If a scope was specified but no custom statuses exist for it, fallback to global
  if (scopeId && results.length === 0) {
    const { data: fallback } = await supabase
      .from("status_master")
      .select("id, name:status_name, code:status_code, scope_id, status_order")
      .eq('is_active', true)
      .eq('is_deleted', false)
      .eq('scope_type', scopeType)
      .is('scope_id', null);
    results = fallback || [];
  }
  
  return results.sort((a, b) => (a.status_order || 0) - (b.status_order || 0));
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

    if (!formData.name || !formData.name.trim()) {
      throw new Error("Validation Error: Workspace name is required.");
    }

    let statusId = formData.status_id || null;
    if (!statusId) {
      // 1. Try finding status with scope_type WORKSPACE and status_code OPEN / ACTIVE / is_default
      const { data: status } = await supabaseAdmin
        .from("status_master")
        .select("id")
        .eq("scope_type", "WORKSPACE")
        .in("status_code", ["OPEN", "ACTIVE", "PLANNING", "NEW"])
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("status_order", { ascending: true })
        .limit(1)
        .maybeSingle();
        
      if (status?.id) {
        statusId = status.id;
      } else {
        // 2. Fallback: Any active status with scope_type WORKSPACE
        const { data: anyWorkspaceStatus } = await supabaseAdmin
          .from("status_master")
          .select("id")
          .eq("scope_type", "WORKSPACE")
          .eq("is_active", true)
          .eq("is_deleted", false)
          .order("status_order", { ascending: true })
          .limit(1)
          .maybeSingle();
          
        if (anyWorkspaceStatus?.id) {
          statusId = anyWorkspaceStatus.id;
        } else {
          // 3. Fallback: Any OPEN or ACTIVE status in status_master
          const { data: defaultStatus } = await supabaseAdmin
            .from("status_master")
            .select("id")
            .in("status_code", ["OPEN", "ACTIVE"])
            .eq("is_active", true)
            .eq("is_deleted", false)
            .limit(1)
            .maybeSingle();

          if (defaultStatus?.id) {
            statusId = defaultStatus.id;
          } else {
            // 4. Auto-provision default WORKSPACE status in status_master
            try {
              const { data: newStatus } = await supabaseAdmin
                .from("status_master")
                .insert([{
                  status_name: "Open",
                  status_code: "OPEN",
                  scope_type: "WORKSPACE",
                  status_color: "#10b981",
                  status_order: 1,
                  is_default: true,
                  is_active: true,
                  is_deleted: false
                }])
                .select("id")
                .single();
              statusId = newStatus?.id || null;
            } catch {
              statusId = null;
            }
          }
        }
      }
    }

    const { data, error } = await supabaseAdmin
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
        
        await queueBusinessEvent("Workspace", "Assigned", {
          entity_id: data.id,
          triggering_user_id: userId,
          assigned_to: assigneeId,
          workspace_name: data.workspace_name,
          workspace_code: data.workspace_code,
          link: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://chandakgroup.tech'}/workspaces`
        });
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
  const tId = Math.random().toString(36).substr(2, 5);
  console.time(`[PROFILER] fetchWorkspaceDashboardData_TOTAL_${tId}`);
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    console.time(`auth_${tId}`);
    // 1. Get current authenticated user
    const { user } = await getCachedUser();
    console.timeEnd(`auth_${tId}`);
    
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


    // 2. Fetch independent data concurrently to avoid waterfalls
    const [profileRes, workspaces, managedDeptsRes, companies, priorities, taskStatuses, allUsersRes] = await Promise.all([
      supabase.from("user_master").select("id, full_name, email, role_id, department_id, designation_id, manager_id, is_active, created_at, updated_at").eq("id", user.id).single(),
      getVisibleWorkspaces(user.id), // Independent, can run concurrently
      supabase.from("departments").select("id").eq("manager_id", user.id),
      fetchCompanies(),
      fetchPriorities(),
      import('@/lib/actions/tasks').then(m => m.getTaskStatuses()),
      supabaseAdmin.from("user_master").select("id, full_name, user_code, email").eq("is_active", true).eq("is_deleted", false).order("full_name", { ascending: true })
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

    const { getUserAccessScope } = await import("@/lib/auth/scope");
    const userScope = await getUserAccessScope(user.id);

    return {
      userProfile,
      userScope,
      workspaces,
      companies,
      priorities,
      prefetchWorkspaceId: activeWSId,
      prefetchTasks: [], // DEFERRED TO LAZY LOAD
      prefetchStakeholders: [], // DEFERRED TO LAZY LOAD
      masterHierarchy,
      taskStatuses,
      allUsers: allUsersRes.data || []
    };
  } catch (err: any) {
    console.error("[fetchWorkspaceDashboardData] Error:", err?.message || String(err));
    throw new Error(err?.message || "Failed to load workspace dashboard");
  } finally {
    console.timeEnd(`[PROFILER] fetchWorkspaceDashboardData_TOTAL_${tId}`);
  }
}

export async function fetchHierarchyRoots(userId: string, cachedVisibleWorkspaces?: any[]) {
  const tId = Math.random().toString(36).substr(2, 5);
  console.time(`[PROFILER] fetchHierarchyRoots_TOTAL_${tId}`);
  try {
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
  } finally {
    console.timeEnd(`[PROFILER] fetchHierarchyRoots_TOTAL_${tId}`);
  }
}

export async function fetchHierarchyChildren(parentId: string, parentType: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { user: authUser } = await getCachedUser();
  const userId = authUser?.id;
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
        .select('id, name:workspace_name, code:workspace_code, description, owner_id:workspace_owner_id, parent_workspace_id, company_id, status_id, start_date, end_date, created_at, company:company_master(name:company_name), status:status_master(name:status_name, status_color), hierarchy_task_count, hierarchy_subws_count, members:workspace_members(user_id, role), parent:workspaces!parent_workspace_id(name:workspace_name, code:workspace_code), stats:workspace_statistics(task_count, subtask_count)')
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
        .select('id, name:subject, code:task_code, description, owner_id, assigned_to, workspace_id, parent_task_id, status_id, priority_id, start_date, end_date, created_at, created_by, status:status_master!tasks_status_id_fkey(name:status_name, status_color), priority:priority_master!tasks_priority_id_fkey(name:priority_name, priority_color), subtasks:tasks!parent_task_id(count), parent:tasks!parent_task_id(name:subject, code:task_code), assignees:task_participants(user_id, participation_role)')
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
      .select('id, name:subject, code:task_code, description, owner_id, assigned_to, workspace_id, parent_task_id, status_id, priority_id, start_date, end_date, created_at, created_by, status:status_master!tasks_status_id_fkey(name:status_name, status_color), priority:priority_master!tasks_priority_id_fkey(name:priority_name, priority_color), subtasks:tasks!parent_task_id(count), parent:tasks!parent_task_id(name:subject, code:task_code), assignees:task_participants(user_id, participation_role)')
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

export interface HierarchyFilterOptions {
  entityType?: 'ALL' | 'WORKSPACES' | 'SUB_WORKSPACES' | 'TASKS';
  statusId?: string;
  priorityId?: string;
  assigneeId?: string;
  myTasksOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Deep search across the entire Execution Hierarchy (Workspaces, Sub-Workspaces, Tasks, Sub-Tasks)
 * Scopes tasks strictly to user assignment / visible workspaces as required.
 */
export async function searchHierarchyDeep(query?: string, filters?: HierarchyFilterOptions) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { user } = await getCachedUser();
  if (!user) return { hierarchy: [], matchedNodeIds: [], expandedNodeIds: [] };

  const canManageAll = await checkServerPermission(supabase, user.id, "WORKSPACES_MANAGE");

  // 1. Fetch visible workspaces
  const visibleWorkspaces = await getVisibleWorkspaces(user.id, canManageAll);
  const visibleWsMap = new Map<string, any>(visibleWorkspaces.map((w: any) => [w.id, w]));
  const visibleWsIds = Array.from(visibleWsMap.keys());
  if (visibleWsIds.length === 0) return { hierarchy: [], matchedNodeIds: [], expandedNodeIds: [] };

  // Fetch task IDs where current user is an active executor/participant
  const { data: userPartData } = await supabaseAdmin
    .from("task_participants")
    .select("task_id, participation_role")
    .eq("user_id", user.id)
    .neq("participation_role", "WATCHER");
  const myParticipantTaskIds = new Set<string>((userPartData || []).map((p: any) => p.task_id));

  // If a specific assignee filter is passed, fetch task IDs for that assignee
  let targetAssigneeTaskIds = new Set<string>();
  if (filters?.assigneeId) {
    const { data: targetPartData } = await supabaseAdmin
      .from("task_participants")
      .select("task_id, participation_role")
      .eq("user_id", filters.assigneeId)
      .neq("participation_role", "WATCHER");
    targetAssigneeTaskIds = new Set<string>((targetPartData || []).map((p: any) => p.task_id));
  }

  const cleanQuery = query ? query.trim() : "";
  const matchedNodeIds = new Set<string>();
  const expandedNodeIds = new Set<string>();

  // If no search query and no filters provided, return roots
  const hasFilters = !!(filters?.statusId || filters?.priorityId || filters?.assigneeId || filters?.myTasksOnly || (filters?.entityType && filters.entityType !== 'ALL') || filters?.dateFrom || filters?.dateTo);
  if (!cleanQuery && !hasFilters) {
    const masterHierarchy = await fetchHierarchyRoots(user.id, visibleWorkspaces);
    return { hierarchy: masterHierarchy, matchedNodeIds: [], expandedNodeIds: [] };
  }

  // 2. Query Tasks across all visible workspaces
  let tasks: any[] = [];
  if (filters?.entityType !== 'WORKSPACES' && filters?.entityType !== 'SUB_WORKSPACES') {
    let taskQuery = supabaseAdmin
      .from('tasks')
      .select(`
        id,
        name:subject,
        code:task_code,
        description,
        owner_id,
        assigned_to,
        workspace_id,
        parent_task_id,
        status_id,
        priority_id,
        start_date,
        end_date,
        created_at,
        created_by,
        status:status_master!tasks_status_id_fkey(name:status_name, status_color),
        priority:priority_master!tasks_priority_id_fkey(name:priority_name, priority_color),
        subtasks:tasks!parent_task_id(count),
        parent:tasks!parent_task_id(id, name:subject, code:task_code),
        assignees:task_participants(user_id, participation_role)
      `)
      .in('workspace_id', visibleWsIds)
      .eq('is_deleted', false);

    if (cleanQuery) {
      taskQuery = taskQuery.or(`subject.ilike.%${cleanQuery}%,task_code.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%`);
    }

    if (filters?.statusId) {
      taskQuery = taskQuery.eq('status_id', filters.statusId);
    }
    if (filters?.priorityId) {
      taskQuery = taskQuery.eq('priority_id', filters.priorityId);
    }
    if (filters?.dateFrom) {
      taskQuery = taskQuery.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      taskQuery = taskQuery.lte('created_at', filters.dateTo);
    }

    const { data: fetchedTasks, error: taskErr } = await taskQuery.order('created_at', { ascending: false });
    if (!taskErr && fetchedTasks) {
      tasks = fetchedTasks;
    }
  }

  // Strictly enforce user assignment filtering (ONLY when explicitly filtered by user/assignee)
  tasks = tasks.filter((t: any) => {
    if (filters?.assigneeId) {
      const isAssigned = t.assigned_to === filters.assigneeId || 
                         t.owner_id === filters.assigneeId ||
                         targetAssigneeTaskIds.has(t.id) ||
                         t.assignees?.some((a: any) => a.user_id === filters.assigneeId && a.participation_role !== 'WATCHER');
      if (!isAssigned) return false;
    }
    if (filters?.myTasksOnly) {
      const isMyTask = t.assigned_to === user.id || 
                       t.owner_id === user.id ||
                       myParticipantTaskIds.has(t.id) ||
                       t.assignees?.some((a: any) => a.user_id === user.id && a.participation_role !== 'WATCHER');
      if (!isMyTask) return false;
    }
    return true;
  });

  // 3. Query Workspaces & Sub-Workspaces
  let workspaces: any[] = [];
  if (filters?.entityType !== 'TASKS') {
    let wsQuery = supabaseAdmin
      .from('workspaces')
      .select(`
        id,
        name:workspace_name,
        code:workspace_code,
        description,
        owner_id:workspace_owner_id,
        parent_workspace_id,
        company_id,
        status_id,
        start_date,
        end_date,
        created_at,
        company:company_master(name:company_name),
        status:status_master(name:status_name, status_color),
        hierarchy_task_count,
        hierarchy_subws_count,
        members:workspace_members(user_id, role),
        stats:workspace_statistics(task_count, subtask_count)
      `)
      .in('id', visibleWsIds)
      .eq('is_deleted', false);

    if (cleanQuery) {
      wsQuery = wsQuery.or(`workspace_name.ilike.%${cleanQuery}%,workspace_code.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%`);
    }
    if (filters?.statusId) {
      wsQuery = wsQuery.eq('status_id', filters.statusId);
    }
    if (filters?.dateFrom) {
      wsQuery = wsQuery.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      wsQuery = wsQuery.lte('created_at', filters.dateTo);
    }

    const { data: fetchedWs, error: wsErr } = await wsQuery.order('created_at', { ascending: false });
    if (!wsErr && fetchedWs) {
      workspaces = fetchedWs;
    }

    if (filters?.assigneeId) {
      workspaces = workspaces.filter(w => 
        w.owner_id === filters.assigneeId || 
        w.created_by === filters.assigneeId || 
        w.members?.some((m: any) => m.user_id === filters.assigneeId)
      );
    } else if (filters?.myTasksOnly) {
      workspaces = workspaces.filter(w => 
        w.owner_id === user.id || 
        w.created_by === user.id || 
        w.members?.some((m: any) => m.user_id === user.id)
      );
    }
  }

  if (filters?.entityType === 'WORKSPACES') {
    workspaces = workspaces.filter(w => !w.parent_workspace_id);
  } else if (filters?.entityType === 'SUB_WORKSPACES') {
    workspaces = workspaces.filter(w => !!w.parent_workspace_id);
  }

  // Record direct matches
  tasks.forEach(t => matchedNodeIds.add(t.id));
  workspaces.forEach(w => matchedNodeIds.add(w.id));

  // 4. Resolve complete lineage branches
  const requiredWorkspaceIds = new Set<string>();
  const allTasksMap = new Map<string, any>();

  tasks.forEach(t => {
    allTasksMap.set(t.id, {
      ...t,
      type: t.parent_task_id ? 'SUB_TASK' : 'TASK',
      child_task_count: (Array.isArray(t.subtasks) ? t.subtasks[0]?.count : t.subtasks?.count) || 0,
      children: [],
      childrenFetched: true,
      isMatched: true
    });
    if (t.workspace_id) requiredWorkspaceIds.add(t.workspace_id);
    if (t.parent_task_id) expandedNodeIds.add(t.parent_task_id);
  });

  // Fetch missing parent tasks if any matched tasks are sub-tasks
  const missingParentTaskIds = tasks
    .map(t => t.parent_task_id)
    .filter((id): id is string => !!id && !allTasksMap.has(id));

  if (missingParentTaskIds.length > 0) {
    const { data: parentTasks } = await supabaseAdmin
      .from('tasks')
      .select(`
        id,
        name:subject,
        code:task_code,
        description,
        owner_id,
        assigned_to,
        workspace_id,
        parent_task_id,
        status_id,
        priority_id,
        start_date,
        end_date,
        created_at,
        created_by,
        status:status_master!tasks_status_id_fkey(name:status_name, status_color),
        priority:priority_master!tasks_priority_id_fkey(name:priority_name, priority_color),
        subtasks:tasks!parent_task_id(count),
        parent:tasks!parent_task_id(id, name:subject, code:task_code),
        assignees:task_participants(user_id, participation_role)
      `)
      .in('id', missingParentTaskIds)
      .eq('is_deleted', false);

    (parentTasks || []).forEach((pt: any) => {
      allTasksMap.set(pt.id, {
        ...pt,
        type: pt.parent_task_id ? 'SUB_TASK' : 'TASK',
        child_task_count: (Array.isArray(pt.subtasks) ? pt.subtasks[0]?.count : pt.subtasks?.count) || 0,
        children: [],
        childrenFetched: true,
        isMatched: false
      });
      if (pt.workspace_id) requiredWorkspaceIds.add(pt.workspace_id);
      expandedNodeIds.add(pt.id);
    });
  }

  workspaces.forEach(w => requiredWorkspaceIds.add(w.id));

  // Walk up workspace tree to include all ancestor workspaces up to root
  const allWorkspaceNodesMap = new Map<string, any>();
  const processWorkspaceId = (wsId: string) => {
    let curr = visibleWsMap.get(wsId);
    while (curr) {
      if (!allWorkspaceNodesMap.has(curr.id)) {
        allWorkspaceNodesMap.set(curr.id, {
          ...curr,
          type: curr.parent_workspace_id ? 'SUB_WORKSPACE' : 'WORKSPACE',
          subworkspace_count: curr.hierarchy_subws_count || 0,
          direct_task_count: (Array.isArray(curr.stats) ? curr.stats[0] : curr.stats)?.task_count || 0,
          total_hierarchy_task_count: curr.hierarchy_task_count || 0,
          children: [],
          childrenFetched: true,
          isMatched: matchedNodeIds.has(curr.id)
        });
      }
      if (curr.parent_workspace_id) {
        expandedNodeIds.add(curr.parent_workspace_id);
        curr = visibleWsMap.get(curr.parent_workspace_id);
      } else {
        curr = null;
      }
    }
  };

  requiredWorkspaceIds.forEach(id => processWorkspaceId(id));

  // Auto-expand any workspace that contains matched items
  tasks.forEach(t => {
    if (t.workspace_id) expandedNodeIds.add(t.workspace_id);
  });
  workspaces.forEach(w => {
    if (w.parent_workspace_id) expandedNodeIds.add(w.parent_workspace_id);
  });

  // 5. Assemble the Hierarchy Tree
  allTasksMap.forEach(task => {
    if (task.parent_task_id && allTasksMap.has(task.parent_task_id)) {
      const parent = allTasksMap.get(task.parent_task_id);
      if (!parent.children.some((c: any) => c.id === task.id)) {
        parent.children.push(task);
      }
    }
  });

  allTasksMap.forEach(task => {
    if (!task.parent_task_id && task.workspace_id && allWorkspaceNodesMap.has(task.workspace_id)) {
      const wsNode = allWorkspaceNodesMap.get(task.workspace_id);
      if (!wsNode.children.some((c: any) => c.id === task.id)) {
        wsNode.children.push(task);
      }
    }
  });

  allWorkspaceNodesMap.forEach(wsNode => {
    if (wsNode.parent_workspace_id && allWorkspaceNodesMap.has(wsNode.parent_workspace_id)) {
      const parentWsNode = allWorkspaceNodesMap.get(wsNode.parent_workspace_id);
      if (!parentWsNode.children.some((c: any) => c.id === wsNode.id)) {
        parentWsNode.children.push(wsNode);
      }
    }
  });

  const roots: any[] = [];
  allWorkspaceNodesMap.forEach(wsNode => {
    if (!wsNode.parent_workspace_id || !allWorkspaceNodesMap.has(wsNode.parent_workspace_id)) {
      roots.push(wsNode);
    }
  });

  return {
    hierarchy: roots,
    matchedNodeIds: Array.from(matchedNodeIds),
    expandedNodeIds: Array.from(expandedNodeIds)
  };
}

/**
 * Loads all levels of visible hierarchy (workspaces, sub-workspaces, tasks, subtasks)
 * for instant 1-click Expand All.
 */
export async function fetchAllHierarchyBranches() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { user } = await getCachedUser();
  if (!user) return [];

  const canManageAll = await checkServerPermission(supabase, user.id, "WORKSPACES_MANAGE");
  const visibleWorkspaces = await getVisibleWorkspaces(user.id, canManageAll);
  const visibleWsIds = visibleWorkspaces.map((w: any) => w.id);
  if (visibleWsIds.length === 0) return [];

  // Fetch all tasks for visible workspaces
  const { data: allTasks } = await supabaseAdmin
    .from('tasks')
    .select(`
      id,
      name:subject,
      code:task_code,
      description,
      owner_id,
      assigned_to,
      workspace_id,
      parent_task_id,
      status_id,
      priority_id,
      start_date,
      end_date,
      created_at,
      created_by,
      status:status_master!tasks_status_id_fkey(name:status_name, status_color),
      priority:priority_master!tasks_priority_id_fkey(name:priority_name, priority_color),
      subtasks:tasks!parent_task_id(count),
      parent:tasks!parent_task_id(id, name:subject, code:task_code),
      assignees:task_participants(user_id, participation_role)
    `)
    .in('workspace_id', visibleWsIds)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  const tasksMap = new Map<string, any>();
  (allTasks || []).forEach((t: any) => {
    tasksMap.set(t.id, {
      ...t,
      type: t.parent_task_id ? 'SUB_TASK' : 'TASK',
      child_task_count: (Array.isArray(t.subtasks) ? t.subtasks[0]?.count : t.subtasks?.count) || 0,
      children: [],
      childrenFetched: true
    });
  });

  // Link sub-tasks
  tasksMap.forEach(task => {
    if (task.parent_task_id && tasksMap.has(task.parent_task_id)) {
      tasksMap.get(task.parent_task_id).children.push(task);
    }
  });

  const wsMap = new Map<string, any>();
  visibleWorkspaces.forEach((ws: any) => {
    wsMap.set(ws.id, {
      ...ws,
      type: ws.parent_workspace_id ? 'SUB_WORKSPACE' : 'WORKSPACE',
      subworkspace_count: ws.hierarchy_subws_count || 0,
      direct_task_count: (Array.isArray(ws.stats) ? ws.stats[0] : ws.stats)?.task_count || 0,
      total_hierarchy_task_count: ws.hierarchy_task_count || 0,
      children: [],
      childrenFetched: true
    });
  });

  // Link top-level tasks to workspaces
  tasksMap.forEach(task => {
    if (!task.parent_task_id && task.workspace_id && wsMap.has(task.workspace_id)) {
      wsMap.get(task.workspace_id).children.push(task);
    }
  });

  // Link sub-workspaces to parent workspaces
  wsMap.forEach(wsNode => {
    if (wsNode.parent_workspace_id && wsMap.has(wsNode.parent_workspace_id)) {
      wsMap.get(wsNode.parent_workspace_id).children.push(wsNode);
    }
  });

  // Collect root workspaces
  const roots: any[] = [];
  wsMap.forEach(wsNode => {
    if (!wsNode.parent_workspace_id || !wsMap.has(wsNode.parent_workspace_id)) {
      roots.push(wsNode);
    }
  });

  return roots;
}

export async function updateWorkspace(id: string, formData: any) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { error: "Unauthenticated" };

  // Check if user has global UPDATE permissions via IAM/RBAC
  const canUpdateGlobal = await checkServerPermission(supabase, userId, "WORKSPACES_UPDATE");
  
  let canUpdate = canUpdateGlobal;
  
  // If no global permissions, check if they are the owner of the workspace
  if (!canUpdate) {
    const { data: ws } = await supabaseAdmin.from("workspaces").select("workspace_owner_id").eq("id", id).single();
    if (ws && ws.workspace_owner_id === userId) {
      canUpdate = true;
    }
  }

  if (!canUpdate) {
    await logActivityEvent('WORKSPACE', id, 'UNAUTHORIZED_WORKSPACE_ACTION', null, { action_attempted: 'UPDATE_WORKSPACE' }, userId);
    return { error: "Unauthorized: Missing WORKSPACES_UPDATE capability or owner access." };
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

  // Phase W1: Full descendant validation to prevent cyclical hierarchy loops
  if (updatePayload.parent_workspace_id) {
    const { data: allWs } = await supabaseAdmin
      .from("workspaces")
      .select("id, parent_workspace_id")
      .eq("is_deleted", false);
      
    if (allWs) {
      let currentCheckId = updatePayload.parent_workspace_id;
      let depth = 0;
      let isCycle = false;
      
      while (currentCheckId && depth < 100) {
        if (currentCheckId === id) {
          isCycle = true;
          break;
        }
        const parentNode = allWs.find(w => w.id === currentCheckId);
        currentCheckId = parentNode ? parentNode.parent_workspace_id : null;
        depth++;
      }
      
      if (isCycle) {
        return { error: "Validation Error: Cyclical hierarchy detected. A workspace cannot be assigned as a child of its own descendant." };
      }
    }
  }

  const { data, error } = await supabaseAdmin
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

    // 3. Perform deletes and upserts (Hard delete to fix zombie users in embedded queries)
    const removedUserIds = (existingMembers || []).filter(m => !assigneesArray.includes(m.user_id)).map(m => m.user_id);
    const usersToDelete = (existingMembers || []).filter(m => !assigneesArray.includes(m.user_id)).map(m => m.id);
    if (usersToDelete.length > 0) {
      await supabaseAdmin.from("workspace_members").delete().in("id", usersToDelete);
    }
    
    // Also clean up any previously soft-deleted members for this workspace to fix the bug
    await supabaseAdmin.from("workspace_members").delete().eq("workspace_id", id).eq("is_deleted", true);

    // CASCADE REMOVAL: Automatically remove removed workspace members from all tasks/subtasks in this workspace
    if (removedUserIds.length > 0) {
      try {
        const { data: wsTasks } = await supabaseAdmin
          .from("tasks")
          .select("id")
          .eq("workspace_id", id);
        
        const wsTaskIds = wsTasks?.map(t => t.id) || [];
        if (wsTaskIds.length > 0) {
          await Promise.all([
            supabaseAdmin
              .from("task_participants")
              .delete()
              .in("task_id", wsTaskIds)
              .in("user_id", removedUserIds)
              .eq("participation_role", "WATCHER"),
            supabaseAdmin
              .from("task_watchers")
              .delete()
              .in("task_id", wsTaskIds)
              .in("user_id", removedUserIds)
          ]);
        }
      } catch (cascadeErr) {
        console.warn("[updateWorkspace] Cascade task participant cleanup warning:", cascadeErr);
      }
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

    // Dispatch Notifications for updates if new assignees were provided
    const newAssignees = assigneesArray.filter(uid => !existingMembers?.some((m: any) => m.user_id === uid && !m.is_deleted));

    for (const assigneeId of newAssignees) {
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }
    const userId = user.id;

    const { data: ws } = await supabaseAdmin.from("workspaces").select("workspace_owner_id").eq("id", id).single();
    
    // Check if user has global DELETE permissions via IAM/RBAC
    const canDeleteGlobal = await checkServerPermission(supabase, userId, "WORKSPACES_DELETE");
    const isOwner = ws && ws.workspace_owner_id === userId;
    
    if (!canDeleteGlobal && !isOwner) {
      await logActivityEvent('WORKSPACE', id, 'UNAUTHORIZED_WORKSPACE_ACTION', null, { action_attempted: 'DELETE_WORKSPACE' }, userId);
      return { error: "Unauthorized: Missing WORKSPACES_DELETE capability or owner access." };
    }

    const { success, batchId } = await LifecycleManager.moveToTrash('WORKSPACE', id, userId, "User requested workspace deletion");

    if (!success) {
      return { error: "Failed to move workspace to trash" };
    }

    revalidatePath("/workspaces");
    return { success: true, batchId };
  } catch (err: any) {
    console.error("[Workspaces] Delete error:", err);
    return { error: err.message };
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
    .in("id", userIds)
    .eq("is_deleted", false);
    
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

export async function fetchTasksByWorkspace(workspaceId: string, includeDescendants: boolean = false) {
  const tId = Math.random().toString(36).substr(2, 5);
  console.time(`[PROFILER] fetchTasksByWorkspace_TOTAL_${tId}`);
  try {
    const cookieStore = await cookies();
    const supabaseClient = createClient(cookieStore);
    
    const { data: userData } = await supabaseClient.auth.getUser();
    if (!userData.user) return [];

    const canManageAll = await hasPermission(userData.user.id, "WORKSPACES_MANAGE");
    const supabase = canManageAll ? supabaseAdmin : supabaseClient;

    // Get Hierarchy
    let targetWorkspaceIds = [workspaceId];
    if (includeDescendants) {
      console.log(`[PROFILER] Hierarchy_CTE_Start_${tId}`);
      console.time(`[PROFILER] Hierarchy_CTE_Duration_${tId}`);
      targetWorkspaceIds = await HierarchyManager.getDescendants('WORKSPACE', workspaceId);
      console.timeEnd(`[PROFILER] Hierarchy_CTE_Duration_${tId}`);
      console.log(`[PROFILER] Hierarchy_CTE_End_${tId}`);
    }
  
    let query = supabase
      .from("tasks")
      .select(`
        id, subject, task_code, created_at, updated_at, start_date, end_date, status_id, priority_id, workspace_id, created_by, assigned_to, parent_task_id, is_deleted, custom_fields,
        title:subject,
        status:status_master(name:status_name, code:status_code, status_color, is_closed, is_terminal),
        priority:priority_master(name:priority_name, code:priority_code, priority_color),
        department:departments(id, name),
        participants:task_participants(user_id, participation_role),
        workspace:workspaces(id, name:workspace_name, code:workspace_code, parent_workspace_id)
      `)
      .in("workspace_id", targetWorkspaceIds)
      .eq("is_deleted", false);

    if (!canManageAll) {
      const visibleWorkspaces = await getVisibleWorkspaces(userData.user.id);
      const visibleWsIds = visibleWorkspaces.map((w: any) => w.id);

      const { data: partData } = await supabaseAdmin.from("task_participants").select("task_id").eq("user_id", userData.user.id);
      const partTaskIds = partData ? partData.map((p: any) => p.task_id) : [];

      if (visibleWsIds.length > 0 && partTaskIds.length > 0) {
        query = query.or(`workspace_id.in.(${visibleWsIds.join(',')}),id.in.(${partTaskIds.join(',')}),assigned_to.eq.${userData.user.id},owner_id.eq.${userData.user.id}`);
      } else if (visibleWsIds.length > 0) {
        query = query.or(`workspace_id.in.(${visibleWsIds.join(',')}),assigned_to.eq.${userData.user.id},owner_id.eq.${userData.user.id}`);
      } else if (partTaskIds.length > 0) {
        query = query.or(`id.in.(${partTaskIds.join(',')}),assigned_to.eq.${userData.user.id},owner_id.eq.${userData.user.id}`);
      } else {
        query = query.or(`assigned_to.eq.${userData.user.id},owner_id.eq.${userData.user.id}`);
      }
    }

    const { data: workspaceTasks, error: tasksError } = await query
      .order("created_at", { ascending: false });

    if (tasksError) {
      console.error("[Workspaces] Error fetching tasks by workspace:", tasksError);
      return [];
    }

    if (workspaceTasks && workspaceTasks.length > 0) {
      // Missing relationships like sub_workspaces or parent tasks that couldn't be efficiently queried deeply
      const wsIds = Array.from(new Set(workspaceTasks.map((t: any) => t.workspace?.parent_workspace_id).filter(Boolean)));
      
      let parentWorkspaces: any[] = [];
      if (wsIds.length > 0) {
        const { data: pWs } = await supabaseAdmin.from("workspaces").select("id, name:workspace_name, code:workspace_code").in("id", wsIds);
        if (pWs) parentWorkspaces = pWs;
      }
      
      const userIds = new Set<string>();
      workspaceTasks.forEach((t: any) => {
        if (t.created_by) userIds.add(t.created_by);
        if (t.assigned_to) userIds.add(t.assigned_to);
        if (t.participants) t.participants.forEach((p: any) => userIds.add(p.user_id));
      });
      let userMap: Record<string, any> = {};
      if (userIds.size > 0) {
        const { data: usersData } = await supabaseAdmin.from("user_master").select("id, full_name, profile_photo, manager_id").in("id", Array.from(userIds));
        if (usersData) usersData.forEach((u: any) => userMap[u.id] = u);
      }

      const taskIds = workspaceTasks.map((t: any) => t.id);
      const [checklistsData, attachmentsData, commentsData] = await Promise.all([
        supabaseAdmin.from("task_checklists").select("task_id, is_completed").in("task_id", taskIds),
        supabaseAdmin.from("task_attachments").select("task_id").in("task_id", taskIds),
        supabaseAdmin.from("task_comments").select("task_id").in("task_id", taskIds)
      ]);

      const checklistMap: Record<string, any[]> = {};
      if (checklistsData.data) checklistsData.data.forEach((c: any) => { if (!checklistMap[c.task_id]) checklistMap[c.task_id] = []; checklistMap[c.task_id].push(c); });

      const attachmentCountMap: Record<string, number> = {};
      if (attachmentsData.data) attachmentsData.data.forEach((a: any) => { attachmentCountMap[a.task_id] = (attachmentCountMap[a.task_id] || 0) + 1; });

      const commentCountMap: Record<string, number> = {};
      if (commentsData.data) commentsData.data.forEach((c: any) => { commentCountMap[c.task_id] = (commentCountMap[c.task_id] || 0) + 1; });

      workspaceTasks.forEach((t: any) => {
        // Fix up workspace mapping
        if (t.workspace && t.workspace.parent_workspace_id) {
          const parentWs = parentWorkspaces.find((w: any) => w.id === t.workspace.parent_workspace_id);
          t.sub_workspace = t.workspace;
          if (parentWs) t.workspace = parentWs;
        } else {
          t.sub_workspace = null;
        }

        t.assignees = []; // Implicitly workspace members

        t.checklists = checklistMap[t.id] || [];
        t.attachmentCount = attachmentCountMap[t.id] || 0;
        t.commentCount = commentCountMap[t.id] || 0;

        t.creator = userMap[t.created_by] || null;
        t.assignee = userMap[t.assigned_to] || null;

        // Map Participants
        t.executors = [];
        t.reviewers = [];
        if (t.participants) {
          t.participants.forEach((p: any) => {
            const u = userMap[p.user_id];
            if (p.participation_role === "EXECUTOR" && u) t.executors.push(u);
            if ((p.participation_role === "REVIEWER" || p.participation_role === "WATCHER") && u) t.reviewers.push(u);
          });
        }

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

    // Also fetch parent tasks for sub-tasks
    const subTasks = workspaceTasks?.filter(t => t.parent_task_id) || [];
    if (subTasks.length > 0) {
      const parentIds = Array.from(new Set(subTasks.map(t => t.parent_task_id)));
      const { data: parentTasks } = await supabaseAdmin.from("tasks").select("id, subject, task_code").in("id", parentIds);
      if (parentTasks) {
        const taskMap = new Map(parentTasks.map(t => [t.id, { id: t.id, title: t.subject, code: t.task_code }]));
        workspaceTasks?.forEach(t => {
          if (t.parent_task_id && taskMap.has(t.parent_task_id)) {
            (t as any).parent_task = taskMap.get(t.parent_task_id);
          }
        });
      }
    }
    
    return workspaceTasks || [];
  } finally {
    console.timeEnd(`[PROFILER] fetchTasksByWorkspace_TOTAL_${tId}`);
  }
}


export async function fetchAllTasks() {
  const cookieStore = await cookies();
  const supabaseClient = createClient(cookieStore);

  // Get current user
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return [];

  const canManageAll = await hasPermission(user.id, "WORKSPACES_MANAGE");
  const supabase = canManageAll ? supabaseAdmin : supabaseClient;

  // Fetch workspaces the user has access to
  const visibleWorkspaces = await getVisibleWorkspaces(user.id);
  const visibleWsIds = visibleWorkspaces.map((w: any) => w.id);

  // Fetch task IDs where user is a participant
  const { data: partData } = await supabaseAdmin.from("task_participants").select("task_id").eq("user_id", user.id);
  const partTaskIds = partData ? partData.map((p: any) => p.task_id) : [];

  let query = supabase
    .from("tasks")
    .select(`
      id, subject, task_code, created_at, updated_at, start_date, end_date, status_id, priority_id, workspace_id, created_by, assigned_to, parent_task_id, is_deleted, custom_fields,
      title:subject,
      status:status_master(name:status_name, code:status_code, status_color, is_closed, is_terminal),
      priority:priority_master(name:priority_name, code:priority_code, priority_color),
      department:departments(id, name),
      participants:task_participants(user_id, participation_role),
      workspace:workspaces(id, name:workspace_name, code:workspace_code, parent_workspace_id)
    `)
    .eq("is_deleted", false);

  if (visibleWsIds.length > 0 && partTaskIds.length > 0) {
    query = query.or(`workspace_id.in.(${visibleWsIds.join(',')}),id.in.(${partTaskIds.join(',')}),assigned_to.eq.${user.id},owner_id.eq.${user.id}`);
  } else if (visibleWsIds.length > 0) {
    query = query.or(`workspace_id.in.(${visibleWsIds.join(',')}),assigned_to.eq.${user.id},owner_id.eq.${user.id}`);
  } else if (partTaskIds.length > 0) {
    query = query.or(`id.in.(${partTaskIds.join(',')}),assigned_to.eq.${user.id},owner_id.eq.${user.id}`);
  } else {
    query = query.or(`assigned_to.eq.${user.id},owner_id.eq.${user.id}`);
  }

  const { data: allTasks, error: tasksError } = await query.order("created_at", { ascending: false });

  if (tasksError) {
    console.error("[Workspaces] Error fetching all tasks:", tasksError);
    return [];
  }
  
  if (allTasks && allTasks.length > 0) {
      const wsIds = Array.from(new Set(allTasks.map((t: any) => t.workspace?.parent_workspace_id).filter(Boolean)));
      
      let parentWorkspaces: any[] = [];
      if (wsIds.length > 0) {
        const { data: pWs } = await supabaseAdmin.from("workspaces").select("id, name:workspace_name, code:workspace_code").in("id", wsIds);
        if (pWs) parentWorkspaces = pWs;
      }
      
      const userIds = new Set<string>();
      allTasks.forEach((t: any) => {
        if (t.created_by) userIds.add(t.created_by);
        if (t.assigned_to) userIds.add(t.assigned_to);
        if (t.participants) t.participants.forEach((p: any) => userIds.add(p.user_id));
      });
      let userMap: Record<string, any> = {};
      if (userIds.size > 0) {
        const { data: usersData } = await supabaseAdmin.from("user_master").select("id, full_name, profile_photo, manager_id").in("id", Array.from(userIds));
        if (usersData) usersData.forEach((u: any) => userMap[u.id] = u);
      }

      const taskIds = allTasks.map((t: any) => t.id);
      const [checklistsData, attachmentsData, commentsData] = await Promise.all([
        supabaseAdmin.from("task_checklists").select("task_id, is_completed").in("task_id", taskIds),
        supabaseAdmin.from("task_attachments").select("task_id").in("task_id", taskIds),
        supabaseAdmin.from("task_comments").select("task_id").in("task_id", taskIds)
      ]);

      const checklistMap: Record<string, any[]> = {};
      if (checklistsData.data) checklistsData.data.forEach((c: any) => { if (!checklistMap[c.task_id]) checklistMap[c.task_id] = []; checklistMap[c.task_id].push(c); });

      const attachmentCountMap: Record<string, number> = {};
      if (attachmentsData.data) attachmentsData.data.forEach((a: any) => { attachmentCountMap[a.task_id] = (attachmentCountMap[a.task_id] || 0) + 1; });

      const commentCountMap: Record<string, number> = {};
      if (commentsData.data) commentsData.data.forEach((c: any) => { commentCountMap[c.task_id] = (commentCountMap[c.task_id] || 0) + 1; });
        
      allTasks.forEach((t: any) => {
        if (t.workspace && t.workspace.parent_workspace_id) {
          const parentWs = parentWorkspaces.find((w: any) => w.id === t.workspace.parent_workspace_id);
          t.sub_workspace = t.workspace;
          if (parentWs) t.workspace = parentWs;
        } else {
          t.sub_workspace = null;
        }

        t.assignees = []; // Implicitly workspace members

        t.checklists = checklistMap[t.id] || [];
        t.attachmentCount = attachmentCountMap[t.id] || 0;
        t.commentCount = commentCountMap[t.id] || 0;

        t.creator = userMap[t.created_by] || null;
        t.assignee = userMap[t.assigned_to] || null;

        // Map Participants
        t.executors = [];
        t.reviewers = [];
        if (t.participants) {
          t.participants.forEach((p: any) => {
            const u = userMap[p.user_id];
            if (p.participation_role === "EXECUTOR" && u) t.executors.push(u);
            if ((p.participation_role === "REVIEWER" || p.participation_role === "WATCHER") && u) t.reviewers.push(u);
          });
        }

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
