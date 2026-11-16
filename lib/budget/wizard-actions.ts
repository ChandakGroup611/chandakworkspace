"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import BudgetImporter from "./importer";

// Saves the "Create budget" form: every input the detail budget workbook carries (as-on date, project
// areas and commitments, towers with OC dates, budget lines per department with Initial, CTC or a rate per
// sq ft, remarks, GST lines, cost incurred till date), typed on screen instead of imported. It writes the same
// tables the import writes, as the signed-in user, so the database checks and access rules still apply.

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (e: { message: string } | string): { ok: false; error: string } => ({ ok: false, error: typeof e === "string" ? e : e.message });
const AMOUNT = /^\d*\.?\d+$/;

async function client() {
  const sbUser = await createClient();
  const { data: { user } } = await sbUser.auth.getUser();
  if (!user) return sbUser;
  // Super-admin comes only from the database role (user_master / roles), never from user_metadata or app_metadata or email lists.
  try {
    const { data: um } = await supabaseAdmin.from("user_master").select("role:roles(code)").eq("id", user.id).maybeSingle();
    const role = um?.role as { code?: string } | { code?: string }[] | null | undefined;
    const code = (Array.isArray(role) ? role[0]?.code : role?.code)?.toUpperCase();
    if (code && ["SUPER_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ADMIN", "SUPERADMIN"].includes(code)) return supabaseAdmin;
  } catch {}
  return sbUser;
}

export interface WizardTower { id: number | null; name: string; type: string; carpet_area: string; eng_area: string; oc_date: string }
export interface WizardLine {
  key: string; headId: number | null; departmentId: number; category: string; subCategory: string; summary: string | null;
  /** Tower name for a line that is one tower's share of the cost head; "" = whole project. */
  tower: string;
  method: "amount" | "rate"; initial: string; ctc: string; rate: string; basis: string;
  /** Cost incurred up to the as-on date, cumulative, in crores; only sent when the person changed it. */
  incurred: string | null; remark: string;
}
export interface WizardGst {
  key: string; headId: number | null; departmentId: number; category: string; subCategory: string; summary: string | null;
  rate: string; share: string; base: string[]; initial: string; ctc: string; remark: string;
}
export interface WizardPayload {
  asOn: string; reason: string;
  areas: Record<string, string>; commitments: { name: string; area: string }[];
  towers: WizardTower[]; lines: WizardLine[]; gst: WizardGst[];
  /** Lines of the previous version the person removed: [headId, tower name]. */
  removed: [number, string][];
  deptRemarks: Record<string, string>;
}

const crPaise = (raw: string) => BudgetImporter.paiseFromCr(raw.replace(/,/g, "").trim());
const clean = (s: string) => s.replace(/,/g, "").trim();
const numOrNull = (s: string) => (clean(s) === "" ? null : Number(clean(s)));

/** Every problem in the form, so the person can fix them all at once. */
function check(p: WizardPayload): string[] {
  const out: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.asOn)) out.push("Version: choose the as-on date");
  for (const [k, v] of Object.entries(p.areas)) if (clean(v) !== "" && !(Number(clean(v)) >= 0)) out.push(`Areas: ${k.replace(/_/g, " ")} must be a number`);
  p.commitments.forEach((c, i) => { if (c.name.trim() && !(Number(clean(c.area)) >= 0)) out.push(`Areas: commitment ${i + 1} needs an area in sq ft`); });
  const towerNames = new Set<string>();
  p.towers.forEach((t, i) => {
    if (!t.name.trim()) out.push(`Towers: tower ${i + 1} needs a name`);
    else if (towerNames.has(t.name.trim().toLowerCase())) out.push(`Towers: "${t.name}" is typed twice`);
    towerNames.add(t.name.trim().toLowerCase());
    for (const k of ["carpet_area", "eng_area"] as const) if (clean(t[k]) !== "" && !(Number(clean(t[k])) >= 0)) out.push(`Towers: ${t.name || i + 1} area must be a number`);
  });
  const seen = new Set<string>();
  for (const l of p.lines) {
    const n = `${l.category || "A line"}${l.subCategory ? ` · ${l.subCategory}` : ""}`;
    if (!l.departmentId) out.push(`${n}: choose a department`);
    if (!l.category.trim()) out.push("Budget lines: a line has no category name");
    if (l.tower && !towerNames.has(l.tower.toLowerCase())) out.push(`${n}: tower "${l.tower}" is not in the towers list`);
    const k = `${l.departmentId}|${l.category.trim().toLowerCase()}|${l.subCategory.trim().toLowerCase()}|${l.tower.toLowerCase()}`;
    if (seen.has(k)) out.push(`${n}: the same line is typed twice`);
    seen.add(k);
    for (const [v, label] of [[l.initial, "Initial"], [l.method === "amount" ? l.ctc : "", "CTC"], [l.incurred ?? "", "Cost incurred"]] as const)
      if (clean(v) !== "" && !AMOUNT.test(clean(v))) out.push(`${n}: ${label} must be a positive amount in crores`);
    if (l.method === "rate") {
      if (!AMOUNT.test(clean(l.rate))) out.push(`${n}: type the rate in ₹ per sq ft`);
      if (!/^[a-z_]{1,40}$/.test(l.basis)) out.push(`${n}: choose the area the rate applies to`);
    }
  }
  for (const g of p.gst) {
    const n = g.category || "A GST line";
    if (!g.category.trim()) out.push("GST: a GST line has no name");
    if (!(Number(clean(g.rate)) > 0 && Number(clean(g.rate)) <= 100)) out.push(`${n}: GST % must be between 0 and 100`);
    if (!(Number(clean(g.share)) > 0 && Number(clean(g.share)) <= 100)) out.push(`${n}: eligible share % must be between 0 and 100`);
    if (!g.base.length) out.push(`${n}: choose the lines it is charged on`);
    for (const v of [g.initial, g.ctc]) if (clean(v) !== "" && !AMOUNT.test(clean(v))) out.push(`${n}: amounts must be positive crores, or blank to calculate`);
  }
  return out;
}

