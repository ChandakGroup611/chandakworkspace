"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase";
import type { CustomField, Entity } from "./data";
import { checkFormula, type FieldDef } from "./formula";
import BudgetImporter, { type CostRow, type ImportPayload } from "./importer";

// Writes from the budget screens. Each runs as the signed-in user, so Row Level Security and the
// workflow functions decide what is allowed; a refusal comes back as { error } for the screen to show.

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (e: { message: string } | string): { ok: false; error: string } => ({ ok: false, error: typeof e === "string" ? e : e.message });
const refresh = () => revalidatePath("/budget", "layout");
const AMOUNT = /^\d*\.?\d+$/;

export async function updateLine(lineId: number, field: "initial" | "ctc" | "remark", raw: string, isTax: boolean): Promise<Result> {
  const sb = await createClient();
  let patch: Record<string, unknown>;
  if (field === "remark") patch = { remark: raw.trim() || null };
  else {
    const text = raw.replace(/,/g, "").trim();
    if (text !== "" && !AMOUNT.test(text)) return fail("Type a positive amount in crores, for example 12.5");
    const paise = text === "" ? (isTax ? null : 0) : BudgetImporter.paiseFromCr(text);
    patch = { [field === "initial" ? "initial_paise" : "ctc_paise"]: paise };
  }
  const { data, error } = await sb.from("budget_lines").update(patch).eq("id", lineId).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("You cannot change this line");
  refresh();
  return { ok: true };
}

export async function addTowerLine(versionId: number, headId: number, towerId: number): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("budget_lines").insert({ version_id: versionId, cost_head_id: headId, subproject_id: towerId, initial_paise: 0, ctc_paise: 0 });
  if (error) return fail(error.code === "23505" ? "That tower already has a line for this cost head" : error.message);
  refresh();
  return { ok: true };
}

export async function removeLine(lineId: number): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.from("budget_lines").delete().eq("id", lineId);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function openVersion(projectId: number, asOn: string, reason: string): Promise<Result<{ number: number }>> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("budget_create_version", { p_project: projectId, p_as_on: asOn, p_reason: reason.trim() || null });
  if (error) return fail(error);
  const { data: v } = await sb.from("budget_versions").select("number").eq("id", data).single();
  refresh();
  return { ok: true, number: v!.number };
}

export async function approveVersion(versionId: number): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.rpc("budget_approve_version", { p_version: versionId });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function deleteDraft(versionId: number): Promise<Result> {
  const sb = await createClient();
  const { data, error } = await sb.from("budget_versions").delete().eq("id", versionId).eq("status", "draft").select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("Only the person who prepared this draft can delete it");
  refresh();
  return { ok: true };
}

export async function updateVersion(versionId: number, patch: { as_on?: string; reason?: string | null; category_reasons?: Record<string, string>; areas?: object }): Promise<Result> {
  const sb = await createClient();
  const { data, error } = await sb.from("budget_versions").update(patch).eq("id", versionId).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("Only the preparer of this draft can change it");
  refresh();
  return { ok: true };
}

export interface ImportPreview {
  into: "new project" | "open draft" | "new draft"; version_number: number; new_heads: number; new_towers: number;
  lines_changed: number; incurred_adjustments: number; lines_not_in_file: number;
  totals: { initial_cr: number; ctc_cr: number; incurred_cr: number };
  changes: { department: string; head: string; initial_before: number | null; initial_after: number | null; ctc_before: number | null; ctc_after: number | null; remark: string | null }[];
  adjustments: { department: string; head: string; recorded: number; entry: number }[];
  new_head_names: string[]; new_tower_names: string[]; custom_values?: number; custom_problems?: string[];
}

export async function previewImport(projectId: number | null, payload: ImportPayload): Promise<Result<{ preview: ImportPreview }>> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("budget_preview_import", { p_project: projectId, p_payload: payload });
  if (error) return fail(error);
  return { ok: true, preview: data as ImportPreview };
}

export async function importWorkbook(projectId: number | null, payload: ImportPayload): Promise<Result<{ projectId: number; versionNumber: number; linesChanged: number; adjustments: number }>> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("budget_import_version", { p_project: projectId, p_payload: payload });
  if (error) return fail(error);
  const { data: v } = await sb.from("budget_versions").select("number").eq("id", data.version_id).single();
  refresh();
  return { ok: true, projectId: data.project_id, versionNumber: v!.number, linesChanged: data.lines_changed, adjustments: data.incurred_adjustments };
}

