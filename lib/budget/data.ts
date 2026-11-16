// Server only: reads the budget tables as the signed-in user.
import { createClient } from "./supabase";

// Reads for the budget screens. All calculated figures come from the database views
// (budget_line_figures, budget_version_totals, ...), so every screen shows the same numbers.

// The signed-in member: role and rights are set up in this module (Settings → Access); the person
// comes from the Chandak Workspace users. null project_ids / department_ids means "all".
export interface Me {
  user_id: string; role: string; role_id: number; permissions: string[]; project_ids: number[] | null;
  department_ids: number[] | null; name: string | null; email: string | null;
  is_super_admin?: boolean;
}
export interface Project { id: number; code: string; name: string; location: string | null; fy_start_month: number }
export interface Version {
  id: number; project_id: number; number: number; as_on: string; status: "draft" | "in_review" | "approved"; reason: string | null;
  parent_id: number | null; areas: Areas; category_reasons: Record<string, string>; prepared_by: string | null;
  approved_by: string | null; approved_at: string | null;
  /** Remark per department id, kept per version. */
  department_remarks: Record<string, string>;
  /** Per tower id: the OC date as revised in this version and why it moved; construction BUA and design area for the version. */
  tower_notes: Record<string, { oc_date?: string; reason?: string; bua?: number; design_area?: number }>;
}
export interface Areas {
  total_carpet?: number | null; sold_area?: number | null; eng_area?: number | null; design_area?: number | null;
  sale_value_cr?: number | null; residential_area?: number | null; commercial_area?: number | null; retail_area?: number | null;
  society_sale_area?: number | null; commitments?: { name: string; area: number }[];
}
export interface Totals {
  version_id: number; project_id: number; number: number; label: string; as_on: string; status: string;
  total_carpet: number | null; eng_area: number | null; initial_cr: number; ctc_cr: number; incurred_cr: number;
  balance_cr: number; variance_cr: number; util_pct: number | null;
}
export interface LineFigure {
  line_id: number; version_id: number; cost_head_id: number; department_id: number; department: string;
  summary_category: string; department_sort: number; category: string; sub_category: string | null; note: string | null;
  cost_head_sort: number; is_tax: boolean; subproject_id: number | null; subproject: string | null; summary_subcategory: string;
  initial_paise: number; ctc_paise: number; incurred_paise: number; initial_cr: number; ctc_cr: number; incurred_cr: number;
  balance_cr: number; variance_cr: number; util_pct: number | null; psf_initial: number | null; psf_ctc: number | null;
  initial_calculated: boolean; ctc_calculated: boolean; incurred_source: string; over_budget: boolean; remark: string | null;
  source: "excel" | "manual"; import_id: number | null;
  /** Memo item: shown for reference, outside every total. */
  is_memo: boolean;
  /** How CTC is set: typed, rate × area, balance of a total, or the GST rule. */
  ctc_rule: "typed" | "rate" | "balance" | "tax";
  ctc_rate: number | null; ctc_basis: string | null; balance_of_paise: number | null; balance_scope: "category" | "department" | null;
}
export interface Line {
  id: number; cost_head_id: number; subproject_id: number | null; initial_paise: number | null; ctc_paise: number | null;
  incurred_override_paise: number | null; remark: string | null; source: string;
}
export interface Head {
  id: number; project_id: number; department_id: number; category: string; sub_category: string | null; note: string | null;
  summary_subcategory: string | null; sort: number; is_tax: boolean; tax_rate_pct: number | null; tax_share_pct: number | null;
  tax_base: number[]; active: boolean;
}
export interface Department { id: number; name: string; summary_category: string; sort: number }
export interface Tower {
  id: number; project_id: number; name: string; type: string | null; carpet_area: number | null; eng_area: number | null;
  oc_date: string | null; sort: number;
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function getSession() {
  const sb = await createClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) return { sb, me: null as Me | null, signedIn: false };

  let me: Me | null = null;
  try {
    const res = await sb.rpc("budget_my_access");
    if (res.data) me = res.data as Me;
  } catch (err) {
    console.warn("[Budget] budget_my_access error:", err);
  }

