"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import BudgetImporter from "./importer";

// Writes behind the guided, typed set-up of a budget (no Excel needed): a project with its towers in one
// form, a tower with all its details, and many budget lines with their amounts at once. Each write runs as
// the signed-in user (or the service client for a super administrator, the same rule as actions.ts), so the
// database's access rules and checks still decide what is allowed.

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (e: { message: string } | string): { ok: false; error: string } => ({ ok: false, error: typeof e === "string" ? e : e.message });
const refresh = () => revalidatePath("/budget", "layout");
const AMOUNT = /^\d*\.?\d+$/;

async function client() {
  const sbUser = await createClient();
  const { data: { user } } = await sbUser.auth.getUser();
  if (!user) return sbUser;
  if (user.app_metadata?.role === "SUPER_ADMIN") return supabaseAdmin; // Super-admin comes only from the database role (user_master / roles), never from user_metadata (which a user can edit on their own account) or a list of email addresses.
  try {
    const { data: um } = await supabaseAdmin.from("user_master").select("role:roles(code)").eq("id", user.id).maybeSingle();
    const role = um?.role as { code?: string } | { code?: string }[] | null | undefined;
    const code = (Array.isArray(role) ? role[0]?.code : role?.code)?.toUpperCase();
    if (code && ["SUPER_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ADMIN", "SUPERADMIN"].includes(code)) return supabaseAdmin;
  } catch {}
  return sbUser;
}

/** Crores typed by a person → paise; "" is null. Refuses anything that is not a plain positive amount. */
function paise(raw: string | undefined, what: string): number | null | { error: string } {
  const text = (raw ?? "").replace(/,/g, "").trim();
  if (text === "") return null;
  if (!AMOUNT.test(text)) return { error: `${what}: type a positive amount in crores, for example 12.5` };
  return BudgetImporter.paiseFromCr(text);
}
const area = (raw: string | undefined) => {
  const t = (raw ?? "").replace(/,/g, "").trim();
  return t === "" ? null : Number(t);
};

// ---------- towers ----------
export interface TowerInput { name: string; type: string; carpet_area: string; eng_area: string; oc_date: string; floors?: string }

function towerRow(t: TowerInput) {
  for (const [k, label] of [["carpet_area", "Carpet area"], ["eng_area", "Construction area"]] as const) {
    const v = area(t[k]);
    if (v != null && !(v >= 0)) return { error: `${t.name || "Tower"}: ${label} must be a number of square feet` };
  }
  return { name: t.name.trim(), type: t.type || null, carpet_area: area(t.carpet_area), eng_area: area(t.eng_area), oc_date: t.oc_date || null, floors: t.floors?.trim() || null };
}

/** A tower with its building type, areas and OC date in one step. */
export async function addTowerFull(projectId: number, t: TowerInput): Promise<Result> {
  if (!t.name.trim()) return fail("Give the tower a name, for example Tower A or Wing 1");
  const row = towerRow(t);
  if ("error" in row) return fail(row.error as string);
  const sb = await client();
  const { data: last } = await sb.from("budget_subprojects").select("sort").eq("project_id", projectId).order("sort", { ascending: false }).limit(1);
  const { error } = await sb.from("budget_subprojects").insert({ project_id: projectId, ...row, sort: (last?.[0]?.sort ?? 0) + 1 });
  if (error) return fail(error.code === "23505" ? `A tower named "${row.name}" already exists in this project` : error.message);
  refresh();
  return { ok: true };
}

// ---------- project ----------
export interface NewProjectInput {
  name: string; code: string; location: string; fyStartMonth: number;
  towers: TowerInput[];
  /** null = start with no cost heads (add them on Get started), or the project to copy the cost heads of. */
  copyHeadsFrom: number | null;
}

/** Creates a project with its details and named towers, ready for the Get started steps. */
export async function createProjectGuided(p: NewProjectInput): Promise<Result<{ projectId: number }>> {
  const name = p.name.trim(), code = p.code.trim();
  if (!name) return fail("Give the project a name");
  if (!code) return fail("Give the project a short code, for example CSW");
  const towers = p.towers.filter((t) => t.name.trim());
  const names = new Set<string>();
  for (const t of towers) {
    const k = t.name.trim().toLowerCase();
    if (names.has(k)) return fail(`Two towers are named "${t.name.trim()}"; give each tower its own name`);
    names.add(k);
  }
  const rows = towers.map(towerRow);
  const bad = rows.find((r) => "error" in r);
  if (bad) return fail((bad as { error: string }).error);
  const sb = await client();
  const { data: id, error } = await sb.rpc("budget_create_project", { p_name: name, p_code: code, p_towers: 0, p_copy_heads_from: p.copyHeadsFrom });
  if (error) return fail(error);
  const projectId = Number(id);
  const month = Math.min(12, Math.max(1, Math.round(p.fyStartMonth || 4)));
  const { error: e1 } = await sb.from("budget_projects").update({ location: p.location.trim() || null, fy_start_month: month }).eq("id", projectId);
  if (e1) return fail(`The project was created, but its location could not be saved: ${e1.message}`);
  if (rows.length) {
    const { error: e2 } = await sb.from("budget_subprojects").insert(rows.map((r, i) => ({ project_id: projectId, ...(r as object), sort: i + 1 })));
    if (e2) return fail(`The project was created, but its towers could not be saved: ${e2.message}. Add them on Get started.`);
  }
  refresh();
  return { ok: true, projectId };
}

// ---------- many budget lines at once ----------
export interface LineInput {
  department_id: number; category: string; sub_category: string; summary_subcategory: string | null;
  /** Optional tower: the line is then that tower's share of the cost head. */
  tower_id: number | null;
  initial: string; ctc: string; remark: string;
}