export async function checkCostRows(projectId: number, rows: CostRow[]): Promise<Result<{ rows: CostRow[] }>> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("budget_check_incurred", { p_project: projectId, p_payload: { rows } });
  if (error) return fail(error);
  return { ok: true, rows: data as CostRow[] };
}

export async function importCostRows(projectId: number, file: string, rows: CostRow[]): Promise<Result<{ entries: number; totalPaise: number }>> {
  const sb = await createClient();
  const clean = rows.map(({ problem: _p, ...r }) => r);
  const { data, error } = await sb.rpc("budget_import_incurred", { p_project: projectId, p_payload: { file, rows: clean } });
  if (error) return fail(error);
  refresh();
  return { ok: true, entries: data.entries, totalPaise: data.total_paise };
}

export async function addEntry(projectId: number, headId: number, towerId: number | null, month: string, amount: string, reference: string, custom: Record<string, unknown> = {}): Promise<Result> {
  const text = amount.replace(/,/g, "").trim();
  if (!/^-?\d*\.?\d+$/.test(text) || !/^\d{4}-\d{2}$/.test(month)) return fail("Enter the month and an amount in rupees");
  const sb = await createClient();
  const { data, error } = await sb.from("budget_incurred_entries").insert({
    project_id: projectId, cost_head_id: headId, subproject_id: towerId, month: month + "-01",
    amount_paise: BudgetImporter.paiseFromInr(text), reference: reference.trim() || null,
  }).select("id").single();
  if (error) return fail(error.message.includes("row-level security") ? "You cannot record cost for this department" : error.message);
  // Custom fields of the entry: all saved with it, or the entry is taken back so nothing is half saved.
  const filled = Object.fromEntries(Object.entries(custom).filter(([, v]) => v !== "" && v != null));
  if (Object.keys(filled).length) {
    const { error: e2 } = await sb.rpc("budget_set_custom_values", { p_entity: "cost_entry", p_entity_id: data.id, p_values: filled });
    if (e2) {
      await sb.from("budget_incurred_entries").delete().eq("id", data.id);
      return fail(e2);
    }
  }
  refresh();
  return { ok: true };
}

export async function deleteEntry(entryId: number): Promise<Result> {
  const sb = await createClient();
  const { data, error } = await sb.from("budget_incurred_entries").delete().eq("id", entryId).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("You cannot delete this entry");
  refresh();
  return { ok: true };
}

export async function createProject(name: string, code: string, towers: number, copyHeadsFrom: number | null): Promise<Result<{ projectId: number }>> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("budget_create_project", { p_name: name, p_code: code || name.slice(0, 12), p_towers: towers, p_copy_heads_from: copyHeadsFrom });
  if (error) return fail(error);
  refresh();
  return { ok: true, projectId: data as number };
}

export async function addTower(projectId: number, name: string): Promise<Result> {
  const sb = await createClient();
  const { count } = await sb.from("budget_subprojects").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  const { error } = await sb.from("budget_subprojects").insert({ project_id: projectId, name: name.trim() || `Tower ${(count ?? 0) + 1}`, sort: (count ?? 0) + 1 });
  if (error) return fail(error.code === "23505" ? "A tower with that name already exists" : error.message);
  refresh();
  return { ok: true };
}

export async function updateTower(towerId: number, field: "name" | "type" | "carpet_area" | "eng_area" | "oc_date", value: string): Promise<Result> {
  const sb = await createClient();
  const v = value.trim();
  if (field === "name" && !v) return fail("A tower needs a name");
  const patch = { [field]: field === "carpet_area" || field === "eng_area" ? (v === "" ? null : Number(v)) : v || null };
  const { data, error } = await sb.from("budget_subprojects").update(patch).eq("id", towerId).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("Only the budget preparer or an administrator changes towers");
  refresh();
  return { ok: true };
}