  // Check if current user has Super Admin authority in Chandak Workspace
  const isSuperJwt =
    data.user.app_metadata?.role === "SUPER_ADMIN" ||
    me?.is_super_admin === true;

  // Super-admin comes only from the database role (user_master / roles), never from user_metadata (which a user can edit on their own account) or a list of email addresses.
  let isSuper = isSuperJwt;

  if (!isSuper) {
    try {
      const { data: um } = await sb
        .from("user_master")
        .select("full_name, email, role_id, role:roles(code)")
        .eq("id", data.user.id)
        .maybeSingle();

      const roleCode = (Array.isArray(um?.role) ? (um?.role[0] as any)?.code : (um?.role as any)?.code)?.toUpperCase();
      if (["SUPER_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ADMIN", "SUPERADMIN"].includes(roleCode)) {
        isSuper = true;
      }
    } catch {}
  }

  // Super Admin: grant universal unrestricted access across all projects, versions, cost heads, and lines
  if (isSuper) {
    const { data: allPerms } = await sb.from("budget_permissions").select("code");
    const permCodes = allPerms ? allPerms.map((p: any) => p.code) : [];
    me = {
      user_id: data.user.id,
      role: "Super Administrator",
      role_id: 1, // System Administrator
      permissions: permCodes.length > 0 ? permCodes : (me?.permissions || []),
      project_ids: null, // Unlimited: all projects
      department_ids: null, // Unlimited: all departments
      name: me?.name || data.user.user_metadata?.full_name || "Super Administrator",
      email: me?.email || data.user.email || null,
      is_super_admin: true,
    };
  }

  return { sb, me, signedIn: true };
}
export type Db = Awaited<ReturnType<typeof createClient>>;