export async function saveBudgetWizard(projectId: number, p: WizardPayload): Promise<Result<{ versionNumber: number }>> {
  const problems = check(p);
  if (problems.length) return fail(problems.slice(0, 10).join(" · ") + (problems.length > 10 ? ` · and ${problems.length - 10} more` : ""));
  const sb = await client();
  const step = (what: string, e: { message: string }) => fail(`${what}: ${e.message}. What was saved before this step is kept; fix it and save again.`);

  // 1. Version: the open draft, or a new draft copied from the latest approved version (same as Start R…)
  let { data: draft } = await sb.from("budget_versions").select("id, number, status, areas").eq("project_id", projectId).neq("status", "approved").maybeSingle();
  if (draft && draft.status !== "draft") return fail(`R${draft.number} is under sign-off; take it back to draft before changing it`);
  if (!draft) {
    const { data: id, error } = await sb.rpc("budget_create_version", { p_project: projectId, p_as_on: p.asOn, p_reason: p.reason.trim() || "Budget typed on screen" });
    if (error) return step("Opening the version", error);
    const r = await sb.from("budget_versions").select("id, number, status, areas").eq("id", id).single();
    if (r.error) return step("Opening the version", r.error);
    draft = r.data;
  }
  const areas: Record<string, unknown> = { ...(draft!.areas ?? {}) };
  for (const [k, v] of Object.entries(p.areas)) areas[k] = numOrNull(v);
  areas.commitments = p.commitments.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), area: Number(clean(c.area)) || 0 }));
  {
    const { error } = await sb.from("budget_versions").update({ as_on: p.asOn, reason: p.reason.trim() || null, areas }).eq("id", draft!.id);
    if (error) return step("Saving the version details and areas", error);
  }
  const versionId = Number(draft!.id);

  // 2. Towers
  for (const [i, t] of p.towers.entries()) {
    const row = { name: t.name.trim(), type: t.type || null, carpet_area: numOrNull(t.carpet_area), eng_area: numOrNull(t.eng_area), oc_date: t.oc_date || null };
    const { error } = t.id
      ? await sb.from("budget_subprojects").update(row).eq("id", t.id).eq("project_id", projectId)
      : await sb.from("budget_subprojects").insert({ project_id: projectId, ...row, sort: 100 + i });
    if (error) return step(`Saving tower ${row.name}`, error.code === "23505" ? { message: "a tower with that name already exists" } : error);
  }
  const { data: towerRows } = await sb.from("budget_subprojects").select("id, name").eq("project_id", projectId);
  const towerId = new Map((towerRows ?? []).map((t) => [String(t.name).toLowerCase(), Number(t.id)]));
  const tw = (name: string) => (name ? towerId.get(name.toLowerCase()) ?? null : null);

  // 3. Cost heads (plain, then GST, whose base refers to the plain ones)
  const { data: heads, error: eh } = await sb.from("budget_cost_heads").select("id, department_id, category, sub_category, sort").eq("project_id", projectId);
  if (eh) return step("Reading cost heads", eh);
  const k3 = (d: number, c: string, s: string | null) => `${d}|${c.trim().toLowerCase()}|${(s ?? "").trim().toLowerCase()}`;
  const byName = new Map((heads ?? []).map((h) => [k3(h.department_id, h.category, h.sub_category), Number(h.id)]));
  let sort = Math.max(0, ...(heads ?? []).map((h) => h.sort ?? 0));
  const headOfKey = new Map<string, number>();
  for (const l of p.lines) {
    let id = l.headId ?? byName.get(k3(l.departmentId, l.category, l.subCategory)) ?? null;
    if (id && l.headId) {
      const { error } = await sb.from("budget_cost_heads").update({ category: l.category.trim(), sub_category: l.subCategory.trim() || null, ...(l.summary ? { summary_subcategory: l.summary } : {}) }).eq("id", id);
      if (error) return step(`Saving line ${l.category}`, error);
    } else if (!id) {
      const { data, error } = await sb.from("budget_cost_heads").insert({ project_id: projectId, department_id: l.departmentId, category: l.category.trim(),
        sub_category: l.subCategory.trim() || null, summary_subcategory: l.summary, sort: ++sort, is_tax: false }).select("id").single();
      if (error) return step(`Adding line ${l.category}`, error);
      id = Number(data.id);
      byName.set(k3(l.departmentId, l.category, l.subCategory), id);
    }
    headOfKey.set(l.key, id);
  }
  for (const g of p.gst) {
    const base = [...new Set(g.base.map((k) => headOfKey.get(k)).filter((x): x is number => x != null))];
    const row = { category: g.category.trim(), sub_category: g.subCategory.trim() || null, is_tax: true, tax_rate_pct: Number(clean(g.rate)), tax_share_pct: Number(clean(g.share)), tax_base: base,
      ...(g.summary ? { summary_subcategory: g.summary } : {}) };
    let id = g.headId ?? byName.get(k3(g.departmentId, g.category, g.subCategory)) ?? null;
    if (id) {
      const { error } = await sb.from("budget_cost_heads").update(row).eq("id", id);
      if (error) return step(`Saving GST line ${g.category}`, error);
    } else {
      const { data, error } = await sb.from("budget_cost_heads").insert({ project_id: projectId, department_id: g.departmentId, sort: ++sort, ...row }).select("id").single();
      if (error) return step(`Adding GST line ${g.category}`, error);
      id = Number(data.id);
    }
    headOfKey.set(g.key, id);
  }

  // 4. Lines of the version
  const { data: have, error: el } = await sb.from("budget_lines").select("id, cost_head_id, subproject_id").eq("version_id", versionId);
  if (el) return step("Reading the version's lines", el);
  const lineOf = new Map((have ?? []).map((l) => [`${l.cost_head_id}|${l.subproject_id ?? ""}`, Number(l.id)]));
  const upsert = async (head: number, tower: number | null, patch: Record<string, unknown>) => {
    const id = lineOf.get(`${head}|${tower ?? ""}`);
    const r = id ? await sb.from("budget_lines").update(patch).eq("id", id) : await sb.from("budget_lines").insert({ version_id: versionId, cost_head_id: head, subproject_id: tower, ...patch });
    return r.error;
  };
  for (const l of p.lines) {
    const ini = clean(l.initial) === "" ? 0 : crPaise(l.initial);
    const rate = l.method === "rate";
    const ctc = rate ? 0 : clean(l.ctc) === "" ? ini : crPaise(l.ctc);
    const e = await upsert(headOfKey.get(l.key)!, tw(l.tower), {
      initial_paise: ini, ctc_paise: ctc, remark: l.remark.trim() || null,
      ctc_rate: rate ? Number(clean(l.rate)) : null, ctc_basis: rate ? l.basis : null, balance_of_paise: null, balance_scope: null,
    });
    if (e) return step(`Saving the figures of ${l.category}`, e);
  }
  for (const g of p.gst) {
    const e = await upsert(headOfKey.get(g.key)!, null, {
      initial_paise: clean(g.initial) === "" ? null : crPaise(g.initial), ctc_paise: clean(g.ctc) === "" ? null : crPaise(g.ctc), remark: g.remark.trim() || null,
    });
    if (e) return step(`Saving GST line ${g.category}`, e);
  }
  for (const [head, tower] of p.removed) {
    const id = lineOf.get(`${head}|${tw(tower) ?? ""}`);
    if (!id) continue;
    const { error } = await sb.from("budget_lines").delete().eq("id", id);
    if (error) return step("Removing a line", error);
  }

  // 5. Department remarks
  for (const [dept, text] of Object.entries(p.deptRemarks)) {
    const { error } = await sb.rpc("budget_set_department_remark", { p_version: versionId, p_department: Number(dept), p_text: text });
    if (error) return step("Saving a department remark", error);
  }

  // 6. Cost incurred till the as-on date: cumulative, as in the workbook; only the difference is booked
  const month = `${p.asOn.slice(0, 7)}-01`;
  for (const l of p.lines.filter((x) => x.incurred != null)) {
    const head = headOfKey.get(l.key)!, tower = tw(l.tower);
    let q = sb.from("budget_incurred_entries").select("amount_paise").eq("project_id", projectId).eq("cost_head_id", head).lte("month", month);
    q = tower == null ? q.is("subproject_id", null) : q.eq("subproject_id", tower);
    const { data: rows, error } = await q;
    if (error) return step(`Reading cost incurred of ${l.category}`, error);
    const existing = (rows ?? []).reduce((s, r) => s + Number(r.amount_paise), 0);
    const diff = (clean(l.incurred!) === "" ? 0 : crPaise(l.incurred!)) - existing;
    if (diff === 0) continue;
    const { error: e2 } = await sb.from("budget_incurred_entries").insert({ project_id: projectId, cost_head_id: head, subproject_id: tower, month, amount_paise: diff,
      reference: existing === 0 ? "Opening balance typed on Create budget" : "Adjustment typed on Create budget" });
    if (e2) return step(`Saving cost incurred of ${l.category}`, e2);
  }

  revalidatePath("/budget", "layout");
  return { ok: true, versionNumber: Number(draft!.number) };
}
