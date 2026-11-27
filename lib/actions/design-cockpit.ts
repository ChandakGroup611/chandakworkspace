"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireDesign } from "@/lib/permissions/design-guard";
import { hasPermission } from "@/lib/permissions";

export interface ExpectedDeliverableRow {
  id: string;
  projectId: string;
  projectName: string;
  towerId: string | null;
  towerName: string | null;
  packageId: string;
  packageName: string;
  subPackageId: string | null;
  subPackageName: string | null;
  consultantId: string | null;
  consultantName: string | null;
  expectedDrawingRef: string | null;
  title: string;
  plannedSubmissionDate: string | null;
  responsibleParty: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  milestoneName: string | null;
  matchedDrawingId: string | null;
  matchedDrawingNumber: string | null;
  matchedDrawingStatus: string | null;
  matchedRevNo: number | null;
  isOverdue: boolean;
}

export interface UnmatchedDrawingRow {
  drawingId: string;
  drawingNumber: string;
  referenceNumber: string | null;
  title: string;
  projectId: string;
  projectName: string;
  packageId: string | null;
  packageName: string;
  subPackageName: string | null;
  consultantName: string | null;
  drawingRegisterStatus: string;
}

export interface DesignCockpitData {
  kpis: {
    totalExpected: number;
    totalSubmitted: number;
    pendingSubmissions: number;
    approvedDrawings: number;
    underCoordination: number;
    returnedForRevision: number;
    completedCoordination: number;
    overdueDrawings: number;
    slaBreaches: number;
    upcomingSubmissions: number;
  };
  charts: {
    expectedVsActual: { label: string; expected: number; submitted: number; approved: number }[];
    packageProgress: { packageName: string; total: number; submitted: number; approved: number }[];
    subPackageProgress: { subPackageName: string; packageName: string; total: number; submitted: number }[];
    consultantPerformance: { consultantName: string; expected: number; submitted: number; approved: number; returned: number }[];
    approvalTurnaround: { packageName: string; avgDays: number; count: number }[];
    revisionFrequency: { revision: string; count: number }[];
    pendingByDepartment: { departmentName: string; count: number }[];
    slaBreachTrends: { month: string; breached: number; dueSoon: number }[];
    upcomingDeadlines: { drawingTitle: string; ref: string; plannedDate: string; consultant: string }[];
    monthlyTrends: { month: string; submitted: number; approved: number }[];
  };
  masters: {
    projects: { id: string; name: string }[];
    towers: { id: string; projectId: string; name: string }[];
    packages: { id: string; name: string }[];
    subPackages: { id: string; disciplineId: string; name: string }[];
    consultants: { id: string; name: string }[];
  };
}

async function getUserScopeFilter(userId: string): Promise<{ unrestricted: boolean; projectIds: string[]; towerIds: string[] }> {
  if (await hasPermission(userId, "SUPER_ADMIN")) return { unrestricted: true, projectIds: [], towerIds: [] };
  const { data: access } = await supabaseAdmin.from("design_user_access").select("*").eq("user_id", userId).maybeSingle();
  if (!access) return { unrestricted: true, projectIds: [], towerIds: [] };
  const isAdmin = String(access.design_role || "").toUpperCase() === "DESIGN_ADMIN";
  if (isAdmin || String(access.project_access_type || "ALL").toUpperCase() !== "SPECIFIC") {
    return { unrestricted: true, projectIds: [], towerIds: [] };
  }
  return {
    unrestricted: false,
    projectIds: access.assigned_project_ids || [],
    towerIds: access.assigned_sub_project_ids || [],
  };
}

