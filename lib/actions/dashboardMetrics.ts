"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function fetchLiveDashboardMetrics() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  try {
    // 1. Fetch Tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        id, created_at, created_by,
        status_id, status_master(status_name),
        priority_id, end_date
      `)
      .order("created_at", { ascending: false });

    // 2. Fetch Tickets 
    // NOTE: Add \`due_date\` back to this select once the migration 20260526020000_add_due_dates_to_entities.sql is executed in Supabase!
    const { data: ticketsData, error: ticketsError } = await supabase
      .from("tickets")
      .select(`
        id, created_at, creator_id,
        status_id, status_master(status_name),
        priority_id, due_date
      `)
      .order("created_at", { ascending: false });

    // 3. Fetch Requirements 
    // NOTE: Add \`due_date\` back to this select once the migration 20260526020000_add_due_dates_to_entities.sql is executed in Supabase!
    const { data: requirementsData, error: requirementsError } = await supabase
      .from("requirements")
      .select(`
        id, created_at, creator_id,
        status_id, status_master(status_name),
        due_date
      `)
      .order("created_at", { ascending: false });

    // 4. Fetch Workspaces
    const { data: workspacesData, error: workspacesError } = await supabase
      .from("workspaces")
      .select(`
        id, created_at,
        status_id, status_master(status_name),
        end_date
      `)
      .order("created_at", { ascending: false });

    // 5. Fetch Users for Mapping (Bypass RLS using Service Role Key so normal users see all names)
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );
    
    const { data: usersData } = await adminSupabase
      .from("user_master")
      .select("id, full_name");

    const userMap: Record<string, string> = {};
    usersData?.forEach((u: any) => {
      userMap[u.id] = u.full_name;
    });

    if (tasksError || ticketsError || requirementsError || workspacesError) {
      console.error("Dashboard Data Fetch Error:", JSON.stringify({ tasksError, ticketsError, requirementsError, workspacesError }, null, 2));
      return { error: "Failed to fetch one or more dashboard data sources." };
    }

    // Process & Aggregate all the data
    const allItems: any[] = [];
    const now = new Date().getTime();

    // Mapping Functions
    const mapStatus = (sName: string) => {
      const lower = (sName || "").toLowerCase();
      if (lower.includes("resolv") || lower.includes("archiv") || lower.includes("complet")) return "Resolved";
      if (lower.includes("escalat") || lower.includes("block")) return "Escalated";
      if (lower.includes("review")) return "Review";
      return "Active";
    };

    tasksData?.forEach((t: any) => {
      allItems.push({
        module: "Tasks",
        id: t.id,
        status: mapStatus(t.status_master?.status_name),
        rawStatus: t.status_master?.status_name || "Unknown",
        user: userMap[t.created_by] || t.created_by || "Unassigned",
        priority: t.master_priorities?.name || "Standard",
        createdAt: t.created_at,
        dueDate: t.end_date,
        isOverdue: t.end_date && new Date(t.end_date).getTime() < now && mapStatus(t.status_master?.status_name) !== "Resolved"
      });
    });

    ticketsData?.forEach((t: any) => {
      allItems.push({
        module: "Tickets",
        id: t.id,
        status: mapStatus(t.status_master?.status_name),
        rawStatus: t.status_master?.status_name || "Unknown",
        user: userMap[t.creator_id] || t.creator_id || "Unassigned",
        priority: t.master_priorities?.name || "Standard",
        createdAt: t.created_at,
        dueDate: t.due_date,
        isOverdue: t.due_date && new Date(t.due_date).getTime() < now && mapStatus(t.status_master?.status_name) !== "Resolved",
        slaBreached: t.ticket_sla_trackers?.[0]?.resolution_breached || false
      });
    });

    requirementsData?.forEach((r: any) => {
      allItems.push({
        module: "Requirements",
        id: r.id,
        status: mapStatus(r.status_master?.status_name),
        rawStatus: r.status_master?.status_name || "Unknown",
        user: userMap[r.creator_id] || r.creator_id || "Unassigned",
        priority: "N/A", // Requirements often don't have priority in this schema
        createdAt: r.created_at,
        dueDate: r.due_date,
        isOverdue: r.due_date && new Date(r.due_date).getTime() < now && mapStatus(r.status_master?.status_name) !== "Resolved"
      });
    });

    workspacesData?.forEach((w: any) => {
      allItems.push({
        module: "Workspaces",
        id: w.id,
        status: mapStatus(w.status_master?.status_name),
        rawStatus: w.status_master?.status_name || "Unknown",
        user: "System",
        priority: "N/A",
        createdAt: w.created_at,
        dueDate: w.end_date,
        isOverdue: w.end_date && new Date(w.end_date).getTime() < now && mapStatus(w.status_master?.status_name) !== "Resolved"
      });
    });

    return { data: allItems };
  } catch (err: any) {
    console.error("Dashboard metric parsing error", err);
    return { error: err.message };
  }
}