/**
 * Adds cost heads with their figures in one go. A row whose department, category and sub-category already
 * exist reuses that cost head. When the project has a draft version the line is created in it with the typed
 * Initial and CTC; otherwise only the cost heads are added and they appear in the next version opened.
 * Every row is checked first; nothing is saved while any row has a problem.
 */
export async function addLinesBulk(projectId: number, input: LineInput[]): Promise<Result<{ heads: number; lines: number; draftNumber: number | null }>> {
  const rows = input.filter((r) => r.category.trim() || r.sub_category.trim() || r.initial.trim() || r.ctc.trim());
  if (!rows.length) return fail("Type at least one line: a department and a category name");
  const problems: string[] = [];
  const parsed = rows.map((r, i) => {
    const n = `Row ${i + 1}`;
    if (!r.department_id) problems.push(`${n}: choose a department`);
    if (!r.category.trim()) problems.push(`${n}: type a category, for example Civil Contractor`);
    const a = paise(r.initial, `${n} Initial`), b = paise(r.ctc, `${n} CTC`);
    if (a && typeof a === "object") problems.push(a.error);
    if (b && typeof b === "object") problems.push(b.error);
    const ini = typeof a === "number" ? a : null, ctc = typeof b === "number" ? b : null;
    // CTC left empty starts at the initial budget, the usual first estimate
    return { ...r, category: r.category.trim(), sub_category: r.sub_category.trim(), initial_paise: ini ?? 0, ctc_paise: ctc ?? ini ?? 0 };
  });
  const seen = new Set<string>();
  parsed.forEach((r, i) => {
    const k = `${r.department_id}|${r.category.toLowerCase()}|${r.sub_category.toLowerCase()}|${r.tower_id ?? ""}`;
    if (seen.has(k)) problems.push(`Row ${i + 1}: the same line is typed twice`);
    seen.add(k);
  });
  if (problems.length) return fail(problems.slice(0, 8).join(" · ") + (problems.length > 8 ? ` · and ${problems.length - 8} more` : ""));

  const sb = await client();
  const { data: existing, error: e0 } = await sb.from("budget_cost_heads").select("id, department_id, category, sub_category, sort").eq("project_id", projectId).eq("is_tax", false);
  if (e0) return fail(e0);
  const key = (d: number, c: string, s: string | null) => `${d}|${c.trim().toLowerCase()}|${(s ?? "").trim().toLowerCase()}`;
  const headOf = new Map((existing ?? []).map((h) => [key(h.department_id, h.category, h.sub_category), Number(h.id)]));
  let sort = Math.max(0, ...(existing ?? []).map((h) => h.sort ?? 0));
  const toCreate = parsed.filter((r, i, all) => !headOf.has(key(r.department_id, r.category, r.sub_category))
    && all.findIndex((x) => key(x.department_id, x.category, x.sub_category) === key(r.department_id, r.category, r.sub_category)) === i);
  let created = 0;
  if (toCreate.length) {
    const { data: heads, error } = await sb.from("budget_cost_heads").insert(toCreate.map((r) => ({
      project_id: projectId, department_id: r.department_id, category: r.category, sub_category: r.sub_category || null,
      summary_subcategory: r.summary_subcategory, sort: ++sort, is_tax: false,
    }))).select("id, department_id, category, sub_category");
    if (error) return fail(error);
    for (const h of heads ?? []) headOf.set(key(h.department_id, h.category, h.sub_category), Number(h.id));
    created = heads?.length ?? 0;
  }

  const { data: draft } = await sb.from("budget_versions").select("id, number").eq("project_id", projectId).eq("status", "draft").maybeSingle();
  let lines = 0;
  if (draft) {
    const { data: have } = await sb.from("budget_lines").select("id, cost_head_id, subproject_id").eq("version_id", draft.id);
    const lineOf = new Map((have ?? []).map((l) => [`${l.cost_head_id}|${l.subproject_id ?? ""}`, Number(l.id)]));
    for (const r of parsed) {
      const head = headOf.get(key(r.department_id, r.category, r.sub_category))!;
      const patch = { initial_paise: r.initial_paise, ctc_paise: r.ctc_paise, remark: r.remark.trim() || null };
      const id = lineOf.get(`${head}|${r.tower_id ?? ""}`);
      const { error } = id
        ? await sb.from("budget_lines").update(patch).eq("id", id)
        : await sb.from("budget_lines").insert({ version_id: draft.id, cost_head_id: head, subproject_id: r.tower_id, ...patch });
      if (error) return fail(`${lines} line(s) saved, then: ${error.message}`);
      lines++;
    }
  }
  refresh();
  return { ok: true, heads: created, lines, draftNumber: draft?.number ?? null };
}

// ---------- one line at a time ----------
/** Saves Initial, CTC and remark of one line together (the line-by-line entry form). */
export async function saveLineFigures(lineId: number, f: { initial: string; ctc: string; remark: string; isTax: boolean }): Promise<Result> {
  const a = paise(f.initial, "Initial budget"), b = paise(f.ctc, "Estimated CTC");
  if (a && typeof a === "object") return fail(a.error);
  if (b && typeof b === "object") return fail(b.error);
  const blank = f.isTax ? null : 0;
  const sb = await client();
  const { data, error } = await sb.from("budget_lines")
    .update({ initial_paise: (a as number | null) ?? blank, ctc_paise: (b as number | null) ?? blank, remark: f.remark.trim() || null })
    .eq("id", lineId).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("You cannot change this line");
  refresh();
  return { ok: true };
}
