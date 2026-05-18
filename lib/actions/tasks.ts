"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

/**
 * Enterprise Task Management Engine
 * Handles complex task lifecycles, workload analytics, and custom fields.
 */

export async function fetchUsers() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("user_master")
    .select("id, full_name, user_code")
    .eq("is_active", true)
    .eq("is_deleted", false)
    .order("full_name", { ascending: true });
    
  if (error) {
    console.error("Error fetching user directory:", error);
    return [];
  }
  return data || [];
}

// 1. Task Operations
export async function getTaskDetails(taskId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  const { data, error } = await supabase
    .from("workspace_tasks")
    .select(`
      *,
      workspace:workspaces(id, code, name),
      status:workflow_states(name, code),
      creator:user_master!creator_id(full_name, profile_photo),
      assignees:task_assignees(user:user_master(id, full_name, profile_photo)),
      teams:task_teams(team:teams(id, name)),
      checklists:task_checklists(*),
      attachments:task_attachments(*)
    `)
    .eq("id", taskId)
    .single();

  if (error || !data) {
    console.error("Error fetching task details:", error);
    throw new Error("Failed to load task details.");
  }

  // Enforce visibility: creator, explicit assignee, team member, workspace member, or super admin
  try {
    // SUPER_ADMIN bypass
    const { data: roleCheck } = await supabase.from('user_roles').select('role_id').eq('user_id', userId).limit(1);
    // if user is creator
    if (data.creator_id === userId) return data;

    // check explicit assignees
    const explicit = await supabase.from('task_assignees').select('user_id').eq('task_id', taskId).eq('user_id', userId).limit(1);
    if (explicit.data && explicit.data.length > 0) return data;

    // check team membership for task teams
    const { data: taskTeams } = await supabase.from('task_teams').select('team_id').eq('task_id', taskId);
    const teamIds = (taskTeams || []).map((t: any) => t.team_id);
    if (teamIds.length > 0) {
      const { data: tm } = await supabase.from('team_members').select('user_id').eq('user_id', userId).in('team_id', teamIds).limit(1);
      if (tm && tm.length > 0) return data;
    }

    // check workspace membership
    const wsId = data.workspace_id;
    const { data: wm } = await supabase.from('workspace_members').select('user_id').eq('workspace_id', wsId).eq('user_id', userId).limit(1);
    if (wm && wm.length > 0) return data;

    // super admin check (fallback via app metadata role)
    const { data: profile } = await supabase.from('user_master').select('role_id').eq('id', userId).single();
    if (profile?.role_id) {
      const { data: r } = await supabase.from('roles').select('code').eq('id', profile.role_id).single();
      if (r?.code === 'SUPER_ADMIN') return data;
    }
  } catch (e) {
    console.error('Error while enforcing task visibility:', e);
  }

  throw new Error('Access denied to task details');
}

