"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";

export async function fetchLiveDashboardMetrics() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { user } = await getCachedUser();
  if (!user) return { error: "Unauthenticated" };
  const userId = user.id;

  try {
    const { hasPermission } = await import('@/lib/permissions');
    const isSuperAdmin = await hasPermission(userId, "SUPER_ADMIN");

    // Always fetch enrolled workspaces for personal dashboard
    let workspaceIds: string[] = [];
    let subWorkspaceIds: string[] = [];
    let participantTaskIds: string[] = [];
    // 1. Get workspaces where user is enrolled or created
    const { data: wsMembers } = await supabase
      .from("workspace_members")
      .select("workspace_id, workspaces!inner(id)")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .eq("workspaces.is_deleted", false);
    
    workspaceIds = wsMembers?.map(m => m.workspace_id) || [];

    const { data: wsCreated } = await supabase
      .from("workspaces")
      .select("id")
      .eq("created_by", userId)
      .eq("is_deleted", false);
      
    if (wsCreated) {
      wsCreated.forEach(w => {
        if (!workspaceIds.includes(w.id)) workspaceIds.push(w.id);
      });
    }

    // Get tasks where user is a participant
    const { data: taskParticipants } = await supabase
      .from("task_participants")
      .select("task_id, tasks!inner(id)")
      .eq("user_id", userId)
      .eq("tasks.is_deleted", false);
    
    participantTaskIds = taskParticipants?.map(p => p.task_id) || [];

    // 2. Fetch scoped data
    // 2. Fetch scoped data
    let tasksPromise: any;
    if (isSuperAdmin) {
      tasksPromise = supabaseAdmin.from("tasks")
        .select(`id, created_at, created_by, assigned_to, subject, status_id, status_master(status_name), priority_id, priority:priority_master(priority_name), end_date, parent_task_id`)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .then(res => ({ data: res.data || [], error: res.error }));
    } else {
      const createdPromise = supabaseAdmin.from("tasks").select(`id, created_at, updated_at, created_by, assigned_to, subject, status_id, status_master(status_name), priority_id, priority:priority_master(priority_name), end_date, parent_task_id`).eq('created_by', userId).eq("is_deleted", false);
      const assignedPromise = supabaseAdmin.from("tasks").select(`id, created_at, updated_at, created_by, assigned_to, subject, status_id, status_master(status_name), priority_id, priority:priority_master(priority_name), end_date, parent_task_id`).eq('assigned_to', userId).eq("is_deleted", false);
      
      let partTasksData: any[] = [];
      let partTasksError = null;
      if (participantTaskIds.length > 0) {
        const CHUNK_SIZE = 150;
        for (let i = 0; i < participantTaskIds.length; i += CHUNK_SIZE) {
          const chunk = participantTaskIds.slice(i, i + CHUNK_SIZE);
          const { data, error } = await supabaseAdmin.from("tasks").select(`id, created_at, updated_at, created_by, assigned_to, subject, status_id, status_master(status_name), priority_id, priority:priority_master(priority_name), end_date, parent_task_id`).in('id', chunk).eq("is_deleted", false);
          if (error) partTasksError = error;
          if (data) partTasksData.push(...data);
        }
      }

      tasksPromise = Promise.all([createdPromise, assignedPromise]).then(([cRes, aRes]) => {
        if (cRes.error) return { data: null, error: cRes.error };
        if (aRes.error) return { data: null, error: aRes.error };
        if (partTasksError) return { data: null, error: partTasksError };
        
        const merged = [...(cRes.data || []), ...(aRes.data || []), ...partTasksData];
        const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
        
        return { data: unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), error: null };
      });
    }

    let subTasksPromise: any;
    if (isSuperAdmin) {
      subTasksPromise = supabaseAdmin.from("sub_tasks")
        .select(`id, created_at, updated_at, created_by, assigned_to, subject, status`)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .then(res => ({ data: res.data || [], error: res.error }));
    } else {
      const createdSubPromise = supabaseAdmin.from("sub_tasks").select(`id, created_at, updated_at, created_by, assigned_to, subject, status`).eq('created_by', userId).eq("is_deleted", false);
      const assignedSubPromise = supabaseAdmin.from("sub_tasks").select(`id, created_at, updated_at, created_by, assigned_to, subject, status`).eq('assigned_to', userId).eq("is_deleted", false);
      
      subTasksPromise = Promise.all([createdSubPromise, assignedSubPromise]).then(([cRes, aRes]) => {
        if (cRes.error) return { data: null, error: cRes.error };
        if (aRes.error) return { data: null, error: aRes.error };
        const merged = [...(cRes.data || []), ...(aRes.data || [])];
        const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
        return { data: unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), error: null };
      });
    }


    let ticketsPromise: any;
    if (isSuperAdmin) {
      ticketsPromise = supabaseAdmin.from("tickets")
        .select(`id, created_at, updated_at, creator_id, title, status_id, status_master(status_name), priority_id, priority:priority_master(priority_name), due_date, assignee_id`)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .then(res => ({ data: res.data || [], error: res.error }));
    } else {
      const createdTkPromise = supabaseAdmin.from("tickets").select(`id, created_at, updated_at, creator_id, title, status_id, status_master(status_name), priority_id, priority:priority_master(priority_name), due_date, assignee_id`).eq('creator_id', userId).eq("is_deleted", false);
      const assignedTkPromise = supabaseAdmin.from("tickets").select(`id, created_at, updated_at, creator_id, title, status_id, status_master(status_name), priority_id, priority:priority_master(priority_name), due_date, assignee_id`).eq('assignee_id', userId).eq("is_deleted", false);
      
      ticketsPromise = Promise.all([createdTkPromise, assignedTkPromise]).then(([cRes, aRes]) => {
        if (cRes.error) return { data: null, error: cRes.error };
        if (aRes.error) return { data: null, error: aRes.error };
        const merged = [...(cRes.data || []), ...(aRes.data || [])];
        const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
        return { data: unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), error: null };
      });
    }

    let requirementsPromise: any;
    if (isSuperAdmin) {
      requirementsPromise = supabaseAdmin
        .from("requirements")
        .select(`id, created_at, updated_at, creator_id, current_assignee_id, title, status_id, status_master(status_name), due_date`)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
    } else {
      requirementsPromise = supabaseAdmin
        .from("requirements")
        .select(`id, created_at, updated_at, creator_id, current_assignee_id, title, status_id, status_master(status_name), due_date`)
        .eq("is_deleted", false)
        .eq('creator_id', userId)
        .order("created_at", { ascending: false });
    }

    let workspacesPromise: any;
    if (isSuperAdmin) {
      workspacesPromise = supabaseAdmin
        .from("workspaces")
        .select(`id, created_at, updated_at, workspace_name, parent_workspace_id, status_id, status_master(status_name), end_date`)
        .eq('is_deleted', false)
        .order("created_at", { ascending: false });
    } else {
      const idsToFetch = [...workspaceIds];
      workspacesPromise = idsToFetch.length > 0 ? supabaseAdmin
        .from("workspaces")
        .select(`id, created_at, updated_at, workspace_name, parent_workspace_id, status_id, status_master(status_name), end_date`)
        .in('id', idsToFetch)
        .eq('is_deleted', false)
        .order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null });
    }

    // Execute parallel groups
    const [
      { data: tasksData, error: tasksError },
      { data: subTasksData, error: subTasksError },
      { data: ticketsData, error: ticketsError },
      { data: requirementsData, error: requirementsError },
      { data: workspacesData, error: workspacesError }
    ] = await Promise.all([
      tasksPromise,
      subTasksPromise,
      ticketsPromise,
      requirementsPromise,
      workspacesPromise
    ]);

    if (tasksError) console.error("Tasks Error:", JSON.stringify(tasksError, null, 2));

    // Fetch user details manually to avoid foreign key ambiguity errors
    const userIdsToFetch = new Set<string>();
    tasksData?.forEach((t: any) => { if (t.assigned_to) userIdsToFetch.add(t.assigned_to); if (t.created_by) userIdsToFetch.add(t.created_by); });
    // Prepare SubTasks userIdsToFetch but do not process allItems yet
    subTasksData?.forEach((t: any) => { if (t.assigned_to) userIdsToFetch.add(t.assigned_to); if (t.created_by) userIdsToFetch.add(t.created_by); });

    ticketsData?.forEach((t: any) => { if (t.creator_id) userIdsToFetch.add(t.creator_id); if (t.assignee_id) userIdsToFetch.add(t.assignee_id); });
    requirementsData?.forEach((t: any) => { if (t.current_assignee_id) userIdsToFetch.add(t.current_assignee_id); if (t.creator_id) userIdsToFetch.add(t.creator_id); });

    let userMap: Record<string, any> = {};
    if (userIdsToFetch.size > 0) {
      const { data: usersData } = await supabaseAdmin
        .from('user_master')
        .select('id, full_name, role_id, roles(name)')
        .in('id', Array.from(userIdsToFetch));
      
      if (usersData) {
        usersData.forEach((u: any) => {
          userMap[u.id] = {
            name: u.full_name,
            role: u.roles?.name || "Team Member"
          };
        });
      }
    }

    // Process & Aggregate all the data
    const now = new Date().getTime();

    // Mapping Functions
    const mapStatus = (sName: string) => {
      const lower = (sName || "").toLowerCase();
      if (lower.includes("resolv") || lower.includes("archiv") || lower.includes("complet")) return "Resolved";
      if (lower.includes("escalat") || lower.includes("block")) return "Escalated";
      if (lower.includes("review")) return "Review";
      return "Active";
    };

    let totalTasks = 0;
    let upcomingTasks = 0;
    let escalatedCount = 0;
    let resolvedCount = 0;

    const allItems: any[] = [];
    
    const tasks = tasksData || [];
    const subTasks = subTasksData || [];
    const tickets = ticketsData || [];
    const requirements = requirementsData || [];
    const workspaces = workspacesData || [];

    tasks.forEach((t: any) => {
      const isSubTask = !!t.parent_task_id;
      if (!isSubTask) totalTasks++;
      
      const status = mapStatus((t.status_master as any)?.status_name);
      if (status === "Resolved" && !isSubTask) resolvedCount++;
      if (status === "Escalated") escalatedCount++;
      
      if (t.end_date && status !== "Resolved") {
        const diffDays = (new Date(t.end_date).getTime() - now) / (1000 * 3600 * 24);
        if (diffDays >= 0 && diffDays <= 7 && !isSubTask) upcomingTasks++;
        if (diffDays < 0) escalatedCount++; // Overdue
      }

      allItems.push({
        module: isSubTask ? "Sub Tasks" : "Tasks",
        id: t.id,
        code: t.code,
        title: t.subject || (isSubTask ? "Untitled Sub Task" : "Untitled Task"),
        status: status,
        rawStatus: (t.status_master as any)?.status_name || "Unknown",
        user: userMap[t.assigned_to]?.name || "Unassigned",
        userRole: userMap[t.assigned_to]?.role || userMap[t.created_by]?.role || "Team Member",
        priority: t.priority?.priority_name || "Standard",
        createdAt: t.created_at,
        updatedAt: t.updated_at || t.created_at,
        dueDate: t.end_date,
        isOverdue: t.end_date && new Date(t.end_date).getTime() < now && status !== "Resolved"
      });
    });

    subTasks.forEach((t: any) => {
      const status = mapStatus(t.status);
      allItems.push({
        module: "Sub Tasks",
        id: t.id,
        code: null,
        title: t.subject || "Untitled Sub Task",
        status: status,
        rawStatus: t.status || "Unknown",
        user: userMap[t.assigned_to]?.name || "Unassigned",
        userRole: userMap[t.assigned_to]?.role || userMap[t.created_by]?.role || "Team Member",
        priority: "N/A",
        createdAt: t.created_at,
        updatedAt: t.updated_at || t.created_at,
        dueDate: null,
        isOverdue: false
      });
    });

    tickets.forEach((t: any) => {
      const status = mapStatus((t.status_master as any)?.status_name);
      if (status === "Escalated") escalatedCount++;
      if (t.due_date && status !== "Resolved" && new Date(t.due_date).getTime() < now) {
        escalatedCount++;
      }

      allItems.push({
        module: "Tickets",
        id: t.id,
        code: t.code,
        title: t.title || "Untitled Ticket",
        status: status,
        rawStatus: (t.status_master as any)?.status_name || "Unknown",
        user: userMap[t.assignee_id]?.name || "Unassigned",
        userRole: userMap[t.assignee_id]?.role || userMap[t.creator_id]?.role || "Team Member",
        priority: t.priority?.priority_name || "Standard",
        createdAt: t.created_at,
        updatedAt: t.updated_at || t.created_at,
        dueDate: t.due_date,
        isOverdue: t.due_date && new Date(t.due_date).getTime() < now && status !== "Resolved",
        slaBreached: false
      });
    });

    requirements.forEach((r: any) => {
      const status = mapStatus((r.status_master as any)?.status_name);
      if (r.due_date && status !== "Resolved") {
        const diffDays = (new Date(r.due_date).getTime() - now) / (1000 * 3600 * 24);
        if (diffDays >= 0 && diffDays <= 7) upcomingTasks++;
        if (diffDays < 0) escalatedCount++;
      }

      allItems.push({
        module: "Requirements",
        id: r.id,
        code: r.code,
        title: r.title || "Untitled Requirement",
        status: status,
        rawStatus: (r.status_master as any)?.status_name || "Unknown",
        user: userMap[r.current_assignee_id]?.name || "Unassigned",
        userRole: userMap[r.current_assignee_id]?.role || "Team Member",
        priority: "N/A", 
        createdAt: r.created_at,
        updatedAt: r.updated_at || r.created_at,
        dueDate: r.due_date,
        isOverdue: r.due_date && new Date(r.due_date).getTime() < now && status !== "Resolved"
      });
    });

    workspaces.forEach((w: any) => {
      const status = mapStatus((w.status_master as any)?.status_name);
      if (w.end_date && status !== "Resolved") {
        const diffDays = (new Date(w.end_date).getTime() - now) / (1000 * 3600 * 24);
        if (diffDays >= 0 && diffDays <= 7) upcomingTasks++;
        if (diffDays < 0) escalatedCount++;
      }

      allItems.push({
        module: w.parent_workspace_id ? "Sub Workspaces" : "Workspaces",
        id: w.id,
        code: `WS-${w.id.substring(0, 6).toUpperCase()}`,
        title: w.workspace_name || "Untitled Workspace",
        status: status,
        rawStatus: (w.status_master as any)?.status_name || "Unknown",
        user: "System",
        priority: "N/A",
        createdAt: w.created_at,
        dueDate: w.end_date,
        isOverdue: w.end_date && new Date(w.end_date).getTime() < now && status !== "Resolved"
      });
    });

    const kpis = {
      workspaces: { 
        total: workspaces.filter((w: any) => !w.parent_workspace_id).length, 
        resolved: workspaces.filter((w: any) => !w.parent_workspace_id && mapStatus((w.status_master as any)?.status_name) === 'Resolved').length 
      },
      sub_workspaces: { 
        total: workspaces.filter((w: any) => w.parent_workspace_id).length, 
        resolved: workspaces.filter((w: any) => w.parent_workspace_id && mapStatus((w.status_master as any)?.status_name) === 'Resolved').length 
      },
      tasks: { 
        total: tasks.filter((t: any) => !t.parent_task_id).length, 
        resolved: tasks.filter((t: any) => !t.parent_task_id && mapStatus((t.status_master as any)?.status_name) === 'Resolved').length, 
        upcoming_due: tasks.filter((t: any) => !t.parent_task_id && t.end_date && mapStatus((t.status_master as any)?.status_name) !== 'Resolved' && (new Date(t.end_date).getTime() - now) / (1000 * 3600 * 24) >= 0 && (new Date(t.end_date).getTime() - now) / (1000 * 3600 * 24) <= 3).length 
      },
      sub_tasks: { 
        total: subTasks.length + tasks.filter((t: any) => !!t.parent_task_id).length, 
        resolved: subTasks.filter((t: any) => mapStatus(t.status) === 'Resolved').length + tasks.filter((t: any) => !!t.parent_task_id && mapStatus((t.status_master as any)?.status_name) === 'Resolved').length 
      },
      requirements: { 
        total: requirements.length, 
        resolved: requirements.filter((r: any) => mapStatus((r.status_master as any)?.status_name) === 'Resolved').length, 
        upcoming_due: requirements.filter((r: any) => r.due_date && mapStatus((r.status_master as any)?.status_name) !== 'Resolved' && (new Date(r.due_date).getTime() - now) / (1000 * 3600 * 24) >= 0 && (new Date(r.due_date).getTime() - now) / (1000 * 3600 * 24) <= 3).length 
      },
      tickets: { 
        total: tickets.length, 
        resolved: tickets.filter((t: any) => mapStatus((t.status_master as any)?.status_name) === 'Resolved').length, 
        upcoming_due: tickets.filter((t: any) => t.due_date && mapStatus((t.status_master as any)?.status_name) !== 'Resolved' && (new Date(t.due_date).getTime() - now) / (1000 * 3600 * 24) >= 0 && (new Date(t.due_date).getTime() - now) / (1000 * 3600 * 24) <= 3).length 
      },
    };

    return { data: allItems, kpis: kpis };
  } catch (err: any) {
    console.error("Dashboard metric parsing error", err);
    return { error: err.message };
  }
}