export async function getProjects(sb: Db) {
  return must(await sb.from("budget_projects").select("id, code, name, location, fy_start_month").order("name")) as Project[];
}
export async function getVersions(sb: Db, projectId?: number) {
  let q = sb.from("budget_versions").select("id, project_id, number, as_on, status, reason, parent_id, areas, category_reasons, prepared_by, approved_by, approved_at, department_remarks, tower_notes");
  if (projectId != null) q = q.eq("project_id", projectId);
  return must(await q.order("number")) as Version[];
}
export async function getTotals(sb: Db, projectId?: number) {
  let q = sb.from("budget_version_totals").select("*");
  if (projectId != null) q = q.eq("project_id", projectId);
  return must(await q.order("number")) as Totals[];
}
export async function getMemberNames(sb: Db) {
  const rows = must(await sb.rpc("budget_member_names")) as { user_id: string; name: string }[];
  return Object.fromEntries(rows.map((r) => [r.user_id, r.name])) as Record<string, string>;
}
export async function getLineFigures(sb: Db, versionId: number) {
  return must(await sb.from("budget_line_figures").select("*").eq("version_id", versionId)
    .order("department_sort").order("cost_head_sort").order("subproject_id", { nullsFirst: true })) as LineFigure[];
}
export async function getLines(sb: Db, versionId: number) {
  return must(await sb.from("budget_lines").select("id, cost_head_id, subproject_id, initial_paise, ctc_paise, incurred_override_paise, remark, source")
    .eq("version_id", versionId)) as Line[];
}
export async function getHeads(sb: Db, projectId: number) {
  return must(await sb.from("budget_cost_heads").select("*").eq("project_id", projectId).order("sort")) as Head[];
}
export async function getDepartments(sb: Db) {
  return must(await sb.from("budget_departments").select("id, name, summary_category, sort").order("sort")) as Department[];
}
export async function getTowers(sb: Db, projectId: number) {
  return must(await sb.from("budget_subprojects").select("id, project_id, name, type, carpet_area, eng_area, oc_date, sort")
    .eq("project_id", projectId).order("sort")) as Tower[];
}
export async function getDepartmentTotals(sb: Db, versionId: number) {
  return must(await sb.from("budget_department_totals").select("*").eq("version_id", versionId).order("department_sort")) as
    (Pick<Totals, "initial_cr" | "ctc_cr" | "incurred_cr" | "balance_cr" | "variance_cr" | "util_pct"> & { department_id: number; department: string; department_sort: number })[];
}
export async function getImports(sb: Db, projectId?: number) {
  let q = sb.from("budget_imports").select("id, project_id, version_id, kind, file_name, imported_by, imported_at, summary");
  if (projectId != null) q = q.eq("project_id", projectId);
  return must(await q.order("imported_at", { ascending: false }).limit(50)) as {
    id: number; project_id: number; version_id: number | null; kind: "detail" | "cost"; file_name: string | null;
    imported_by: string | null; imported_at: string; summary: Record<string, unknown>;
  }[];
}
export async function getSummaryRows(sb: Db, versionId: number) {
  return must(await sb.from("budget_summary_rows").select("category, subcategory, category_sort, subcategory_sort, amount_cr")
    .eq("version_id", versionId).order("category_sort").order("subcategory_sort")) as
    { category: string; subcategory: string; category_sort: number; subcategory_sort: number; amount_cr: number }[];
}
export async function getCategoryTotals(sb: Db, versionIds: number[]) {
  return must(await sb.from("budget_category_totals").select("version_id, category, category_sort, budget_cr, incurred_cr, balance_cr")
    .in("version_id", versionIds).order("category_sort")) as
    { version_id: number; category: string; category_sort: number; budget_cr: number; incurred_cr: number; balance_cr: number }[];
}
export async function getVersionAreas(sb: Db, versionId: number) {
  return must(await sb.from("budget_version_areas").select("*").eq("version_id", versionId).maybeSingle()) as
    { total_carpet: number | null; commitments: number; net_sale_carpet: number | null; sold_area: number | null; eng_area: number | null; design_area: number | null; sale_value_cr: number | null } | null;
}
export async function getEntries(sb: Db, projectId: number) {
  return must(await sb.from("budget_incurred_entries").select("id, cost_head_id, subproject_id, month, amount_paise, reference, entered_by, source, bill_id")
    .eq("project_id", projectId).order("month", { ascending: false }).order("id", { ascending: false })) as
    { id: number; cost_head_id: number; subproject_id: number | null; month: string; amount_paise: number; reference: string | null; entered_by: string | null; source: string; bill_id: number | null }[];
}

/** One budget line in full: its figures, the same line in every version, its comments and its change history. */
export interface LineComment { id: number; user_id: string | null; body: string; created_at: string }
export interface LineChange { id: number; at: string; user_id: string | null; action: string; old_row: Record<string, unknown> | null; new_row: Record<string, unknown> | null }
export async function getLineView(sb: Db, lineId: number, canAudit: boolean) {
  const { data: f } = await sb.from("budget_line_figures").select("*").eq("line_id", lineId).maybeSingle();
  if (!f) return null;
  const line = f as LineFigure;
  let q = sb.from("budget_line_figures").select("*").eq("cost_head_id", line.cost_head_id);
  q = line.subproject_id == null ? q.is("subproject_id", null) : q.eq("subproject_id", line.subproject_id);
  const [across, comments, changes] = await Promise.all([
    q.then((r) => (r.data ?? []) as LineFigure[]),
    sb.from("budget_comments").select("id, user_id, body, created_at").eq("line_id", lineId).order("created_at").then((r) => (r.data ?? []) as LineComment[]),
    canAudit ? sb.from("budget_audit_log").select("id, at, user_id, action, old_row, new_row").eq("table_name", "budget_lines").eq("row_id", lineId).order("at", { ascending: false }).limit(50)
      .then((r) => (r.data ?? []) as LineChange[]) : Promise.resolve([] as LineChange[]),
  ]);
  return { line, across, comments, changes };
}