// 2. Status Flow & Resolution
export async function transitionTaskStatus(taskId: string, statusCode: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: status } = await supabase
    .from("workflow_states")
    .select("id")
    .eq("code", statusCode)
    .single();

  if (!status) throw new Error(`Invalid status transition to ${statusCode}`);

  const { data, error } = await supabase
    .from("workspace_tasks")
    .update({ status_id: status.id, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw new Error("Failed to transition task status.");

  // Log activity
  const { data: user } = await supabase.auth.getUser();
  await supabase.from("task_activity_logs").insert([{
    task_id: taskId,
    actor_id: user.user?.id,
    action: "STATUS_CHANGE",
    new_state: { status: statusCode }
  }]);

  return data;
}

export async function updateTask(taskId: string, payload: { title?: string; description?: string; remarks?: string }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("workspace_tasks")
    .update({ 
      ...payload, 
      updated_at: new Date().toISOString() 
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    console.error("Error updating task:", error);
    throw new Error("Failed to update task.");
  }
  return data;
}

export async function getTaskComments(taskId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1. Fetch raw comments
  const { data: comments, error: commentsError } = await supabase
    .from("task_comments")
    .select("*")
    .eq("task_id", taskId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  if (commentsError) {
    console.error("Error fetching raw task comments:", commentsError);
    return [];
  }

  if (!comments || comments.length === 0) return [];

  // 2. Fetch unique author profiles
  const authorIds = Array.from(new Set(comments.map((c: any) => c.author_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from("user_master")
    .select("id, full_name, profile_photo")
    .in("id", authorIds);

  if (profilesError) {
    console.error("Error fetching author profiles for comments:", profilesError);
    return comments.map((c: any) => ({ ...c, author: null }));
  }

  const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

  // 3. Merge profiles
  return comments.map((c: any) => ({
    ...c,
    author: profileMap.get(c.author_id) || null
  }));
}

export async function addTaskRemark(taskId: string, content: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    throw new Error("Unauthorized to add remarks");
  }

  // 1. Insert remark into task_comments queue
  const { data: comment, error: commentError } = await supabase
    .from("task_comments")
    .insert([{
      task_id: taskId,
      author_id: userId,
      content
    }])
    .select()
    .single();

  if (commentError) {
    console.error("Error adding task remark to queue:", commentError);
    throw new Error(`Failed to add remark to queue. Details: ${commentError.message}`);
  }

  // 2. Fetch author profile
  const { data: profile } = await supabase
    .from("user_master")
    .select("id, full_name, profile_photo")
    .eq("id", userId)
    .single();

  // 3. Update the workspace_tasks.remarks with latest remark
  await supabase
    .from("workspace_tasks")
    .update({ remarks: content, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  return {
    ...comment,
    author: profile || null
  };
}


export async function deleteTask(taskId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  // Soft-delete: mark as deleted so it can be restored later
  const { error } = await supabase
    .from("workspace_tasks")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) {
    console.error("Error soft-deleting task:", error);
    throw new Error("Failed to delete task.");
  }
  return true;
}

export async function restoreTask(taskId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("workspace_tasks")
    .update({ is_deleted: false, deleted_at: null })
    .eq("id", taskId);

  if (error) {
    console.error("Error restoring task:", error);
    throw new Error("Failed to restore task.");
  }
  return true;
}

export async function resolveTask(taskId: string) {
  return await transitionTaskStatus(taskId, "ST_RESOLVED");
}

export async function approveResolution(taskId: string) {
  return await transitionTaskStatus(taskId, "ST_CLOSED");
}

export async function reopenTask(taskId: string) {
  return await transitionTaskStatus(taskId, "ST_REOPEN");
}

// 3. Workload Analytics
export async function getWorkloadSnapshot(userId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1. Fetch assigned tasks
  const { data: assignments, error } = await supabase
    .from("task_assignees")
    .select("task_id, workspace_tasks(status_id, due_date)")
    .eq("user_id", userId);

  if (error) {
    console.error("Workload error:", error);
    return null;
  }

  // Calculate active and overdue
  const now = new Date();
  let activeCount = 0;
  let overdueCount = 0;

  assignments?.forEach((a: any) => {
    const task = a.workspace_tasks;
    if (task) {
      activeCount++;
      if (task.due_date && new Date(task.due_date) < now) {
        overdueCount++;
      }
    }
  });

  // Calculate generic capacity (e.g. max 10 active tasks = 100%)
  const capacityMax = 10;
  const utilization = Math.min(Math.round((activeCount / capacityMax) * 100), 100);

  return {
    active_tasks: activeCount,
    overdue_tasks: overdueCount,
    capacity_percentage: utilization,
    estimated_hours: activeCount * 4.5, // Mock heuristic
    available_capacity: Math.max(100 - utilization, 0)
  };
}

// 4. Custom Fields Engine
export async function fetchCustomFields() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data } = await supabase.from("custom_field_definitions").select("*").eq("module", "tasks");
  return data || [];
}

export async function createCustomField(name: string, type: string, options?: string[]) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("custom_field_definitions")
    .insert([{
      field_key: name.toLowerCase().replace(/\s+/g, '_'),
      field_label: name,
      field_type: type,
      options: options || null,
      module: "tasks"
    }])
    .select()
    .single();

  if (error) throw new Error("Failed to provision custom field");
  return data;
}

// 5. Checklist & Attachments & Teams Extensions
export async function createChecklistItem(taskId: string, label: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("task_checklists")
    .insert([{
      task_id: taskId,
      label,
      is_completed: false
    }])
    .select()
    .single();
    
  if (error) {
    console.error("Error creating checklist item:", error);
    throw new Error(error.message);
  }
  return data;
}

export async function createTaskAttachment(taskId: string, fileName: string, fileUrl: string, size: number) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: userData } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from("task_attachments")
    .insert([{
      task_id: taskId,
      file_name: fileName,
      file_url: fileUrl,
      file_type: fileName.split('.').pop() || "unknown",
      size,
      uploaded_by: userData.user?.id
    }])
    .select()
    .single();
    
  if (error) {
    console.error("Error creating task attachment:", error);
    throw new Error(error.message);
  }
  return data;
}

export async function fetchTeams() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true });
    
  if (error) {
    console.error("Error fetching teams list:", error);
    return [];
  }
  return data || [];
}

export async function assignTeamToTask(taskId: string, teamId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("task_teams")
    .insert([{
      task_id: taskId,
      team_id: teamId
    }])
    .select()
    .single();
    
  if (error) {
    console.error("Error assigning team to task:", error);
    throw new Error(error.message);
  }
  return data;
}
