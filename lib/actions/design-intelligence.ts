"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireDesign } from "@/lib/permissions/design-guard";
import { hasPermission } from "@/lib/permissions";

export interface DesignAnomalyItem {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  category: "REVISION_CHURN" | "STALLED_TRACKER" | "OVERDUE_DELIVERABLE" | "SLA_BREACH";
  title: string;
  detail: string;
  projectName: string;
  linkUrl: string;
  detectedAt: string;
}

export interface ForecastBucket {
  label: string;
  expectedCount: number;
  matchedCount: number;
  overdueCount: number;
}

export interface DesignIntelligencePayload {
  gfcReadinessPct: number;
  totalDrawings: number;
  gfcApprovedCount: number;
  highChurnCount: number;
  stalledCount: number;
  overdueExpectedCount: number;
  anomalies: DesignAnomalyItem[];
  forecastBuckets: ForecastBucket[];
  projects: Array<{ id: string; name: string }>;
}

async function getUserScope(userId: string): Promise<{ unrestricted: boolean; projectIds: string[] }> {
  if (await hasPermission(userId, "SUPER_ADMIN")) return { unrestricted: true, projectIds: [] };
  const { data: access } = await supabaseAdmin.from("design_user_access").select("*").eq("user_id", userId).maybeSingle();
  if (!access) return { unrestricted: true, projectIds: [] };
  const isAdmin = String(access.design_role || "").toUpperCase() === "DESIGN_ADMIN";
  if (isAdmin || String(access.project_access_type || "ALL").toUpperCase() !== "SPECIFIC") {
    return { unrestricted: true, projectIds: [] };
  }
  return { unrestricted: false, projectIds: access.assigned_project_ids || [] };
}

