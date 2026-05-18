"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { dispatchNotification } from "@/lib/actions/notifications";

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
    
  if (error) console.error("Error fetching companies:", error);
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
    
  if (error) console.error("Error fetching priorities:", error);
  return data || [];
}

export async function createWorkspace(formData: any) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  
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
    console.error("[Workspaces] Error creating workspace:", error);
    throw new Error(error.message);
  }

  // Auto-enroll the creator as a manager
  await supabase.from("workspace_members").insert([{
    workspace_id: data.id,
    user_id: userId,
    role: 'manager'
  }]);

  return data;
}

export async function fetchWorkspaces() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  // Fetch workspaces with membership info then enforce strict visibility server-side
  const { data, error } = await supabase
    .from("workspaces")
    .select("*, status:workflow_states(name, code), company:companies(name, code), priority:master_priorities(name, code), department:departments(name, code, scope_id), workspace_members(user_id), workspace_teams(team_id)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Workspaces] Error fetching workspaces:", error);
    return [];
  }

  const all = data || [];

  // Enforce isolation: only return workspaces where user is owner, enrolled member, or enrolled via team or task assignee
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];

    // Run direct reports, team, and assignee checks in parallel
    const [tmRes, directTasksRes, assigneeTasksRes] = await Promise.all([
      supabase.from("team_members").select("team_id").eq("user_id", userId),
      supabase.from("workspace_tasks").select("workspace_id").eq("assignee_id", userId).eq("is_deleted", false),
      supabase.from("task_assignees").select("task:workspace_tasks(workspace_id)").eq("user_id", userId)
    ]);

    const myTeamIds = (tmRes.data || []).map((r: any) => r.team_id);
    const directTasks = directTasksRes.data || [];
    const assigneeTasks = assigneeTasksRes.data || [];

    const assignedWorkspaceIds = new Set();
    (directTasks || []).forEach((t: any) => {
      if (t.workspace_id) assignedWorkspaceIds.add(t.workspace_id);
    });
    (assigneeTasks || []).forEach((ta: any) => {
      if (ta.task?.workspace_id) assignedWorkspaceIds.add(ta.task.workspace_id);
    });

    const filtered = all.map((w: any) => {
      const isOwner = w.owner_id === userId;
      const isMember = w.workspace_members?.some((m: any) => m.user_id === userId);
      const isTeamEnrolled = w.workspace_teams?.some((wt: any) => myTeamIds.includes(wt.team_id));
      const hasAssignedTasks = assignedWorkspaceIds.has(w.id);

      if (isOwner || isMember || isTeamEnrolled || hasAssignedTasks) {
        return {
          ...w,
          has_assigned_tasks: hasAssignedTasks
        };
      }
      return null;
    }).filter(Boolean);

    return filtered;
  } catch (e) {
    console.error("Error enforcing workspace visibility:", e);
    return all;
  }
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

  // 2. Run all initial database queries in parallel on the server
  const [profileRes, managedDeptsRes, workspaces, companies, priorities] = await Promise.all([
    supabase.from("user_master").select("*, department:departments(*)").eq("id", user.id).single(),
    supabase.from("departments").select("id").eq("manager_id", user.id),
    fetchWorkspaces(),
    fetchCompanies(),
    fetchPriorities()
  ]);

  const profile = profileRes.data;
  const managedDepts = managedDeptsRes.data;
  const managedDeptIds = managedDepts?.map((d: any) => d.id) || [];
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
}

export async function updateWorkspace(id: string, formData: any) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
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

  // For non-admin users, enforce strict visibility rules:
  // 1. Tasks created by user
  // 2. Tasks assigned to user (direct assignee_id or in task_assignees)
  // 3. Tasks assigned to users that this user manages (not just same department)

  // Get user's direct reports (users managed by this user)
  const { data: directReports } = await supabase
    .from("user_master")
    .select("id")
    .eq("manager_id", user.id);

  const directReportIds = (directReports || []).map((u: any) => u.id);

  // Fetch all tasks and filter on this server
  const { data: allTasks, error: tasksError } = await supabase
    .from("workspace_tasks")
    .select(`
      *,
      workspace:workspaces(id, name, code),
      status:workflow_states(name, code),
      priority:master_priorities(name, code),
      assignee:user_master!assignee_id(id, full_name, profile_photo),
      assignees:task_assignees(user:user_master(id, full_name, profile_photo)),
      parent_task:workspace_tasks!parent_task_id(id, code, title)
    `)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (tasksError) {
    console.error("[Workspaces] Error fetching all tasks:", tasksError);
    return [];
  }

  const tasks = allTasks || [];

  // Filter tasks based on visibility rules
  const visibleTasks = tasks.filter((task: any) => {
    // Rule 1: User is creator
    if (task.creator_id === user.id) return true;

    // Rule 2: User is primary assignee
    if (task.assignee_id === user.id) return true;

    // Rule 3: User is in secondary assignees list
    if (Array.isArray(task.assignees) && task.assignees.some((a: any) => a.user?.id === user.id)) {
      return true;
    }

    // Rule 4: User is a direct manager of the assigned user
    if (task.assignee_id && directReportIds.includes(task.assignee_id)) return true;

    if (Array.isArray(task.assignees)) {
      for (const assignee of task.assignees) {
        if (assignee.user?.id && directReportIds.includes(assignee.user.id)) {
          return true;
        }
      }
    }

    return false;
  });

  return visibleTasks;
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