/** A bill and its basic amount (the sum of its splits over cost heads), GST and total. */
export interface Bill {
  bill_id: number; vendor: string; bill_no: string; bill_date: string; work_order: string | null; gst_paise: number; note: string | null;
  entered_by: string | null; basic_paise: number; total_paise: number; splits: number;
}
export async function getBills(sb: Db, projectId: number) {
  return must(await sb.from("budget_bill_figures").select("bill_id, vendor, bill_no, bill_date, work_order, gst_paise, note, entered_by, basic_paise, total_paise, splits")
    .eq("project_id", projectId).order("bill_date", { ascending: false }).order("bill_id", { ascending: false })) as Bill[];
}
export async function getChangesNeedingRemark(sb: Db, versionId: number) {
  return must(await sb.rpc("budget_changes_needing_remark", { p_version: versionId })) as
    { line_id: number; category: string; sub_category: string | null; change_pct: number | null }[];
}
export async function getCompare(sb: Db, from: number, to: number) {
  return must(await sb.rpc("budget_compare", { p_from: from, p_to: to })) as {
    department: string; category: string; sub_category: string | null; subproject: string | null; from_initial_cr: number | null;
    to_initial_cr: number | null; from_ctc_cr: number | null; to_ctc_cr: number | null; ctc_change_cr: number; ctc_change_pct: number | null;
    to_remark: string | null; change: "added" | "removed" | "changed" | "same";
  }[];
}
// ---------- sign-off ----------
export interface SignoffLevel { id: number; project_id: number | null; sort: number; title: string; approver_ids: string[]; active: boolean }
export interface SignoffStep { level_id: number; sort: number; title: string; approver_ids: string[]; signed_by: string | null; signed_at: string | null; is_next: boolean }
export interface SignoffEvent { id: number; level_title: string | null; action: "submitted" | "signed" | "returned" | "recalled"; comment: string | null; user_id: string | null; at: string }

/** Levels this member may see: those for every project and each project's own. */
export async function getSignoffLevels(sb: Db) {
  return must(await sb.from("budget_signoff_levels").select("id, project_id, sort, title, approver_ids, active").order("sort").order("id")) as SignoffLevel[];
}
/** The levels a project uses: its own when it has any, otherwise those for every project. */
export const chainOf = (levels: SignoffLevel[], projectId: number) => {
  const own = levels.filter((l) => l.active && l.project_id === projectId);
  return own.length ? own : levels.filter((l) => l.active && l.project_id == null);
};
export async function getSignoffStatus(sb: Db, versionId: number) {
  return must(await sb.rpc("budget_signoff_status", { p_version: versionId })) as SignoffStep[];
}
export async function getSignoffLog(sb: Db, versionId: number) {
  return must(await sb.from("budget_signoffs").select("id, level_title, action, comment, user_id, at").eq("version_id", versionId).order("id")) as SignoffEvent[];
}
export async function getMySignoffs(sb: Db) {
  return must(await sb.rpc("budget_my_signoffs")) as { project_id: number; project: string; version_id: number; number: number; as_on: string; level: string }[];
}
/** Each tower's OC date in a version against the previous version, with the reason it moved. */
export async function getOcMoves(sb: Db, versionId: number) {
  return must(await sb.rpc("budget_oc_moves", { p_version: versionId })) as
    { tower_id: number; name: string; planned: string | null; oc_date: string | null; previous: string | null; moved: boolean; reason: string | null }[];
}

// ---------- tower workings ----------
export interface TowerArea { version_id: number; tower_id: number; name: string; type: string | null; sort: number; bua: number | null; design_area: number | null; planned_bua: number | null; planned_design_area: number | null }
export interface TowerWorking {
  version_id: number; tower_id: number; line_id: number; cost_head_id: number; department: string; department_sort: number; category: string; sub_category: string | null;
  cost_head_sort: number; is_tax: boolean; is_memo: boolean; ctc_paise: number; incurred_paise: number; certified_paise: number | null; to_certify_paise: number;
  rate_psf: number | null; remark: string | null;
}
export interface AllocationCheck {
  version_id: number; cost_head_id: number; department: string; department_sort: number; category: string; sub_category: string | null; cost_head_sort: number;
  total_paise: number; allocated_paise: number; unallocated_paise: number; towers: number;
}
export async function getTowerAreas(sb: Db, versionId: number) {
  return must(await sb.from("budget_tower_areas").select("*").eq("version_id", versionId).order("sort").order("tower_id")) as TowerArea[];
}
export async function getTowerWorkings(sb: Db, versionId: number) {
  return must(await sb.from("budget_tower_workings").select("*").eq("version_id", versionId)
    .order("department_sort").order("cost_head_sort").order("line_id")) as TowerWorking[];
}
export async function getAllocationCheck(sb: Db, versionId: number) {
  return must(await sb.from("budget_allocation_check").select("*").eq("version_id", versionId).order("department_sort").order("cost_head_sort")) as AllocationCheck[];
}

