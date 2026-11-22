"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getSessionUser } from "@/lib/permissions/authorize";

export interface MyWorkItem {
  id: string;
  module: "TASK_WORKFLOW" | "TICKETS" | "REQUIREMENTS" | "VEHICLE_DESK";
  moduleName: string;
  type: "task" | "ticket" | "requirement" | "trip";
  title: string;
  code?: string;
  status: string;
  priority?: string;
  dueDate?: string | null;
  href: string;
  createdAt: string;
}

export async function fetchMyWorkItems(): Promise<MyWorkItem[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const items: MyWorkItem[] = [];

  // 1. Tasks assigned to user
  try {
    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      // tasks: title is "subject", due date is end_date, priority is priority_id → priority_master
      .select("id, task_code, code, subject, end_date, created_at, status:status_id(status_name, is_closed), priority:priority_id(priority_name)")
      .eq("assigned_to", user.id)
      .eq("is_deleted", false)
      .order("end_date", { ascending: true, nullsFirst: false })
      .limit(50);

    if (tasks) {
      for (const t of tasks) {
        const isClosed = (t.status as any)?.is_closed;
        if (!isClosed) {
          items.push({
            id: t.id,
            module: "TASK_WORKFLOW",
            moduleName: "Tasks",
            type: "task",
            title: t.subject,
            code: t.task_code || t.code,
            status: (t.status as any)?.status_name || "Active",
            priority: (t.priority as any)?.priority_name,
            dueDate: t.end_date,
            href: `/tasks/${t.id}`,
            createdAt: t.created_at,
          });
        }
      }
    }
  } catch (e) {
    console.error("[fetchMyWorkItems] Tasks query error:", e);
  }

  // 2. Tickets assigned or created
  try {
    const { data: tickets } = await supabaseAdmin
      .from("tickets")
      // tickets: code (not ticket_number), assignee_id (not assigned_to), priority via priority_id
      .select("id, code, title, due_date, created_at, status:status_id(status_name, is_closed), priority:priority_id(priority_name)")
      .or(`assignee_id.eq.${user.id},creator_id.eq.${user.id}`)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(30);

    if (tickets) {
      for (const t of tickets) {
        const isClosed = (t.status as any)?.is_closed;
        if (!isClosed) {
          items.push({
            id: t.id,
            module: "TICKETS",
            moduleName: "Tickets",
            type: "ticket",
            title: t.title,
            code: t.code,
            status: (t.status as any)?.status_name || "Open",
            priority: (t.priority as any)?.priority_name,
            dueDate: t.due_date,
            href: `/tickets/${t.id}`,
            createdAt: t.created_at,
          });
        }
      }
    }
  } catch (e) {
    console.error("[fetchMyWorkItems] Tickets query error:", e);
  }

  // 3. Requirements created or owned
  try {
    const { data: reqs } = await supabaseAdmin
      .from("requirements")
      // requirements: code (not req_code), creator_id (not created_by), priority via priority_id
      .select("id, code, title, due_date, created_at, status:status_id(status_name, is_closed), priority:priority_id(priority_name)")
      .or(`creator_id.eq.${user.id},owner_id.eq.${user.id}`)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(30);

    if (reqs) {
      for (const r of reqs) {
        const isClosed = (r.status as any)?.is_closed;
        if (!isClosed) {
          items.push({
            id: r.id,
            module: "REQUIREMENTS",
            moduleName: "Requirements",
            type: "requirement",
            title: r.title,
            code: r.code,
            status: (r.status as any)?.status_name || "Draft",
            priority: (r.priority as any)?.priority_name,
            dueDate: r.due_date,
            href: `/requirements/${r.id}`,
            createdAt: r.created_at,
          });
        }
      }
    }
  } catch (e) {
    console.error("[fetchMyWorkItems] Requirements query error:", e);
  }

  // 4. Vehicle trip plans
  try {
    const { data: trips } = await supabaseAdmin
      .from("trip_plans")
      .select("id, destination, plan_date, purpose, status, created_at")
      .eq("passenger_id", user.id)
      .order("plan_date", { ascending: false })
      .limit(20);

    if (trips) {
      for (const tr of trips) {
        items.push({
          id: tr.id,
          module: "VEHICLE_DESK",
          moduleName: "Vehicle",
          type: "trip",
          title: `Trip to ${tr.destination || "Destination"}`,
          code: tr.id.substring(0, 8),
          status: tr.status || "PLANNED",
          dueDate: tr.plan_date,
          href: `/vehicle`,
          createdAt: tr.created_at,
        });
      }
    }
  } catch (e) {
    console.error("[fetchMyWorkItems] Trips query error:", e);
  }

  return items;
}
