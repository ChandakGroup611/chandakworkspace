"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getSessionUser } from "@/lib/permissions/authorize";

export interface ApprovalItem {
  id: string;
  module: "TASK_WORKFLOW" | "REQUIREMENTS" | "VEHICLE_DESK";
  moduleName: string;
  title: string;
  code?: string;
  submittedBy: string;
  status: string;
  createdAt: string;
  href: string;
}

export async function fetchPendingApprovals(): Promise<ApprovalItem[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const items: ApprovalItem[] = [];

  // 1. Requirements awaiting sign-off (UAT / Ready for Signoff)
  try {
    const { data: reqs } = await supabaseAdmin
      .from("requirements")
      .select("id, req_code, title, created_at, created_by, status:status_id(status_name, is_closed)")
      .eq("is_deleted", false)
      .limit(30);

    if (reqs) {
      for (const r of reqs) {
        const sName = ((r.status as any)?.status_name || "").toUpperCase();
        if (sName.includes("UAT") || sName.includes("CHECK") || sName.includes("REVIEW")) {
          items.push({
            id: r.id,
            module: "REQUIREMENTS",
            moduleName: "Requirements",
            title: r.title,
            code: r.req_code,
            submittedBy: r.created_by ? "Requester" : "System",
            status: (r.status as any)?.status_name,
            createdAt: r.created_at,
            href: `/requirements/${r.id}`,
          });
        }
      }
    }
  } catch (e) {
    console.error("[fetchPendingApprovals] Requirements error:", e);
  }

  // 2. Tasks awaiting review / closure ("Need to Check")
  try {
    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("id, task_code, title, created_at, created_by, status:status_id(status_name)")
      .eq("is_deleted", false)
      .limit(30);

    if (tasks) {
      for (const t of tasks) {
        const sName = ((t.status as any)?.status_name || "").toUpperCase();
        if (sName.includes("CHECK") || sName.includes("REVIEW")) {
          items.push({
            id: t.id,
            module: "TASK_WORKFLOW",
            moduleName: "Tasks",
            title: t.title,
            code: t.task_code,
            submittedBy: "Assignee",
            status: (t.status as any)?.status_name,
            createdAt: t.created_at,
            href: `/tasks/${t.id}`,
          });
        }
      }
    }
  } catch (e) {
    console.error("[fetchPendingApprovals] Tasks error:", e);
  }

  // 3. Trip plans awaiting dispatch
  try {
    const { data: trips } = await supabaseAdmin
      .from("trip_plans")
      .select("id, destination, plan_date, traveler_name, status, created_at")
      .in("status", ["PLANNED", "PENDING", "REQUESTED"])
      .limit(20);

    if (trips) {
      for (const tr of trips) {
        items.push({
          id: tr.id,
          module: "VEHICLE_DESK",
          moduleName: "Vehicle Desk",
          title: `Trip requisition to ${tr.destination || "Destination"}`,
          code: tr.id.substring(0, 8),
          submittedBy: tr.traveler_name || "Traveler",
          status: tr.status,
          createdAt: tr.created_at,
          href: `/vehicle`,
        });
      }
    }
  } catch (e) {
    console.error("[fetchPendingApprovals] Trips error:", e);
  }

  return items;
}