export async function addHead(projectId: number, h: { department_id: number; category: string; sub_category: string; summary_subcategory: string | null; is_tax: boolean; tax_rate_pct: number | null; tax_share_pct: number | null; tax_base: number[] }): Promise<Result<{ draftNumber: number | null }>> {
  if (!h.category.trim()) return fail("Give the cost head a category name");
  if (h.is_tax && !(Number(h.tax_rate_pct) > 0 && Number(h.tax_share_pct) > 0 && Number(h.tax_share_pct) <= 100)) return fail("Enter the GST rate and the eligible share in percent");
  const sb = await createClient();
  const { data: last } = await sb.from("budget_cost_heads").select("sort").eq("project_id", projectId).order("sort", { ascending: false }).limit(1);
  const { data: head, error } = await sb.from("budget_cost_heads").insert({
    project_id: projectId, department_id: h.department_id, category: h.category.trim(), sub_category: h.sub_category.trim() || null,
    summary_subcategory: h.summary_subcategory, sort: (last?.[0]?.sort ?? 0) + 1, is_tax: h.is_tax,
    tax_rate_pct: h.is_tax ? h.tax_rate_pct : null, tax_share_pct: h.is_tax ? h.tax_share_pct : null, tax_base: h.is_tax ? h.tax_base : [],
  }).select("id").single();
  if (error) return fail(error);
  const { data: draft } = await sb.from("budget_versions").select("id, number").eq("project_id", projectId).eq("status", "draft").maybeSingle();
  if (draft) {
    const zero = h.is_tax ? null : 0;
    const { error: e2 } = await sb.from("budget_lines").insert({ version_id: draft.id, cost_head_id: head.id, initial_paise: zero, ctc_paise: zero });
    if (e2) return fail(e2);
  }
  refresh();
  return { ok: true, draftNumber: draft?.number ?? null };
}

export async function updateHead(headId: number, patch: { summary_subcategory?: string; tax_rate_pct?: number; tax_share_pct?: number }): Promise<Result> {
  for (const k of ["tax_rate_pct", "tax_share_pct"] as const) {
    if (k in patch && !(Number(patch[k]) > 0 && Number(patch[k]) <= 100)) return fail("Enter a percentage between 0 and 100");
  }
  const sb = await createClient();
  const { data, error } = await sb.from("budget_cost_heads").update(patch).eq("id", headId).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("Only the budget preparer or an administrator changes cost heads");
  refresh();
  return { ok: true };
}

// ---------- custom field values ----------
export async function setCustomValues(entity: Entity, entityId: number, values: Record<string, unknown>): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.rpc("budget_set_custom_values", { p_entity: entity, p_entity_id: entityId, p_values: values });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ---------- custom field settings (right: fields.manage) ----------
export type FieldInput = Omit<CustomField, "id" | "active"> & { id?: number };

export async function saveField(f: FieldInput): Promise<Result<{ id: number }>> {
  const sb = await createClient();
  if (!/^[a-z][a-z0-9_]{0,39}$/.test(f.key)) return fail("The key starts with a letter and uses only small letters, digits and _ (for example planned_qty)");
  if (!f.label.trim()) return fail("Give the field a name");
  const isFormula = f.field_type === "formula";
  if ((f.field_type === "dropdown" || f.field_type === "multi_select") && !f.options.choices?.length) return fail("Add at least one choice");
  if (isFormula) {
    // Same check as the designer: the formula must parse, use only fields of this form, give the right type, and not loop.
    const { data: rows, error } = await sb.from("budget_custom_fields").select("*").in("entity", f.entity === "version" ? ["version", "line"] : [f.entity]).eq("active", true);
    if (error) return fail(error);
    const all = (rows as CustomField[]).filter((x) => x.id !== f.id && (x.project_id == null || f.project_id == null || x.project_id === f.project_id));
    const problem = checkFormula(f as unknown as FieldDef, f.entity, all.filter((x) => x.entity === f.entity) as unknown as FieldDef[],
      all.filter((x) => x.entity === "line") as unknown as FieldDef[]);
    if (problem) return fail(`Formula: ${problem}`);
  }
  const row = {
    entity: f.entity, project_id: f.project_id, key: f.key, label: f.label.trim(), help: f.help?.trim() || null, field_type: f.field_type,
    options: f.options ?? {}, formula: isFormula ? f.formula!.trim().replace(/^=/, "") : null, result_type: isFormula ? f.result_type : null,
    required: isFormula ? false : f.required, input_source: isFormula ? "typed" : f.input_source,
    excel_header: isFormula || f.input_source === "typed" ? null : f.excel_header?.trim() || null, section: f.section?.trim() || null, sort: f.sort,
    show_in_entry: f.show_in_entry, show_in_reports: f.show_in_reports, edit_permission: f.edit_permission || null, updated_at: new Date().toISOString(),
  };
  const res = f.id
    ? await sb.from("budget_custom_fields").update(row).eq("id", f.id).select("id")
    : await sb.from("budget_custom_fields").insert(row).select("id");
  if (res.error) {
    if (res.error.code === "23505") return fail(`This form already has a field with the key "${f.key}"`);
    return fail(res.error.message.includes("row-level security") ? "You do not have the right to change custom fields" : res.error.message);
  }
  if (!res.data?.length) return fail("You do not have the right to change custom fields");
  refresh();
  return { ok: true, id: res.data[0].id };
}

