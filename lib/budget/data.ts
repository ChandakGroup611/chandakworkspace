// Server only: reads the budget tables as the signed-in user.
import { createClient } from "./supabase";

// Reads for the budget screens. All calculated figures come from the database views
// (budget_line_figures, budget_version_totals, ...), so every screen shows the same numbers.

// The signed-in member: role and rights are set up in this module (Settings → Access); the person
// comes from the Chandak Workspace users. null project_ids / department_ids means "all".
export interface Me {
  user_id: string; role: string; role_id: number; permissions: string[]; project_ids: number[] | null;
  department_ids: number[] | null; name: string | null; email: string | null;
}
export interface Project { id: number; code: string; name: string; location: string | null; fy_start_month: number }
export interface Version {
  id: number; project_id: number; number: number; as_on: string; status: "draft" | "approved"; reason: string | null;
  parent_id: number | null; areas: Areas; category_reasons: Record<string, string>; prepared_by: string | null;
  approved_by: string | null; approved_at: string | null;
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
  const me = must(await sb.rpc("budget_my_access")) as Me | null;
  return { sb, me, signedIn: true };
}
export type Db = Awaited<ReturnType<typeof createClient>>;

export async function getProjects(sb: Db) {
  return must(await sb.from("budget_projects").select("id, code, name, location, fy_start_month").order("name")) as Project[];
}
export async function getVersions(sb: Db, projectId?: number) {
  let q = sb.from("budget_versions").select("id, project_id, number, as_on, status, reason, parent_id, areas, category_reasons, prepared_by, approved_by, approved_at");
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
  return must(await sb.from("budget_incurred_entries").select("id, cost_head_id, subproject_id, month, amount_paise, reference, entered_by, source")
    .eq("project_id", projectId).order("month", { ascending: false }).order("id", { ascending: false })) as
    { id: number; cost_head_id: number; subproject_id: number | null; month: string; amount_paise: number; reference: string | null; entered_by: string | null; source: string }[];
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
export async function getIncurredByPeriod(sb: Db, projectId: number, grain: string) {
  return must(await sb.rpc("budget_incurred_by_period", { p_project: projectId, p_grain: grain })) as
    { category: string; period: string; period_start: string; amount_cr: number }[];
}

// Who may do what: the same rule as budget_has() in the database, which enforces it (RLS and the
// workflow functions). With a project, the member's project list must include it; without one, the
// member must not be limited to some projects. Departments likewise.
export type Permission =
  | "project.view" | "project.create" | "project.setup" | "version.open" | "version.approve" | "version.override"
  | "budget.edit" | "budget.import" | "cost.enter" | "cost.import" | "report.export" | "audit.view" | "fields.manage" | "access.manage";
export function can(me: Me | null, permission: Permission, projectId?: number | null, departmentId?: number | null) {
  if (!me || !me.permissions.includes(permission)) return false;
  if (me.project_ids && (projectId == null || !me.project_ids.includes(projectId))) return false;
  if (departmentId != null && me.department_ids && !me.department_ids.includes(departmentId)) return false;
  return true;
}
export const canApprove = (me: Me | null, v: Version) =>
  !!me && v.status === "draft" && ((v.prepared_by === me.user_id && can(me, "version.approve", v.project_id)) || can(me, "version.override", v.project_id));
export const canChangeDraft = (me: Me | null, v: Version) =>
  !!me && v.status === "draft" && ((v.prepared_by === me.user_id && can(me, "version.open", v.project_id)) || can(me, "version.override", v.project_id));
/** Limited to some departments: the screens say so. */
export const limitedToDepartments = (me: Me) => me.department_ids != null;

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