// ---------- supporting schedules ----------
export interface ScheduleRow { row_id: number; schedule_id: number; sort: number; label: string; qty: number | null; rate: number | null; pct: number; periods: number; typed_paise: number | null; amount_paise: number; remark: string | null }
export interface Schedule { id: number; version_id: number; line_id: number; title: string; note: string | null; rows: ScheduleRow[] }
/** Schedules of a version with their rows (amounts worked out by budget_schedule_figures). */
export async function getSchedules(sb: Db, versionId: number) {
  const [s, r] = await Promise.all([
    sb.from("budget_schedules").select("id, version_id, line_id, title, note").eq("version_id", versionId).order("id"),
    sb.from("budget_schedule_figures").select("*").eq("version_id", versionId).order("sort").order("row_id"),
  ]);
  const rows = must(r) as ScheduleRow[];
  return (must(s) as Omit<Schedule, "rows">[]).map((x) => ({ ...x, rows: rows.filter((y) => y.schedule_id === x.id) })) as Schedule[];
}

export async function getIncurredByPeriod(sb: Db, projectId: number, grain: string) {
  return must(await sb.rpc("budget_incurred_by_period", { p_project: projectId, p_grain: grain })) as
    { category: string; period: string; period_start: string; amount_cr: number }[];
}

// Who may do what: the same rule as budget_has() in the database, which enforces it (RLS and the
// workflow functions). With a project, the member's project list must include it; without one, the
// member must not be limited to some projects. Departments likewise.
export type Permission =
  | "project.view" | "project.create" | "project.setup" | "project.delete"
  | "version.view" | "version.open" | "version.approve" | "version.override" | "version.delete"
  | "budget.view" | "budget.edit" | "budget.import" | "budget.delete"
  | "cost.view" | "cost.enter" | "cost.import" | "cost.delete"
  | "report.view" | "report.export" | "audit.view" | "audit.delete"
  | "fields.view" | "fields.manage" | "fields.delete"
  | "access.view" | "access.manage" | "access.delete"
  | string;

export function can(me: Me | null, permission: Permission | string, projectId?: number | null, departmentId?: number | null) {
  if (!me) return false;
  // Super Admin & System Administrator automatically have absolute operational authority
  if (me.is_super_admin || me.role === "Super Administrator" || me.role_id === 1 || me.role === "Administrator") {
    return true;
  }
  if (!me.permissions.includes(permission)) return false;
  if (me.project_ids && (projectId == null || !me.project_ids.includes(projectId))) return false;
  if (departmentId != null && me.department_ids && !me.department_ids.includes(departmentId)) return false;
  return true;
}

/** May approve the draft directly, or submit it for sign-off when the project has a chain. */
export const canApprove = (me: Me | null, v: Version) =>
  !!me && (
    me.is_super_admin || me.role === "Super Administrator" || me.role_id === 1 || me.role === "Administrator" ||
    (v.status === "draft" && ((v.prepared_by === me.user_id && can(me, "version.approve", v.project_id)) || can(me, "version.override", v.project_id)))
  );

export const canChangeDraft = (me: Me | null, v: Version) =>
  !!me && (
    me.is_super_admin || me.role === "Super Administrator" || me.role_id === 1 || me.role === "Administrator" ||
    (v.status === "draft" && ((v.prepared_by === me.user_id && can(me, "version.open", v.project_id)) || can(me, "version.override", v.project_id)))
  );

