"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export async function fetchLiveDashboardMetrics() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthenticated" };
  const userId = user.id;

  try {
    // 1. Get workspaces where user is enrolled
    const { data: wsMembers } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId);
    
    const workspaceIds = wsMembers?.map(m => m.workspace_id) || [];
    
    const { data: subWsMembers } = await supabase
      .from("sub_workspace_members")
      .select("sub_workspace_id")
      .eq("user_id", userId);
      
    const subWorkspaceIds = subWsMembers?.map(m => m.sub_workspace_id) || [];

    // 2. Fetch scoped data
    const tasksPromise = supabase
      .from("tasks")
      .select(`
        id, created_at, created_by, assigned_to, subject,
        status_id, status_master(status_name),
        priority_id, priority:priority_master(priority_name),
        end_date
      `)
      .eq("is_deleted", false)
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
      .order("created_at", { ascending: false });

    // Assuming tickets has creator_id and assigned_to
    const ticketsPromise = supabase
      .from("tickets")
      .select(`
        id, created_at, creator_id, title,
        status_id, status_master(status_name),
        priority_id, priority:priority_master(priority_name),
        due_date
      `)
      .eq('creator_id', userId)
      .order("created_at", { ascending: false });

    const requirementsPromise = supabase
      .from("requirements")
      .select(`
        id, created_at, creator_id, title,
        status_id, status_master(status_name),
        due_date
      `)
      .eq('creator_id', userId)
      .order("created_at", { ascending: false });

    const workspacesPromise = workspaceIds.length > 0 ? supabase
      .from("workspaces")
      .select(`
        id, created_at, workspace_name,
        status_id, status_master(status_name),
        end_date
      `)
      .in('id', workspaceIds)
      .order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null });

    // Execute parallel groups
    const [
      { data: tasksData, error: tasksError },
      { data: ticketsData, error: ticketsError },
      { data: requirementsData, error: requirementsError },
      { data: workspacesData, error: workspacesError }
    ] = await Promise.all([
      tasksPromise,
      ticketsPromise,
      requirementsPromise,
      workspacesPromise
    ]);

    if (tasksError) console.error("Tasks Error:", tasksError);

    // Fetch user details manually to avoid foreign key ambiguity errors
    const userIdsToFetch = new Set<string>();
    tasksData?.forEach((t: any) => { if (t.assigned_to) userIdsToFetch.add(t.assigned_to); if (t.created_by) userIdsToFetch.add(t.created_by); });
    ticketsData?.forEach((t: any) => { if (t.creator_id) userIdsToFetch.add(t.creator_id); });
    requirementsData?.forEach((t: any) => { if (t.creator_id) userIdsToFetch.add(t.creator_id); });

    let userMap: Record<string, string> = {};
    if (userIdsToFetch.size > 0) {
      const { data: usersData } = await supabaseAdmin
        .from('user_master')
        .select('id, full_name')
        .in('id', Array.from(userIdsToFetch));
      
      if (usersData) {
        usersData.forEach((u: any) => {
          userMap[u.id] = u.full_name;
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
    
    tasksData?.forEach((t: any) => {
      totalTasks++;
      const status = mapStatus(t.status_master?.status_name);
      if (status === "Resolved") resolvedCount++;
      if (status === "Escalated") escalatedCount++;
      
      if (t.end_date && status !== "Resolved") {
        const diffDays = (new Date(t.end_date).getTime() - now) / (1000 * 3600 * 24);
        if (diffDays >= 0 && diffDays <= 7) upcomingTasks++;
        if (diffDays < 0) escalatedCount++; // Overdue
      }

      allItems.push({
        module: "Tasks",
        id: t.id,
        code: t.code,
        title: t.subject || "Untitled Task",
        status: status,
        rawStatus: t.status_master?.status_name || "Unknown",
        user: userMap[t.assigned_to] || userMap[t.created_by] || "Unassigned",
        priority: t.priority?.priority_name || "Standard",
        createdAt: t.created_at,
        dueDate: t.end_date,
        isOverdue: t.end_date && new Date(t.end_date).getTime() < now && status !== "Resolved"
      });
    });

    ticketsData?.forEach((t: any) => {
      const status = mapStatus(t.status_master?.status_name);
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
        rawStatus: t.status_master?.status_name || "Unknown",
        user: userMap[t.creator_id] || "Unassigned",
        priority: t.priority?.priority_name || "Standard",
        createdAt: t.created_at,
        dueDate: t.due_date,
        isOverdue: t.due_date && new Date(t.due_date).getTime() < now && status !== "Resolved",
        slaBreached: false
      });
    });

    requirementsData?.forEach((r: any) => {
      const status = mapStatus(r.status_master?.status_name);
      allItems.push({
        module: "Requirements",
        id: r.id,
        code: r.code,
        title: r.title || "Untitled Requirement",
        status: status,
        rawStatus: r.status_master?.status_name || "Unknown",
        user: userMap[r.creator_id] || "Unassigned",
        priority: "N/A", 
        createdAt: r.created_at,
        dueDate: r.due_date,
        isOverdue: r.due_date && new Date(r.due_date).getTime() < now && status !== "Resolved"
      });
    });

    workspacesData?.forEach((w: any) => {
      const status = mapStatus(w.status_master?.status_name);
      allItems.push({
        module: "Workspaces",
        id: w.id,
        status: status,
        rawStatus: w.status_master?.status_name || "Unknown",
        user: "System",
        priority: "N/A",
        createdAt: w.created_at,
        dueDate: w.end_date,
        isOverdue: w.end_date && new Date(w.end_date).getTime() < now && status !== "Resolved"
      });
    });

    const kpis = {
      tasks: {
        total: totalTasks,
        resolved: resolvedCount,
        upcoming_due: upcomingTasks,
      },
      workspaces: {
        enrolled_workspaces: workspaceIds.length,
        enrolled_sub_workspaces: subWorkspaceIds.length
      },
      tickets_reqs: {
        total_tickets: ticketsData?.length || 0,
        total_requirements: requirementsData?.length || 0
      },
      sla: {
        escalated_or_breached: escalatedCount,
        healthy: Math.max(0, totalTasks + (ticketsData?.length || 0) - escalatedCount - upcomingTasks),
        warning: upcomingTasks,
        breached: escalatedCount
      },
      workload: {
        active_tasks: totalTasks - resolvedCount,
        active_tickets: (ticketsData?.length || 0) - (ticketsData?.filter((t: any) => mapStatus(t.status_master?.status_name) === 'Resolved').length || 0),
        active_requirements: (requirementsData?.length || 0) - (requirementsData?.filter((r: any) => mapStatus(r.status_master?.status_name) === 'Resolved').length || 0)
      }
    };

    return { data: allItems, kpis: kpis };
  } catch (err: any) {
    console.error("Dashboard metric parsing error", err);
    return { error: err.message };
  }
}