export async function fetchExpectedDeliverablesAction(): Promise<{
  success: boolean;
  deliverables?: ExpectedDeliverableRow[];
  unmatchedDrawings?: UnmatchedDrawingRow[];
  summary?: {
    totalExpected: number;
    submitted: number;
    pending: number;
    approved: number;
    overdue: number;
    unmatched: number;
  };
  masters?: {
    projects: { id: string; name: string }[];
    towers: { id: string; projectId: string; name: string }[];
    packages: { id: string; name: string }[];
    subPackages: { id: string; disciplineId: string; name: string; defaultConsultant: string | null }[];
    consultants: { id: string; name: string }[];
  };
  error?: string;
}> {
  try {
    const user = await requireDesign("any");
    const scope = await getUserScopeFilter(user.id);

    const [delivRes, projRes, towerRes, pkgRes, subPkgRes, consRes, dmacDrwRes, designDrwRes, dmacProjRes, dmacDeptRes] =
      await Promise.all([
        supabaseAdmin.from("design_expected_deliverables").select("*").eq("is_deleted", false).order("planned_submission_date", { ascending: true }),
        supabaseAdmin.from("design_projects").select("id, name").order("name"),
        supabaseAdmin.from("design_towers").select("id, project_id, tower_name").order("tower_name"),
        supabaseAdmin.from("design_packages").select("id, name").order("name"),
        supabaseAdmin.from("design_sub_packages").select("id, discipline_id, package_name, sub_package_name, default_consultant").order("package_name"),
        supabaseAdmin.from("design_consultants").select("id, firm_name").order("firm_name"),
        supabaseAdmin.from("dmac_drawings").select("id, project_id, building_id, department_id, drawing_number, reference_number, title, sub_package, consultant_name, current_status, latest_rev_no, legacy_drawing_id").is("deleted_at", null),
        supabaseAdmin.from("design_drawings").select("id, status"),
        supabaseAdmin.from("dmac_projects").select("id, name, legacy_design_project_id"),
        supabaseAdmin.from("dmac_departments").select("id, name, legacy_package_id"),
      ]);

    if (delivRes.error) throw delivRes.error;

    const projMap = new Map((projRes.data || []).map((p: any) => [p.id, p.name]));
    const towerMap = new Map((towerRes.data || []).map((t: any) => [t.id, t.tower_name]));
    const pkgMap = new Map((pkgRes.data || []).map((p: any) => [p.id, p.name]));
    const subPkgMap = new Map((subPkgRes.data || []).map((sp: any) => [sp.id, sp.sub_package_name || sp.package_name]));
    const consMap = new Map((consRes.data || []).map((c: any) => [c.id, c.firm_name]));
    const dmacProjMap = new Map((dmacProjRes.data || []).map((p: any) => [p.id, p]));
    const dmacDeptMap = new Map((dmacDeptRes.data || []).map((d: any) => [d.id, d]));
    const designDrwMap = new Map((designDrwRes.data || []).map((r: any) => [r.id, r.status]));
    const dmacDrwMap = new Map((dmacDrwRes.data || []).map((d: any) => [d.id, d]));

    const todayStr = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
    const matchedIds = new Set<string>();

    const deliverables: ExpectedDeliverableRow[] = (delivRes.data || [])
      .filter((r: any) => scope.unrestricted || scope.projectIds.includes(r.project_id))
      .filter((r: any) => scope.unrestricted || scope.towerIds.length === 0 || !r.tower_id || scope.towerIds.includes(r.tower_id))
      .map((r: any) => {
        const md = r.matched_drawing_id ? dmacDrwMap.get(r.matched_drawing_id) : null;
        if (md) matchedIds.add(md.id);
        const status = md ? designDrwMap.get(md.legacy_drawing_id || md.id) || md.current_status : null;
        const isOverdue = !md && !!r.planned_submission_date && String(r.planned_submission_date) < todayStr;
        return {
          id: r.id,
          projectId: r.project_id,
          projectName: projMap.get(r.project_id) || "—",
          towerId: r.tower_id || null,
          towerName: r.tower_id ? towerMap.get(r.tower_id) || null : null,
          packageId: r.package_id,
          packageName: pkgMap.get(r.package_id) || "—",
          subPackageId: r.sub_package_id || null,
          subPackageName: r.sub_package_name || (r.sub_package_id ? subPkgMap.get(r.sub_package_id) || null : null),
          consultantId: r.consultant_id || null,
          consultantName: r.consultant_name || (r.consultant_id ? consMap.get(r.consultant_id) || null : null),
          expectedDrawingRef: r.expected_drawing_ref || null,
          title: r.title,
          plannedSubmissionDate: r.planned_submission_date || null,
          responsibleParty: r.responsible_party || null,
          priority: r.priority || "MEDIUM",
          milestoneName: r.milestone_name || null,
          matchedDrawingId: md?.id || null,
          matchedDrawingNumber: md?.drawing_number || null,
          matchedDrawingStatus: status,
          matchedRevNo: md?.latest_rev_no ?? null,
          isOverdue,
        };
      });

    const unmatchedDrawings: UnmatchedDrawingRow[] = (dmacDrwRes.data || [])
      .filter((d: any) => !matchedIds.has(d.id))
      .map((d: any) => {
        const dp = dmacProjMap.get(d.project_id);
        const dd = dmacDeptMap.get(d.department_id);
        const pid = dp?.legacy_design_project_id || d.project_id;
        return {
          drawingId: d.id,
          drawingNumber: d.drawing_number,
          referenceNumber: d.reference_number || null,
          title: d.title,
          projectId: pid,
          projectName: dp?.name || "—",
          packageId: dd?.legacy_package_id || null,
          packageName: dd?.name || "—",
          subPackageName: d.sub_package || null,
          consultantName: d.consultant_name || null,
          drawingRegisterStatus: designDrwMap.get(d.legacy_drawing_id || d.id) || d.current_status,
        };
      })
      .filter((d) => scope.unrestricted || scope.projectIds.includes(d.projectId));

    const summary = {
      totalExpected: deliverables.length,
      submitted: deliverables.filter((d) => !!d.matchedDrawingId).length,
      pending: deliverables.filter((d) => !d.matchedDrawingId).length,
      approved: deliverables.filter((d) => d.matchedDrawingStatus === "Approved" || d.matchedDrawingStatus === "Approved (GFC)" || d.matchedDrawingStatus === "Site Handed Over").length,
      overdue: deliverables.filter((d) => d.isOverdue).length,
      unmatched: unmatchedDrawings.length,
    };

    return {
      success: true,
      deliverables,
      unmatchedDrawings,
      summary,
      masters: {
        projects: (projRes.data || [])
          .filter((p: any) => scope.unrestricted || scope.projectIds.includes(p.id))
          .map((p: any) => ({ id: p.id, name: p.name })),
        towers: (towerRes.data || [])
          .filter((t: any) => scope.unrestricted || scope.towerIds.length === 0 || scope.towerIds.includes(t.id))
          .map((t: any) => ({ id: t.id, projectId: t.project_id, name: t.tower_name })),
        packages: (pkgRes.data || []).map((p: any) => ({ id: p.id, name: p.name })),
        subPackages: (subPkgRes.data || []).map((sp: any) => ({
          id: sp.id,
          disciplineId: sp.discipline_id,
          name: sp.sub_package_name || sp.package_name,
          defaultConsultant: sp.default_consultant || null,
        })),
        consultants: (consRes.data || []).map((c: any) => ({ id: c.id, name: c.firm_name })),
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load expected deliverables." };
  }
}

export async function saveExpectedDeliverableAction(params: {
  id?: string;
  projectId: string;
  towerId?: string | null;
  packageId: string;
  subPackageId?: string | null;
  subPackageName?: string | null;
  consultantId?: string | null;
  consultantName?: string | null;
  expectedDrawingRef?: string | null;
  title: string;
  plannedSubmissionDate?: string | null;
  responsibleParty?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  milestoneName?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireDesign("drawings", [params.projectId], params.towerId ? [params.towerId] : undefined);
    const title = String(params.title || "").trim();
    if (!title) throw new Error("Drawing title is required.");

    const payload = {
      project_id: params.projectId,
      tower_id: params.towerId || null,
      package_id: params.packageId,
      sub_package_id: params.subPackageId || null,
      sub_package_name: params.subPackageName || null,
      consultant_id: params.consultantId || null,
      consultant_name: params.consultantName || null,
      expected_drawing_ref: params.expectedDrawingRef ? String(params.expectedDrawingRef).trim() : null,
      title,
      planned_submission_date: params.plannedSubmissionDate || null,
      responsible_party: params.responsibleParty ? String(params.responsibleParty).trim() : null,
      priority: params.priority || "MEDIUM",
      milestone_name: params.milestoneName ? String(params.milestoneName).trim() : null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (params.id) {
      const { error } = await supabaseAdmin.from("design_expected_deliverables").update(payload).eq("id", params.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("design_expected_deliverables").insert({ ...payload, created_by: user.id });
      if (error) throw error;
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not save expected deliverable." };
  }
}

export async function deleteExpectedDeliverableAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: existing } = await supabaseAdmin.from("design_expected_deliverables").select("project_id, tower_id").eq("id", id).single();
    if (!existing) throw new Error("Deliverable not found.");
    const user = await requireDesign("masters", [existing.project_id], existing.tower_id ? [existing.tower_id] : undefined);
    const { error } = await supabaseAdmin
      .from("design_expected_deliverables")
      .update({ is_deleted: true, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not delete expected deliverable." };
  }
}

export async function matchExpectedDeliverableAction(params: {
  expectedId: string;
  drawingId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: existing } = await supabaseAdmin.from("design_expected_deliverables").select("project_id, tower_id").eq("id", params.expectedId).single();
    if (!existing) throw new Error("Deliverable not found.");
    const user = await requireDesign("drawings", [existing.project_id], existing.tower_id ? [existing.tower_id] : undefined);
    const { error } = await supabaseAdmin
      .from("design_expected_deliverables")
      .update({ matched_drawing_id: params.drawingId || null, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", params.expectedId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not match deliverable." };
  }
}

/** Deterministic auto-match by exact reference number within project & package (never fuzzy title match). */
export async function autoMatchDrawingToExpectedDeliverable(params: {
  drawingId: string;
  projectId: string;
  departmentId: string;
  referenceNumber?: string | null;
}) {
  if (!params.referenceNumber) return;
  const [{ data: dp }, { data: dd }] = await Promise.all([
    supabaseAdmin.from("dmac_projects").select("legacy_design_project_id").eq("id", params.projectId).maybeSingle(),
    supabaseAdmin.from("dmac_departments").select("legacy_package_id").eq("id", params.departmentId).maybeSingle(),
  ]);
  const legacyProjId = dp?.legacy_design_project_id;
  const legacyPkgId = dd?.legacy_package_id;
  if (!legacyProjId || !legacyPkgId) return;

  const { data: matches } = await supabaseAdmin
    .from("design_expected_deliverables")
    .select("id")
    .eq("project_id", legacyProjId)
    .eq("package_id", legacyPkgId)
    .ilike("expected_drawing_ref", params.referenceNumber.trim())
    .is("matched_drawing_id", null)
    .eq("is_deleted", false);

  // Only auto-match if unambiguous (single exact match)
  if (matches && matches.length === 1) {
    await supabaseAdmin
      .from("design_expected_deliverables")
      .update({ matched_drawing_id: params.drawingId, updated_at: new Date().toISOString() })
      .eq("id", matches[0].id);
  }
}

export async function fetchDesignCockpitAction(filters?: {
  projectId?: string;
  towerId?: string;
  packageId?: string;
  subPackageName?: string;
  consultantName?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ success: boolean; data?: DesignCockpitData; error?: string }> {
  try {
    const user = await requireDesign("any");
    const scope = await getUserScopeFilter(user.id);

    const [delivRes, drwRes, designDrwRes, revRes, trackerRes, dmacProjRes, dmacDeptRes, deptRes, projRes, towerRes, pkgRes, subPkgRes, consRes] =
      await Promise.all([
        supabaseAdmin.from("design_expected_deliverables").select("*").eq("is_deleted", false),
        supabaseAdmin.from("dmac_drawings").select("id, project_id, building_id, department_id, drawing_number, title, sub_package, consultant_name, current_status, latest_rev_no, created_at, legacy_drawing_id").is("deleted_at", null),
        supabaseAdmin.from("design_drawings").select("id, status, submitted_date, approved_date"),
        supabaseAdmin.from("dmac_drawing_revisions").select("drawing_id, rev_no, submitted_at"),
        supabaseAdmin.from("drawing_coordination_tracker").select("*"),
        supabaseAdmin.from("dmac_projects").select("id, legacy_design_project_id, name"),
        supabaseAdmin.from("dmac_departments").select("id, legacy_package_id, name"),
        supabaseAdmin.from("departments").select("id, name"),
        supabaseAdmin.from("design_projects").select("id, name").order("name"),
        supabaseAdmin.from("design_towers").select("id, project_id, tower_name").order("tower_name"),
        supabaseAdmin.from("design_packages").select("id, name").order("name"),
        supabaseAdmin.from("design_sub_packages").select("id, discipline_id, package_name, sub_package_name").order("package_name"),
        supabaseAdmin.from("design_consultants").select("id, firm_name").order("firm_name"),
      ]);

    const dmacProjMap = new Map((dmacProjRes.data || []).map((p: any) => [p.id, p]));
    const dmacDeptMap = new Map((dmacDeptRes.data || []).map((d: any) => [d.id, d]));
    const designDrwMap = new Map((designDrwRes.data || []).map((r: any) => [r.id, r]));
    const trackerByDrw = new Map((trackerRes.data || []).map((t: any) => [t.drawing_id, t]));
    const deptNameMap = new Map((deptRes.data || []).map((d: any) => [d.id, d.name]));

    const fProj = filters?.projectId && filters.projectId !== "ALL" ? filters.projectId : null;
    const fPkg = filters?.packageId && filters.packageId !== "ALL" ? filters.packageId : null;
    const fSub = filters?.subPackageName && filters.subPackageName !== "ALL" ? filters.subPackageName : null;
    const fCons = filters?.consultantName && filters.consultantName !== "ALL" ? filters.consultantName : null;

    const deliverables = (delivRes.data || []).filter((r: any) => {
      if (!scope.unrestricted && !scope.projectIds.includes(r.project_id)) return false;
      if (fProj && r.project_id !== fProj) return false;
      if (fPkg && r.package_id !== fPkg) return false;
      if (fSub && (r.sub_package_name || "") !== fSub) return false;
      if (fCons && (r.consultant_name || "") !== fCons) return false;
      return true;
    });

    const drawings = (drwRes.data || []).filter((d: any) => {
      const dp = dmacProjMap.get(d.project_id);
      const dd = dmacDeptMap.get(d.department_id);
      const pid = dp?.legacy_design_project_id || d.project_id;
      const pkgId = dd?.legacy_package_id || d.department_id;
      if (!scope.unrestricted && !scope.projectIds.includes(pid)) return false;
      if (fProj && pid !== fProj) return false;
      if (fPkg && pkgId !== fPkg) return false;
      if (fSub && (d.sub_package || "") !== fSub) return false;
      if (fCons && (d.consultant_name || "") !== fCons) return false;
      if (filters?.dateFrom && String(d.created_at).slice(0, 10) < filters.dateFrom) return false;
      if (filters?.dateTo && String(d.created_at).slice(0, 10) > filters.dateTo) return false;
      return true;
    });

    const todayStr = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
    const next7Str = new Date(Date.now() + 5.5 * 3600 * 1000 + 7 * 86400000).toISOString().slice(0, 10);

    const kpis = {
      totalExpected: deliverables.length,
      totalSubmitted: drawings.filter((d: any) => d.current_status !== "NOT_SUBMITTED").length,
      pendingSubmissions: deliverables.filter((r: any) => !r.matched_drawing_id).length,
      approvedDrawings: drawings.filter((d: any) => d.current_status === "APPROVED" || d.current_status === "GFC").length,
      underCoordination: drawings.filter((d: any) => {
        const t = trackerByDrw.get(d.id);
        return t && !t.is_closed;
      }).length,
      returnedForRevision: drawings.filter((d: any) => {
        const t = trackerByDrw.get(d.id);
        return d.current_status === "RETURNED" || t?.coordination_status_code === "RETURNED_FOR_REVISION";
      }).length,
      completedCoordination: drawings.filter((d: any) => trackerByDrw.get(d.id)?.is_closed).length,
      overdueDrawings: deliverables.filter((r: any) => !r.matched_drawing_id && r.planned_submission_date && r.planned_submission_date < todayStr).length,
      slaBreaches: drawings.filter((d: any) => trackerByDrw.get(d.id)?.sla_status_code === "SLA_BREACHED").length,
      upcomingSubmissions: deliverables.filter((r: any) => !r.matched_drawing_id && r.planned_submission_date && r.planned_submission_date >= todayStr && r.planned_submission_date <= next7Str).length,
    };

    // Package Progress
    const pkgAgg = new Map<string, { packageName: string; total: number; submitted: number; approved: number }>();
    for (const d of drawings) {
      const pkgName = dmacDeptMap.get(d.department_id)?.name || "Other";
      const cur = pkgAgg.get(pkgName) || { packageName: pkgName, total: 0, submitted: 0, approved: 0 };
      cur.total++;
      if (d.current_status !== "NOT_SUBMITTED") cur.submitted++;
      if (d.current_status === "APPROVED" || d.current_status === "GFC") cur.approved++;
      pkgAgg.set(pkgName, cur);
    }

    // Sub-package Progress
    const subAgg = new Map<string, { subPackageName: string; packageName: string; total: number; submitted: number }>();
    for (const d of drawings) {
      const spName = d.sub_package || "General";
      const pkgName = dmacDeptMap.get(d.department_id)?.name || "Other";
      const cur = subAgg.get(`${pkgName}::${spName}`) || { subPackageName: spName, packageName: pkgName, total: 0, submitted: 0 };
      cur.total++;
      if (d.current_status !== "NOT_SUBMITTED") cur.submitted++;
      subAgg.set(`${pkgName}::${spName}`, cur);
    }

    // Consultant Performance
    const consAgg = new Map<string, { consultantName: string; expected: number; submitted: number; approved: number; returned: number }>();
    for (const r of deliverables) {
      const cname = r.consultant_name || "Unassigned";
      const cur = consAgg.get(cname) || { consultantName: cname, expected: 0, submitted: 0, approved: 0, returned: 0 };
      cur.expected++;
      consAgg.set(cname, cur);
    }
    for (const d of drawings) {
      const cname = d.consultant_name || "Unassigned";
      const cur = consAgg.get(cname) || { consultantName: cname, expected: 0, submitted: 0, approved: 0, returned: 0 };
      if (d.current_status !== "NOT_SUBMITTED") cur.submitted++;
      if (d.current_status === "APPROVED" || d.current_status === "GFC") cur.approved++;
      if (d.current_status === "RETURNED") cur.returned++;
      consAgg.set(cname, cur);
    }

    // Approval Turnaround
    const turnAgg = new Map<string, { packageName: string; sumDays: number; count: number }>();
    for (const d of drawings) {
      const dd = designDrwMap.get(d.legacy_drawing_id || d.id);
      if (dd?.submitted_date && dd?.approved_date) {
        const diff = Math.max(0, Math.round((new Date(dd.approved_date).getTime() - new Date(dd.submitted_date).getTime()) / 86400000));
        const pkgName = dmacDeptMap.get(d.department_id)?.name || "Other";
        const cur = turnAgg.get(pkgName) || { packageName: pkgName, sumDays: 0, count: 0 };
        cur.sumDays += diff;
        cur.count++;
        turnAgg.set(pkgName, cur);
      }
    }

    // Revision Frequency
    const revCounts = new Map<string, number>();
    for (const d of drawings) {
      const lbl = `R${d.latest_rev_no ?? 0}`;
      revCounts.set(lbl, (revCounts.get(lbl) || 0) + 1);
    }

    // Pending by Responsible Department
    const deptPend = new Map<string, number>();
    for (const d of drawings) {
      const t = trackerByDrw.get(d.id);
      if (t && !t.is_closed) {
        const dn = t.current_responsible_department_id ? deptNameMap.get(t.current_responsible_department_id) || "Unassigned" : "Unassigned";
        deptPend.set(dn, (deptPend.get(dn) || 0) + 1);
      }
    }

    // Monthly Trends & SLA Breach Trends
    const monthTrend = new Map<string, { month: string; submitted: number; approved: number }>();
    const slaTrend = new Map<string, { month: string; breached: number; dueSoon: number }>();
    for (const d of drawings) {
      const m = String(d.created_at).slice(0, 7);
      const mt = monthTrend.get(m) || { month: m, submitted: 0, approved: 0 };
      if (d.current_status !== "NOT_SUBMITTED") mt.submitted++;
      if (d.current_status === "APPROVED" || d.current_status === "GFC") mt.approved++;
      monthTrend.set(m, mt);

      const t = trackerByDrw.get(d.id);
      if (t && (t.sla_status_code === "SLA_BREACHED" || t.sla_status_code === "DUE_SOON")) {
        const sm = String(t.sla_breached_at || t.updated_at || d.created_at).slice(0, 7);
        const st = slaTrend.get(sm) || { month: sm, breached: 0, dueSoon: 0 };
        if (t.sla_status_code === "SLA_BREACHED") st.breached++;
        else st.dueSoon++;
        slaTrend.set(sm, st);
      }
    }

    const upcomingDeadlines = deliverables
      .filter((r: any) => !r.matched_drawing_id && r.planned_submission_date)
      .sort((a: any, b: any) => String(a.planned_submission_date).localeCompare(String(b.planned_submission_date)))
      .slice(0, 10)
      .map((r: any) => ({
        drawingTitle: r.title,
        ref: r.expected_drawing_ref || "—",
        plannedDate: r.planned_submission_date,
        consultant: r.consultant_name || "—",
      }));

    return {
      success: true,
      data: {
        kpis,
        charts: {
          expectedVsActual: Array.from(pkgAgg.values()).map((p) => ({
            label: p.packageName,
            expected: deliverables.filter((r: any) => r.package_id === (dmacDeptRes.data || []).find((x: any) => x.name === p.packageName)?.legacy_package_id).length,
            submitted: p.submitted,
            approved: p.approved,
          })),
          packageProgress: Array.from(pkgAgg.values()),
          subPackageProgress: Array.from(subAgg.values()),
          consultantPerformance: Array.from(consAgg.values()),
          approvalTurnaround: Array.from(turnAgg.values()).map((x) => ({
            packageName: x.packageName,
            avgDays: x.count ? Math.round((x.sumDays / x.count) * 10) / 10 : 0,
            count: x.count,
          })),
          revisionFrequency: Array.from(revCounts.entries()).map(([revision, count]) => ({ revision, count })),
          pendingByDepartment: Array.from(deptPend.entries()).map(([departmentName, count]) => ({ departmentName, count })),
          slaBreachTrends: Array.from(slaTrend.values()).sort((a, b) => a.month.localeCompare(b.month)),
          upcomingDeadlines,
          monthlyTrends: Array.from(monthTrend.values()).sort((a, b) => a.month.localeCompare(b.month)),
        },
        masters: {
          projects: (projRes.data || [])
            .filter((p: any) => scope.unrestricted || scope.projectIds.includes(p.id))
            .map((p: any) => ({ id: p.id, name: p.name })),
          towers: (towerRes.data || [])
            .filter((t: any) => scope.unrestricted || scope.towerIds.length === 0 || scope.towerIds.includes(t.id))
            .map((t: any) => ({ id: t.id, projectId: t.project_id, name: t.tower_name })),
          packages: (pkgRes.data || []).map((p: any) => ({ id: p.id, name: p.name })),
          subPackages: (subPkgRes.data || []).map((sp: any) => ({
            id: sp.id,
            disciplineId: sp.discipline_id,
            name: sp.sub_package_name || sp.package_name,
          })),
          consultants: (consRes.data || []).map((c: any) => ({ id: c.id, name: c.firm_name })),
        },
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load Design Cockpit." };
  }
}
