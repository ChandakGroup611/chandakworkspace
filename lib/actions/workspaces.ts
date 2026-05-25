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

export async function fetchPriorities() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("priority_master")
    .select("id, name:priority_name, code:priority_code")
    .eq('is_active', true)
    .eq('is_deleted', false);
    
  if (error) console.error(`[fetchPriorities] Error: ${error.message}`);
  return data || [];
}

export async function fetchStatusesByScope(scopeType: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("status_master")
    .select("id, name:status_name, code:status_code")
    .eq('is_active', true)
    .eq('is_deleted', false)
    .eq('scope_type', scopeType)
    .order("status_order", { ascending: true });
    
  if (error) console.error(`[fetchStatusesByScope] Error: ${error.message}`);
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

    // Insert assignees and teams
    const assigneesArray = Array.from(new Set([userId, ...(formData.assigneeIds || [])])).filter(Boolean) as string[];
    const teamsArray = Array.from(new Set(formData.teamIds || [])).filter(Boolean) as string[];

    if (assigneesArray.length > 0) {
      await supabaseAdmin.from("workspace_members").insert(
        assigneesArray.map((id: string) => ({
          workspace_id: data.id,
          user_id: id,
          role: id === userId ? 'manager' : 'member'
        }))
      );
    }

    if (teamsArray.length > 0) {
      await supabaseAdmin.from("workspace_teams").insert(
        teamsArray.map((id: string) => ({
          workspace_id: data.id,
          team_id: id
        }))
      );
    }

    // 4. Dispatch Notifications
    // Do not notify the creator for their own creation unless specifically desired, but here we notify all assignees except maybe the creator.
    for (const assigneeId of assigneesArray) {
      if (assigneeId === userId) continue; // Skip notifying the user who just created it

      const isSub = !!formData.parent_workspace_id;
      const title = isSub ? "Assigned to New Sub-Workspace" : "Assigned to New Workspace";
      const message = `You have been assigned to the ${isSub ? 'Sub-Workspace' : 'Workspace'}: "${data.workspace_name}" (${data.workspace_code}).`;
      
      await dispatchNotification(
        assigneeId,
        title,
        message,
        `/workspaces` // The frontend handles active workspace via query or memory
      );
    }

    revalidatePath("/workspaces");

    // Map to frontend expected shape
    return {
      ...data,
      name: data.workspace_name,
      code: data.workspace_code,
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

    // 2. Run all initial database queries in parallel on the server
    const [profileRes, managedDeptsRes, workspaces, companies, priorities, usersRes, teamsRes] = await Promise.all([
      supabase.from("user_master").select("id, full_name, email, profile_photo, role_id, department_id, designation_id, manager_id, is_active, created_at, updated_at, department:departments(id, name)").eq("id", user.id).single(),
      supabase.from("departments").select("id").eq("manager_id", user.id),
      fetchWorkspaces(),
      fetchCompanies(),
      fetchPriorities(),
      supabaseAdmin.from("user_master").select("id, full_name, user_code, profile_photo").eq("is_deleted", false).order("full_name", { ascending: true }),
      supabaseAdmin.from("team_master").select("id, team_name").eq("is_deleted", false).order("team_name", { ascending: true })
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
      prefetchStakeholders,
      users: usersRes.data || [],
      teams: teamsRes.data || []
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

  const updatePayload = {
    workspace_name: formData.name,
    description: formData.description,
    company_id: formData.company_id,
    start_date: formData.start_date,
    end_date: formData.end_date,
    parent_workspace_id: formData.parent_workspace_id !== undefined ? formData.parent_workspace_id : undefined,
  };

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
    const assigneesArray = Array.from(new Set(formData.assigneeIds)).filter(Boolean);
    await supabaseAdmin.from("workspace_members").delete().eq("workspace_id", id);
    if (assigneesArray.length > 0) {
      await supabaseAdmin.from("workspace_members").insert(
        assigneesArray.map((uid: any) => ({
          workspace_id: id,
          user_id: uid,
          role: 'member'
        }))
      );
    }
  }

  if (formData.teamIds !== undefined) {
    const teamsArray = Array.from(new Set(formData.teamIds)).filter(Boolean);
    await supabaseAdmin.from("workspace_teams").delete().eq("workspace_id", id);
    if (teamsArray.length > 0) {
      await supabaseAdmin.from("workspace_teams").insert(
        teamsArray.map((tid: any) => ({
          workspace_id: id,
          team_id: tid
        }))
      );
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
    .delete()
    .eq("id", id);
    
  if (error) {
    console.error("[Workspaces] Error deleting workspace:", error);
    throw new Error(error.message);
  }

  revalidatePath("/workspaces");
}

export async function fetchWorkspaceStakeholders(workspaceId: string) {
  // 1. Fetch the raw members
  const { data: members, error: memError } = await supabaseAdmin
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspaceId);
    
  if (memError || !members || members.length === 0) {
    if (memError) console.error("[Workspaces] Error fetching stakeholders:", memError);
    return [];
  }
  
  // 2. Fetch the rich user details
  const userIds = members.map(m => m.user_id);
  const { data: users, error: userError } = await supabaseAdmin
    .from("user_master")
    .select("id, full_name, user_code, profile_photo, designation:designations(name), department:departments(name)")
    .in("id", userIds);
    
  if (userError || !users) {
    console.error("[Workspaces] Error fetching users for stakeholders:", userError);
    return [];
  }

  // 3. Map them together
  return users.map(user => {
    const mem = members.find(m => m.user_id === user.id);
    return {
      ...user,
      workspace_role: mem?.role || 'MEMBER'
    };
  });
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
       for (const m of members) {
         if (m.user_id !== userId) {
            await dispatchNotification(m.user_id, "New Task in Workspace", `A new task was created in your workspace: ${data.subject || data.id}`, `/workspaces?task=${data.id}`);
         }
       }
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
    const wsIds = Array.from(new Set(data.map((t: any) => t.workspace_id).filter(Boolean)));
    const creatorIds = Array.from(new Set(data.map((t: any) => t.created_by).filter(Boolean)));
    
    const [
      { data: workspaces },
      { data: users }
    ] = await Promise.all([
      supabaseAdmin.from("workspaces").select("id, name:workspace_name, code:workspace_code").in("id", wsIds),
      supabaseAdmin.from("user_master").select("id, full_name, profile_photo, manager_id").in("id", creatorIds)
    ]);
      
    data.forEach((t: any) => {
      t.workspace = workspaces?.find((w: any) => w.id === t.workspace_id) || null;
      t.creator = users?.find((u: any) => u.id === t.created_by) || null;
      t.assignees = []; // Assignees are implicitly workspace members now
      
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
  
  return data || [];
}

export async function fetchAllTasks() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Check if user is admin
  const isAdmin = user.app_metadata?.role === "SUPER_ADMIN" || user.app_metadata?.role === "ROLE_ADMIN";

  const { data: allTasks, error: tasksError } = await supabase
    .from("tasks")
    .select(`
      *,
      title:subject,
      status:status_master(name:status_name, code:status_code, status_color),
      priority:priority_master(name:priority_name, code:priority_code)
    `)
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
        supabaseAdmin.from("user_master").select("id, full_name, profile_photo, manager_id").in("id", creatorIds)
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