export async function fetchDesignIntelligenceAction(projectIdFilter?: string): Promise<{
  success: boolean;
  data?: DesignIntelligencePayload;
  error?: string;
}> {
  try {
    const user = await requireDesign("any", projectIdFilter || undefined);
    const scope = await getUserScope(user.id);

    const [drawRes, trkRes, expRes, projRes] = await Promise.all([
      supabaseAdmin.from("dmac_drawings").select("id, drawing_number, title, project_id, current_status, latest_rev_no, updated_at"),
      supabaseAdmin.from("drawing_coordination_tracker").select("*").eq("is_closed", false),
      supabaseAdmin.from("design_expected_deliverables").select("*"),
      supabaseAdmin.from("dmac_projects").select("id, name"),
    ]);

    const projMap = new Map((projRes.data || []).map((p: any) => [p.id, p.name]));
    const scopeSet = new Set(scope.projectIds);

    const filterProject = (pid: string | null | undefined) => {
      if (projectIdFilter && pid !== projectIdFilter) return false;
      if (!scope.unrestricted && pid && !scopeSet.has(pid)) return false;
      return true;
    };

    const drawings = (drawRes.data || []).filter((d: any) => filterProject(d.project_id));
    const trackers = (trkRes.data || []).filter((t: any) => filterProject(t.project_id));
    const expected = (expRes.data || []).filter((e: any) => filterProject(e.project_id));

    const now = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);
    const anomalies: DesignAnomalyItem[] = [];

    const highChurn = drawings.filter((d: any) => Number(d.latest_rev_no || 0) >= 2);
    for (const d of highChurn.slice(0, 20)) {
      anomalies.push({
        id: `churn-${d.id}`,
        severity: Number(d.latest_rev_no) >= 4 ? "CRITICAL" : "HIGH",
        category: "REVISION_CHURN",
        title: `${d.drawing_number} — ${d.latest_rev_no} Revisions`,
        detail: `${d.title} has undergone ${d.latest_rev_no} revision cycles.`,
        projectName: projMap.get(d.project_id) || "Project",
        linkUrl: "/design/drawings",
        detectedAt: d.updated_at || new Date().toISOString(),
      });
    }

    const stalled = trackers.filter((t: any) => {
      const updated = new Date(t.updated_at || t.created_at).getTime();
      return (now - updated) / 86400000 >= 7;
    });
    for (const t of stalled.slice(0, 20)) {
      const daysIdle = Math.floor((now - new Date(t.updated_at || t.created_at).getTime()) / 86400000);
      anomalies.push({
        id: `stall-${t.id}`,
        severity: daysIdle >= 14 ? "CRITICAL" : "MEDIUM",
        category: "STALLED_TRACKER",
        title: `${t.drawing_number} stalled (${daysIdle}d idle)`,
        detail: `Status: ${t.coordination_status_code.replace(/_/g, " ")}${t.sla_paused ? " (SLA Paused)" : ""}`,
        projectName: projMap.get(t.project_id) || "Project",
        linkUrl: "/design/tracker",
        detectedAt: t.updated_at || t.created_at,
      });
    }

    for (const t of trackers.filter((x: any) => !x.sla_paused && x.sla_status_code === "SLA_BREACHED").slice(0, 20)) {
      anomalies.push({
        id: `sla-${t.id}`,
        severity: "CRITICAL",
        category: "SLA_BREACH",
        title: `${t.drawing_number} — SLA Breached`,
        detail: `Due date ${t.sla_due_at ? new Date(t.sla_due_at).toLocaleDateString("en-IN") : "—"} exceeded.`,
        projectName: projMap.get(t.project_id) || "Project",
        linkUrl: "/design/sla-calendar",
        detectedAt: t.sla_breached_at || t.updated_at,
      });
    }

    const overdueExpected = expected.filter(
      (e: any) => !e.matched_drawing_id && e.planned_submission_date && e.planned_submission_date < todayStr
    );
    for (const e of overdueExpected.slice(0, 20)) {
      anomalies.push({
        id: `exp-${e.id}`,
        severity: "HIGH",
        category: "OVERDUE_DELIVERABLE",
        title: `Missing: ${e.expected_drawing_ref || e.title}`,
        detail: `Planned submission ${e.planned_submission_date} has no matched drawing.`,
        projectName: projMap.get(e.project_id) || "Project",
        linkUrl: "/design/expected",
        detectedAt: e.updated_at || e.created_at,
      });
    }

    const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
    anomalies.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

    const gfcApprovedCount = drawings.filter((d: any) =>
      ["APPROVED", "GFC_RELEASED", "GFC", "COMPLETED", "CLOSED"].includes(String(d.current_status || "").toUpperCase())
    ).length;
    const gfcReadinessPct = drawings.length > 0 ? Math.round((gfcApprovedCount / drawings.length) * 100) : 0;

    const d14 = new Date(now + 14 * 86400000).toISOString().slice(0, 10);
    const d30 = new Date(now + 30 * 86400000).toISOString().slice(0, 10);

    const bucketFor = (label: string, pred: (dt: string) => boolean): ForecastBucket => {
      const rows = expected.filter((e: any) => e.planned_submission_date && pred(e.planned_submission_date));
      return {
        label,
        expectedCount: rows.length,
        matchedCount: rows.filter((r: any) => Boolean(r.matched_drawing_id)).length,
        overdueCount: rows.filter((r: any) => !r.matched_drawing_id && r.planned_submission_date < todayStr).length,
      };
    };

    const forecastBuckets: ForecastBucket[] = [
      bucketFor("Backlog / Overdue", (dt) => dt < todayStr),
      bucketFor("Next 14 Days", (dt) => dt >= todayStr && dt <= d14),
      bucketFor("15–30 Days", (dt) => dt > d14 && dt <= d30),
    ];

    const projects = (projRes.data || [])
      .filter((p: any) => scope.unrestricted || scopeSet.has(p.id))
      .map((p: any) => ({ id: p.id, name: p.name }));

    return {
      success: true,
      data: {
        gfcReadinessPct,
        totalDrawings: drawings.length,
        gfcApprovedCount,
        highChurnCount: highChurn.length,
        stalledCount: stalled.length,
        overdueExpectedCount: overdueExpected.length,
        anomalies,
        forecastBuckets,
        projects,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load design intelligence" };
  }
}

export async function exportDesignRegisterCsvAction(projectIdFilter?: string): Promise<{
  success: boolean;
  csv?: string;
  filename?: string;
  error?: string;
}> {
  try {
    const user = await requireDesign("any", projectIdFilter || undefined);
    const scope = await getUserScope(user.id);

    const [drawRes, projRes, deptRes] = await Promise.all([
      supabaseAdmin
        .from("dmac_drawings")
        .select("drawing_number, reference_number, title, project_id, department_id, consultant_name, current_status, latest_rev_no, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("dmac_projects").select("id, name"),
      supabaseAdmin.from("dmac_departments").select("id, name"),
    ]);

    const projMap = new Map((projRes.data || []).map((p: any) => [p.id, p.name]));
    const deptMap = new Map((deptRes.data || []).map((d: any) => [d.id, d.name]));
    const scopeSet = new Set(scope.projectIds);

    const rows = (drawRes.data || []).filter(
      (d: any) => (scope.unrestricted || scopeSet.has(d.project_id)) && (!projectIdFilter || d.project_id === projectIdFilter)
    );

    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Drawing Number", "Reference Number", "Title", "Project", "Department", "Consultant", "Status", "Current Rev", "Created At"].map(esc).join(",");
    const lines = rows.map((r: any) =>
      [
        r.drawing_number,
        r.reference_number || "",
        r.title,
        projMap.get(r.project_id) || "",
        deptMap.get(r.department_id) || "",
        r.consultant_name || "",
        r.current_status,
        r.latest_rev_no ?? 0,
        r.created_at,
      ]
        .map(esc)
        .join(",")
    );

    return {
      success: true,
      csv: "\uFEFF" + [header, ...lines].join("\r\n"),
      filename: `design-register-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Export failed" };
  }
}