/** Limited to some departments: the screens say so. */
export const limitedToDepartments = (me: Me) => !me.is_super_admin && me.role_id !== 1 && me.department_ids != null;

// ---------- custom fields ----------
export interface CustomField {
  id: number; entity: Entity; project_id: number | null; key: string; label: string; help: string | null; field_type: string;
  options: { choices?: string[]; decimals?: number | null; min?: number | null; max?: number | null; max_length?: number | null; unit?: string | null };
  formula: string | null; result_type: string | null; required: boolean; input_source: "typed" | "excel" | "both"; excel_header: string | null;
  section: string | null; sort: number; show_in_entry: boolean; show_in_reports: boolean; edit_permission: string | null; active: boolean;
}
export type Entity = "line" | "version" | "tower" | "cost_entry" | "project";

/** Active fields of one form for a project: fields for every project, replaced by a project's own field with the same key. */
export async function getCustomFields(sb: Db, entity: Entity, projectId: number | null, includeInactive = false) {
  let q = sb.from("budget_custom_fields").select("*").eq("entity", entity);
  if (!includeInactive) q = q.eq("active", true);
  const rows = must(await q.order("sort").order("id")) as CustomField[];
  const mine = rows.filter((f) => f.project_id == null || f.project_id === projectId);
  return mine.filter((f) => f.project_id != null || !mine.some((g) => g.project_id != null && g.key === f.key));
}
export async function getAllCustomFields(sb: Db) {
  return must(await sb.from("budget_custom_fields").select("*").order("entity").order("sort").order("id")) as CustomField[];
}
/** Stored values: entity id → key → value (as saved by budget_custom_normalize). */
export async function getCustomValues(sb: Db, fields: CustomField[], entityIds: number[]) {
  const out = new Map<number, Record<string, unknown>>();
  const stored = fields.filter((f) => f.field_type !== "formula");
  if (!stored.length || !entityIds.length) return out;
  const key = new Map(stored.map((f) => [f.id, f.key]));
  for (let i = 0; i < entityIds.length; i += 500) {
    const rows = must(await sb.from("budget_custom_values").select("field_id, entity_id, value")
      .in("field_id", [...key.keys()]).in("entity_id", entityIds.slice(i, i + 500))) as { field_id: number; entity_id: number; value: unknown }[];
    for (const r of rows) {
      if (!out.has(r.entity_id)) out.set(r.entity_id, {});
      out.get(r.entity_id)![key.get(r.field_id)!] = r.value;
    }
  }
  return out;
}

// ---------- access settings ----------
export interface RoleRow { id: number; name: string; description: string | null; is_system: boolean; permissions: string[] }
export async function getAccess(sb: Db) {
  const [perms, roles, rp, members] = await Promise.all([
    sb.from("budget_permissions").select("code, area, label, sort").order("sort"),
    sb.from("budget_roles").select("id, name, description, is_system").order("is_system", { ascending: false }).order("name"),
    sb.from("budget_role_permissions").select("role_id, permission"),
    sb.from("budget_members").select("user_id, role_id, project_ids, department_ids, active, added_at"),
  ]);
  const rpRows = must(rp) as { role_id: number; permission: string }[];
  return {
    permissions: must(perms) as { code: string; area: string; label: string; sort: number }[],
    roles: (must(roles) as Omit<RoleRow, "permissions">[]).map((r) => ({ ...r, permissions: rpRows.filter((x) => x.role_id === r.id).map((x) => x.permission) })),
    members: must(members) as { user_id: string; role_id: number; project_ids: number[] | null; department_ids: number[] | null; active: boolean; added_at: string }[],
  };
}
export async function getWorkspaceUsers(sb: Db, search?: string) {
  return must(await sb.rpc("budget_workspace_directory", { p_search: search || null })) as
    { user_id: string; email: string | null; full_name: string | null; member: boolean; role: string | null; active: boolean | null }[];
}