export async function setFieldActive(id: number, active: boolean): Promise<Result> {
  const sb = await createClient();
  const { data, error } = await sb.from("budget_custom_fields").update({ active, updated_at: new Date().toISOString() }).eq("id", id).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("You do not have the right to change custom fields");
  refresh();
  return { ok: true };
}

export async function deleteField(id: number): Promise<Result> {
  const sb = await createClient();
  const { data, error } = await sb.from("budget_custom_fields").delete().eq("id", id).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("You do not have the right to change custom fields");
  refresh();
  return { ok: true };
}

// ---------- access settings (right: access.manage) ----------
const noRight = (e: { message: string }) => fail(e.message.includes("row-level security") ? "You do not have the right to manage access" : e.message);

export async function saveRole(id: number | null, name: string, description: string): Promise<Result<{ id: number }>> {
  if (!name.trim()) return fail("Give the role a name");
  const sb = await createClient();
  const row = { name: name.trim(), description: description.trim() || null };
  const res = id ? await sb.from("budget_roles").update(row).eq("id", id).select("id") : await sb.from("budget_roles").insert(row).select("id");
  if (res.error) return res.error.code === "23505" ? fail("A role with that name already exists") : noRight(res.error);
  if (!res.data?.length) return fail("You do not have the right to manage access");
  refresh();
  return { ok: true, id: res.data[0].id };
}

export async function deleteRole(id: number): Promise<Result> {
  const sb = await createClient();
  const { count } = await sb.from("budget_members").select("user_id", { count: "exact", head: true }).eq("role_id", id);
  if (count) return fail(`${count} member(s) have this role. Give them another role first.`);
  const { data, error } = await sb.from("budget_roles").delete().eq("id", id).select("id");
  if (error) return noRight(error);
  if (!data?.length) return fail("You do not have the right to manage access");
  refresh();
  return { ok: true };
}

export async function setRolePermission(roleId: number, permission: string, on: boolean): Promise<Result> {
  const sb = await createClient();
  const { error } = on
    ? await sb.from("budget_role_permissions").insert({ role_id: roleId, permission })
    : await sb.from("budget_role_permissions").delete().eq("role_id", roleId).eq("permission", permission);
  if (error && error.code !== "23505") return noRight(error);
  refresh();
  return { ok: true };
}

export async function saveMember(m: { user_id: string; role_id: number; project_ids: number[] | null; department_ids: number[] | null; active: boolean }, isNew: boolean): Promise<Result> {
  const sb = await createClient();
  const row = { ...m, project_ids: m.project_ids?.length ? m.project_ids : null, department_ids: m.department_ids?.length ? m.department_ids : null };
  const res = isNew ? await sb.from("budget_members").insert(row).select("user_id") : await sb.from("budget_members").update(row).eq("user_id", m.user_id).select("user_id");
  if (res.error) return res.error.code === "23505" ? fail("That person is already a member") : noRight(res.error);
  if (!res.data?.length) return fail("You do not have the right to manage access");
  refresh();
  return { ok: true };
}

export async function removeMember(userId: string): Promise<Result> {
  const sb = await createClient();
  const { data, error } = await sb.from("budget_members").delete().eq("user_id", userId).select("user_id");
  if (error) return noRight(error);
  if (!data?.length) return fail("You do not have the right to manage access");
  refresh();
  return { ok: true };
}
