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

export async function fetchPriorities(workspaceId?: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  let query = supabase
    .from("priority_master")
    .select("id, name:priority_name, code:priority_code, scope_id")
    .eq('is_active', true)
    .eq('is_deleted', false);
    
  if (workspaceId) {
    query = query.or(`scope_id.eq.${workspaceId},scope_id.is.null`);
  } else {
    query = query.is('scope_id', null);
  }
    
  const { data, error } = await query;
  if (error) console.error(`[fetchPriorities] Error: ${error.message}`);
  
  let results = data || [];
  if (workspaceId && results.length > 0) {
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

export async function fetchStatusesByScope(scopeType: string, workspaceId?: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  let query = supabase
    .from("status_master")
    .select("id, name:status_name, code:status_code, scope_id, status_order")
    .eq('is_active', true)
    .eq('is_deleted', false)
    .eq('scope_type', scopeType);
    
  if (workspaceId) {
    query = query.or(`scope_id.eq.${workspaceId},scope_id.is.null`);
  } else {
    query = query.is('scope_id', null);
  }

  const { data, error } = await query;
  if (error) console.error(`[fetchStatusesByScope] Error: ${error.message}`);
  
  let results = data || [];
  if (workspaceId && results.length > 0) {
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
        workspace_code: formData.code || `WS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        description: formData.description,
        company_id: formData.company_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status_id: statusId,
        workspace_owner_id: userId,
        parent_workspace_id: formData.parent_workspace_id || null
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

    const hasAccess = await checkServerPermission(supabase, user.id, "WORKSPACES_VIEW");
    if (!hasAccess) {
      return {
        userProfile: null,
        workspaces: [],
        companies: [],
        priorities: [],
        prefetchWorkspaceId: null,
        prefetchTasks: [],
        prefetchStakeholders: [],
        users: [],
        teams: []
      };
    }

    // 2. Fetch everything in a massive parallel burst
    const [profileRes, managedDeptsRes, workspaces, companies, priorities] = await Promise.all([
      supabase.from("user_master").select("id, full_name, email, role_id, department_id, designation_id, manager_id, is_active, created_at, updated_at").eq("id", user.id).single(),
      supabase.from("departments").select("id").eq("manager_id", user.id),
      getVisibleWorkspaces(user.id), // Direct fast repository call
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

    // Fetch the new master hierarchy for the Tabular List
    const masterHierarchy = await fetchMasterHierarchy();

    // Fetch Task Statuses for inline editing
    const { getTaskStatuses } = await import('@/lib/actions/tasks');
    const taskStatuses = await getTaskStatuses();

    // Fetch all assignable users for mapping names and avatars
    const allUsers = await fetchAssignableUsers();

    return {
      userProfile,
      workspaces,
      companies,
      priorities,
      prefetchWorkspaceId: activeWSId,
      prefetchTasks,
      prefetchStakeholders,
      masterHierarchy,
      taskStatuses,
      allUsers
    };
  } catch (err: any) {
    console.error("[fetchWorkspaceDashboardData] Error:", err?.message || String(err));
    throw new Error(err?.message || "Failed to load workspace dashboard");
  }
}

export async function fetchMasterHierarchy() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  // 1. Fetch ALL Visible Workspaces (roots and children)
  const visibleWorkspaces = await getVisibleWorkspaces(userId);
  const wsIds = visibleWorkspaces.map((w: any) => w.id);
  
  if (wsIds.length === 0) return [];

  // 1.5 Efficiently fetch task counts for these workspaces using HEAD counts
  const taskCountMap = new Map<string, number>();
  const chunkSize = 15;
  for (let i = 0; i < wsIds.length; i += chunkSize) {
    const chunk = wsIds.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (wsId) => {
      const { count } = await supabaseAdmin
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wsId)
        .eq('is_deleted', false);
      taskCountMap.set(wsId, count || 0);
    }));
  }

  // 2. Assemble Infinite Workspace Tree via Adjacency List
  const workspaceMap = new Map();
  visibleWorkspaces.forEach((ws: any) => {
    workspaceMap.set(ws.id, { 
      ...ws, 
      type: ws.parent_workspace_id ? 'SUB_WORKSPACE' : 'WORKSPACE', 
      direct_task_count: taskCountMap.get(ws.id) || 0, // Re-enabled fast counting
      total_hierarchy_task_count: 0,
      children: [] 
    });
  });

  const rootNodes: any[] = [];

  // 3. Build the recursive tree (Workspace -> Child Workspace)
  workspaceMap.forEach(wsNode => {
    if (wsNode.parent_workspace_id && workspaceMap.has(wsNode.parent_workspace_id)) {
      const parent = workspaceMap.get(wsNode.parent_workspace_id);
      parent.children.push(wsNode);
    } else {
      rootNodes.push(wsNode);
    }
  });

  // 4. Post-order traversal to calculate total counts with loop detection
  const visited = new Set<string>();
  const calculateTotalTasks = (node: any): number => {
    if (visited.has(node.id)) {
      console.warn(`[Workspaces] Cyclical loop detected at workspace ${node.id}`);
      return 0; // Break the infinite loop
    }
    visited.add(node.id);

    let total = node.direct_task_count;
    let childTaskCount = 0;
    
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.type === 'SUB_WORKSPACE' || child.type === 'WORKSPACE') {
           const cTotal = calculateTotalTasks(child);
           childTaskCount += cTotal;
        }
      }
    }
    
    node.child_task_count = childTaskCount;
    node.total_hierarchy_task_count = total + childTaskCount;
    return node.total_hierarchy_task_count;
  };

  rootNodes.forEach(root => {
    visited.clear();
    calculateTotalTasks(root);
  });

  return rootNodes;
}

export async function updateWorkspace(id: string, formData: any) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Unauthenticated");

  const hasAccess = await checkServerPermission(supabase, userId, "WORKSPACES_UPDATE");
  
  // Check if user is a member of the workspace
  const { data: member } = await supabaseAdmin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!hasAccess && !member) {
    throw new Error("Unauthorized: Missing WORKSPACES_UPDATE capability or workspace membership.");
  }

  const updatePayload = {
    workspace_name: formData.name,
    description: formData.description,
    company_id: formData.company_id,
    start_date: formData.start_date,
    end_date: formData.end_date,
    parent_workspace_id: formData.parent_workspace_id !== undefined ? formData.parent_workspace_id : undefined,
  };

  // Prevent cyclical assignments: Workspace cannot be its own parent
  if (updatePayload.parent_workspace_id === id) {
    throw new Error("Validation Error: A workspace cannot be assigned as its own parent.");
  }

  const { data, error } = await supabase
    .from("workspaces")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();
    
  if (error) {
    console.error("[Workspaces] Error updating workspace:", error);
    throw new Error(error.message);
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
    .update({ is_deleted: true })
    .eq("id", id);
    
  if (error) {
    console.error("[Workspaces] Error deleting workspace:", error);
    throw new Error(error.message);
  }

  revalidatePath("/workspaces");
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
    .select(`
      id, full_name, user_code, 
      designation:designations(name), 
      department:departments(name)
    `)
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

export async function createTask(formData: any) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  
  let status_id = formData.status_id;
  if (!status_id) {
    try {
    const { data: status } = await supabase
      .from("status_master")
      .select("id")
      .eq("status_code", "ST_OPEN")
      .single();
    status_id = status?.id;
    if (!status_id) {
      const { data: fallback } = await supabaseAdmin.from("status_master").select("id").limit(1);
      status_id = fallback?.[0]?.id || null;
    }
    } catch (e) {
      const { data: fallback } = await supabaseAdmin.from("status_master").select("id").limit(1);
      status_id = fallback?.[0]?.id || null;
    }
  }

  const {
    checklist_items,
    attachments,
    parent_task_id,
    participants,
    ...taskFields
  } = formData;

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

  let priority_id = taskFields.priority_id;
  if (!priority_id) {
    const { data: defaultPriority } = await supabase.from('priority_master').select('id').eq('priority_code', 'PR_MEDIUM').single();
    if (defaultPriority) priority_id = defaultPriority.id;
    else {
      const { data: anyPriority } = await supabase.from('priority_master').select('id').limit(1).single();
      priority_id = anyPriority?.id || null;
    }
  }

  // Calculate Turnaround Time (TAT) if start and end dates are provided
  let tatDays = null;
  if (taskFields.start_date && taskFields.end_date) {
    const start = new Date(taskFields.start_date);
    const end = new Date(taskFields.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    tatDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert([{
      subject: taskFields.title || "Untitled Task",
      description: taskFields.description || null,
      workspace_id: formData.workspace_id,
      priority_id: priority_id,
      start_date: taskFields.start_date || null,
      end_date: taskFields.end_date || null,
      status_id: status_id,
      created_by: userId,
      assigned_to: taskFields.assigned_to || null,
      owner_id: taskFields.assigned_to || null,
      sprint_id: taskFields.sprint_id || null,
      template_id: taskFields.template_id || null,
      custom_fields: { ...taskFields.custom_fields, tat_days: tatDays }
    }])
    .select()
    .single();
    
  if (error) {
    console.error("[Workspaces] Error creating task:", error);
    throw new Error(error.message);
  }

  // Insert dependency if there is a parent task
  if (parent_task_id) {
     const { error: depErr } = await supabase.from("task_dependencies").insert([{
        task_id: data.id,
        depends_on_task_id: parent_task_id,
        dependency_type: 'BLOCKS'
     }]);
     if (depErr) console.error("Error linking parent task:", depErr);
  }

  // Insert Task Participants
  if (participants && Array.isArray(participants) && participants.length > 0) {
    const participantPayload = participants.map((p: any) => ({
      task_id: data.id,
      user_id: p.user_id,
      participation_role: p.participation_role
    }));
    const { error: partErr } = await supabaseAdmin.from("task_participants").upsert(participantPayload, { onConflict: 'task_id, user_id' });
    if (partErr) console.error("[Workspaces] Error inserting task participants:", partErr);
  }

  // Insert checklist entries
  if (checklistArray.length > 0) {
    const checklistPayload = checklistArray.map((title: string) => ({
      task_id: data.id,
      label: title,
      is_completed: false
    }));
    const { error: checklistError } = await supabase.from("task_checklists").insert(checklistPayload);
    if (checklistError) {
      console.error("[Workspaces] Error inserting task checklist items:", checklistError);
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
    // Note: Assuming there is a task_attachments table based on the previous code, or we should use whatever was there.
    const { error: attachmentError } = await supabase.from("task_attachments").insert(attachmentPayload);
    if (attachmentError) {
      console.error("[Workspaces] Error inserting task attachments:", attachmentError);
    }
  }

  // Trigger notification for the workspace (all members will see the task on their dashboard)
  try {
     const { data: members } = await supabase.from("workspace_members").select("user_id").eq("workspace_id", formData.workspace_id);
     if (members) {
       const notifications = members
         .filter(m => m.user_id !== userId)
         .map(m => dispatchNotification(m.user_id, "New Task in Workspace", `A new task was created in your workspace: ${data.subject || data.id}`, `/workspaces?task=${data.id}`));
       
       Promise.all(notifications).catch(e => console.error("Notification dispatch failed:", e));
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
    .from("tasks")
    .select(`
      *,
      title:subject,
      status:status_master(name:status_name, code:status_code, status_color),
      priority:priority_master(name:priority_name, code:priority_code)
    `)
    .eq("workspace_id", workspaceId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });
    
  if (error) {
    console.error("[Workspaces] Error fetching tasks:", error);
    return [];
  }
  
  if (data && data.length > 0) {
    const taskIds = data.map((t: any) => t.id);
    
    // Fetch task participants
    const { data: participantsData } = await supabase
      .from('task_participants')
      .select('*, user:user_master(id, full_name, profile_photo)')
      .in('task_id', taskIds);
      
    const participantsMap = new Map();
    (participantsData || []).forEach(p => {
      if (!participantsMap.has(p.task_id)) participantsMap.set(p.task_id, []);
      participantsMap.get(p.task_id).push(p);
    });

    data.forEach((t: any) => {
      t.workspace = null;
      t.creator = null;
      t.participants = participantsMap.get(t.id) || [];
      t.assignees = t.participants.map((p: any) => ({ ...p.user, role: p.participation_role }));
      
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
    start_date: formData.start_date,
    end_date: formData.end_date,
    status: formData.status || 'PLANNING',
    created_by: user.id
  }]).select().single();

  if (error) throw error;
  return data;
}

export async function fetchSprints(workspaceId: string) {
  const { data, error } = await supabaseAdmin.from("sprints")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("start_date", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function updateSprint(id: string, formData: any) {
  const { data, error } = await supabaseAdmin.from("sprints")
    .update({
      name: formData.name,
      goal: formData.goal,
      start_date: formData.start_date,
      end_date: formData.end_date,
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
    default_priority_id: formData.default_priority_id,
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
