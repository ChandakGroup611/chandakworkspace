import React from "react";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import DashboardCommandCenter from "@/components/dashboard/DashboardCommandCenter";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch real production items from backend storage with RLS inherently applied
  // Parallel fetch for speed
  const [tasksRes, workspacesRes, ticketsRes] = await Promise.all([
    supabase.from("tasks").select("id, subject, status_id, status_master(status_name), created_at, priority_id").order('created_at', { ascending: false }).limit(20),
    supabase.from("workspaces").select("id, workspace_name, status_id, status_master(status_name), created_at").order('created_at', { ascending: false }).limit(20),
    supabase.from("tickets").select("id, code, title, status_id, status_master(status_name), created_at, priority_id").order('created_at', { ascending: false }).limit(20)
  ]);

  const activities: any[] = [];

  // Map Tasks
  if (tasksRes.data) {
    tasksRes.data.forEach((t: any) => {
      activities.push({
        id: `TSK-${String(t.id).substring(0,4).toUpperCase()}`,
        module: "tasks",
        moduleLabel: "Workspace Task",
        title: t.subject || "Unnamed Task",
        status: t.status_master?.status_name?.toLowerCase().includes("resolve") ? "resolved" :
                t.status_master?.status_name?.toLowerCase().includes("review") ? "review" : "active",
        statusLabel: t.status_master?.status_name || "Active",
        timestamp: t.created_at, // We will format this on the client
        operator: t.user_master?.full_name || "System",
        impact: "Medium" // Can map from priority if needed
      });
    });
  }

  // Map Workspaces
  if (workspacesRes.data) {
    workspacesRes.data.forEach((w: any) => {
      activities.push({
        id: `WS-${String(w.id).substring(0,5).toUpperCase()}`,
        module: "requirements", // Reusing requirements for workspaces to keep UI working
        moduleLabel: "Workspace",
        title: w.workspace_name || "Unnamed Workspace",
        status: w.status_master?.status_name?.toLowerCase() === "archived" ? "resolved" : "active",
        statusLabel: w.status_master?.status_name || "Active",
        timestamp: w.created_at,
        operator: w.user_master?.full_name || "System",
        impact: "High"
      });
    });
  }

  // Map Tickets
  if (ticketsRes.data) {
    ticketsRes.data.forEach((t: any) => {
      activities.push({
        id: t.code || `TKT-${String(t.id).substring(0,4).toUpperCase()}`,
        module: "tickets",
        moduleLabel: "ITSM Ticket",
        title: t.title || "Unnamed Ticket",
        status: t.status_master?.status_name?.toLowerCase().includes("resolve") ? "resolved" :
                t.status_master?.status_name?.toLowerCase().includes("escalated") ? "escalated" : "active",
        statusLabel: t.status_master?.status_name || "Active",
        timestamp: t.created_at,
        operator: t.user_master?.full_name || "System",
        impact: "Critical"
      });
    });
  }

  // Sort unified activities by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Take top 50
  const recentActivities = activities.slice(0, 50);

  return (
    <div className="w-full animate-in fade-in-50 duration-500">
      <DashboardCommandCenter 
        initialActivities={recentActivities} 
        dbError={tasksRes.error?.message || workspacesRes.error?.message || ticketsRes.error?.message || null} 
      />
    </div>
  );
}
