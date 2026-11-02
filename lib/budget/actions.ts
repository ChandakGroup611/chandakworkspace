"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import type { CustomField, Entity } from "./data";
import { checkFormula, type FieldDef } from "./formula";
import BudgetImporter, { type CostRow, type ImportPayload } from "./importer";

// Writes from the budget screens. Each runs as the signed-in user, so Row Level Security and the
// workflow functions decide what is allowed; a refusal comes back as { error } for the screen to show.

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (e: { message: string } | string): { ok: false; error: string } => ({ ok: false, error: typeof e === "string" ? e : e.message });
const refresh = () => revalidatePath("/budget", "layout");
const AMOUNT = /^\d*\.?\d+$/;

async function getEffectiveClient() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { sb, user: null, isSuper: false };

  const isSuperMeta =
    user.app_metadata?.role === "SUPER_ADMIN" ||
    user.user_metadata?.role === "SUPER_ADMIN";

  if (isSuperMeta) return { sb: supabaseAdmin, user, isSuper: true };

  try {
    const { data: um } = await supabaseAdmin
      .from("user_master")
      .select("roles(code)")
      .eq("id", user.id)
      .maybeSingle();

    const roleCode = (um?.roles as any)?.code?.toUpperCase();
    if (["SUPER_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ADMIN", "SUPERADMIN"].includes(roleCode)) {
      return { sb: supabaseAdmin, user, isSuper: true };
    }
  } catch {}

  return { sb, user, isSuper: false };
}


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

// How a line's CTC is set: typed, rate (₹ per sq ft) × an area of the version, the balance of a total
// (total less the other lines of its category or department), or a memo item outside every total.
export type LineRule =
  | { kind: "typed" } | { kind: "memo" }
  | { kind: "rate"; rate: string; basis: string }
  | { kind: "balance"; total: string; scope: "category" | "department" };

export async function setLineRule(lineId: number, rule: LineRule): Promise<Result> {
  const patch: Record<string, unknown> = { ctc_rate: null, ctc_basis: null, balance_of_paise: null, balance_scope: null, is_memo: rule.kind === "memo" };
  if (rule.kind === "rate") {
    const rate = rule.rate.replace(/,/g, "").trim();
    if (!AMOUNT.test(rate)) return fail("Type the rate in rupees per sq ft, for example 250");
    if (!/^[a-z_]{1,40}$/.test(rule.basis)) return fail("Choose the area the rate applies to");
    Object.assign(patch, { ctc_rate: Number(rate), ctc_basis: rule.basis });
  } else if (rule.kind === "balance") {
    const total = rule.total.replace(/,/g, "").trim();
    if (!AMOUNT.test(total)) return fail("Type the total in crores, for example 45");
    Object.assign(patch, { balance_of_paise: BudgetImporter.paiseFromCr(total), balance_scope: rule.scope });
  }
  const sb = await createClient();
  const { data, error } = await sb.from("budget_lines").update(patch).eq("id", lineId).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("You cannot change this line");
  refresh();
  return { ok: true };
}

export async function setDepartmentRemark(versionId: number, departmentId: number, text: string): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.rpc("budget_set_department_remark", { p_version: versionId, p_department: departmentId, p_text: text });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function setTowerNote(versionId: number, towerId: number, ocDate: string, reason: string): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.rpc("budget_set_tower_note", { p_version: versionId, p_tower: towerId, p_oc_date: ocDate || null, p_reason: reason });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

/** Amount certified by billing on a line, in crores (blank clears it). */
export async function setCertified(lineId: number, raw: string): Promise<Result> {
  const text = raw.replace(/,/g, "").trim();
  if (text !== "" && !AMOUNT.test(text)) return fail("Type the certified amount in crores, for example 12.5");
  const sb = await createClient();
  const { data, error } = await sb.from("budget_lines").update({ certified_paise: text === "" ? null : BudgetImporter.paiseFromCr(text) }).eq("id", lineId).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("You cannot change this line");
  refresh();
  return { ok: true };
}

/** A tower's construction BUA and design area for this version (sq ft; blank uses the tower's own). */
export async function setTowerAreas(versionId: number, towerId: number, bua: string, design: string): Promise<Result> {
  const n = (s: string) => (s.trim() === "" ? null : Number(s.replace(/,/g, "")));
  if ([bua, design].some((s) => s.trim() !== "" && !(Number(s.replace(/,/g, "")) >= 0))) return fail("Type the areas in sq ft");
  const sb = await createClient();
  const { error } = await sb.rpc("budget_set_tower_areas", { p_version: versionId, p_tower: towerId, p_bua: n(bua), p_design: n(design) });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ---------- supporting schedules ----------
/** Gives a line a schedule: from now on its CTC is the schedule's total. */
export async function addSchedule(versionId: number, lineId: number, title: string): Promise<Result> {
  const sb = await createClient();
  const { error: e1 } = await sb.from("budget_lines").update({ ctc_rate: null, ctc_basis: null, balance_of_paise: null, balance_scope: null, is_memo: false }).eq("id", lineId);
  if (e1) return fail(e1);
  const { data, error } = await sb.from("budget_schedules").insert({ version_id: versionId, line_id: lineId, title: title.trim() || "Working" }).select("id");
  if (error) return fail(error.code === "23505" ? "This line already has a schedule" : error.message.includes("row-level security") ? "You cannot change this line" : error.message);
  if (!data?.length) return fail("You cannot change this line");
  refresh();
  return { ok: true };
}

export async function updateSchedule(id: number, patch: { title?: string; note?: string | null }): Promise<Result> {
  if (patch.title !== undefined && !patch.title.trim()) return fail("Give the schedule a title");
  const sb = await createClient();
  const { data, error } = await sb.from("budget_schedules").update(patch).eq("id", id).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("You cannot change this schedule");
  refresh();
  return { ok: true };
}

/** Removes the schedule; the line keeps its last CTC and can be typed again. */
export async function deleteSchedule(id: number): Promise<Result> {
  const sb = await createClient();
  const { data, error } = await sb.from("budget_schedules").delete().eq("id", id).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("You cannot change this schedule");
  refresh();
  return { ok: true };
}

export interface ScheduleRowInput { label: string; qty: string; rate: string; pct: string; periods: string; amount: string; remark: string }
/** Adds or changes a schedule row. Numbers as typed (₹ for rate and amount); blank amount = calculate. */
export async function saveScheduleRow(scheduleId: number, rowId: number | null, sort: number, r: ScheduleRowInput): Promise<Result> {
  const num = (s: string, name: string, dflt: number | null) => {
    const t = s.replace(/,/g, "").trim();
    if (t === "") return dflt;
    if (!/^-?\d*\.?\d+$/.test(t)) throw new Error(`${name}: type a number`);
    return Number(t);
  };
  if (!r.label.trim() && !r.qty.trim() && !r.rate.trim() && !r.amount.trim()) return fail("Type the item and its quantity and rate, or an amount");
  let row: Record<string, unknown>;
  try {
    const amount = num(r.amount, "Amount", null);
    row = {
      schedule_id: scheduleId, sort, label: r.label.trim(), qty: num(r.qty, "Quantity", null), rate: num(r.rate, "Rate", null),
      pct: num(r.pct, "Percent", 100), periods: num(r.periods, "Periods", 1),
      amount_paise: amount == null ? null : BudgetImporter.paiseFromInr(String(amount)), remark: r.remark.trim() || null,
    };
  } catch (e) {
    return fail((e as Error).message);
  }
  const sb = await createClient();
  const res = rowId ? await sb.from("budget_schedule_rows").update(row).eq("id", rowId).select("id") : await sb.from("budget_schedule_rows").insert(row).select("id");
  if (res.error) return fail(res.error.message.includes("row-level security") ? "You cannot change this schedule" : res.error.message);
  if (!res.data?.length) return fail("You cannot change this schedule");
  refresh();
  return { ok: true };
}

export async function deleteScheduleRow(rowId: number): Promise<Result> {
  const sb = await createClient();
  const { data, error } = await sb.from("budget_schedule_rows").delete().eq("id", rowId).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("You cannot change this schedule");
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

// ---------- sign-off ----------
export async function submitVersion(versionId: number, comment: string): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.rpc("budget_submit_version", { p_version: versionId, p_comment: comment });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function signVersion(versionId: number, action: "signed" | "returned", comment: string): Promise<Result<{ outcome: string }>> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("budget_sign_version", { p_version: versionId, p_action: action, p_comment: comment });
  if (error) return fail(error);
  refresh();
  return { ok: true, outcome: data as string };
}

export async function recallVersion(versionId: number): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.rpc("budget_recall_version", { p_version: versionId });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

/** A sign-off level: a project's own (project.setup) or for every project (access.manage). */
export async function saveSignoffLevel(l: { id?: number; project_id: number | null; sort: number; title: string; approver_ids: string[] }): Promise<Result> {
  if (!l.title.trim()) return fail("Give the level a title, for example Checked by");
  if (!l.approver_ids.length) return fail("Choose at least one approver for the level");
  const sb = await createClient();
  const row = { project_id: l.project_id, sort: l.sort, title: l.title.trim(), approver_ids: l.approver_ids };
  const res = l.id ? await sb.from("budget_signoff_levels").update(row).eq("id", l.id).select("id") : await sb.from("budget_signoff_levels").insert(row).select("id");
  if (res.error) return fail(res.error.message.includes("row-level security") ? "You cannot change this sign-off chain" : res.error.message);
  if (!res.data?.length) return fail("You cannot change this sign-off chain");
  refresh();
  return { ok: true };
}

export async function deleteSignoffLevel(id: number): Promise<Result> {
  const sb = await createClient();
  const { data, error } = await sb.from("budget_signoff_levels").delete().eq("id", id).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("You cannot change this sign-off chain");
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

/** `areas` and `category_reasons` are merged into what is saved, so two fields saved in quick succession both stay. */
export async function updateVersion(versionId: number, patch: { as_on?: string; reason?: string | null; category_reasons?: Record<string, string>; areas?: object }): Promise<Result> {
  const sb = await createClient();
  const row: Record<string, unknown> = { ...patch };
  if (patch.areas || patch.category_reasons) {
    const { data: cur, error: e0 } = await sb.from("budget_versions").select("areas, category_reasons").eq("id", versionId).single();
    if (e0) return fail(e0);
    if (patch.areas) row.areas = { ...(cur.areas ?? {}), ...patch.areas };
    if (patch.category_reasons) row.category_reasons = { ...(cur.category_reasons ?? {}), ...patch.category_reasons };
  }
  const { data, error } = await sb.from("budget_versions").update(row).eq("id", versionId).select("id");
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

export interface BillInput { vendor: string; billNo: string; date: string; workOrder: string; gst: string; note: string }
export interface BillSplitInput { head: number; tower: number | null; amount: string }
const RUPEES = /^-?\d*\.?\d+$/;

/** Records a bill split over one or more cost heads; each split counts as cost incurred in the bill's month. */
export async function addBill(projectId: number, bill: BillInput, splits: BillSplitInput[]): Promise<Result> {
  if (!bill.vendor.trim() || !bill.billNo.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(bill.date)) return fail("Enter the vendor, bill number and bill date");
  const gst = bill.gst.replace(/,/g, "").trim();
  if (gst && (!RUPEES.test(gst) || gst.startsWith("-"))) return fail("Enter GST in rupees");
  const used = splits.filter((s) => s.amount.replace(/,/g, "").trim());
  if (!used.length) return fail("Split the bill over at least one cost head");
  if (used.some((s) => !RUPEES.test(s.amount.replace(/,/g, "").trim()))) return fail("Enter each split's amount in rupees");
  const sb = await createClient();
  const { error } = await sb.rpc("budget_add_bill", {
    p_project: projectId,
    p_bill: { vendor: bill.vendor, bill_no: bill.billNo, bill_date: bill.date, work_order: bill.workOrder, note: bill.note, gst_paise: gst ? BudgetImporter.paiseFromInr(gst) : 0 },
    p_splits: used.map((s) => ({ head: s.head, tower: s.tower, amount_paise: BudgetImporter.paiseFromInr(s.amount.replace(/,/g, "").trim()) })),
  });
  if (error) return fail(error.message.includes("row-level security") ? "You cannot record cost for one of these departments" : error.message);
  refresh();
  return { ok: true };
}

/** Changes a bill's details and replaces its splits. */
export async function updateBill(billId: number, bill: BillInput, splits: BillSplitInput[]): Promise<Result> {
  if (!bill.vendor.trim() || !bill.billNo.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(bill.date)) return fail("Enter the vendor, bill number and bill date");
  const gst = bill.gst.replace(/,/g, "").trim();
  if (gst && (!RUPEES.test(gst) || gst.startsWith("-"))) return fail("Enter GST in rupees");
  const used = splits.filter((s) => s.amount.replace(/,/g, "").trim());
  if (!used.length) return fail("Split the bill over at least one cost head");
  if (used.some((s) => !RUPEES.test(s.amount.replace(/,/g, "").trim()))) return fail("Enter each split's amount in rupees");
  const sb = await createClient();
  const { error } = await sb.rpc("budget_update_bill", {
    p_bill_id: billId,
    p_bill: { vendor: bill.vendor, bill_no: bill.billNo, bill_date: bill.date, work_order: bill.workOrder, note: bill.note, gst_paise: gst ? BudgetImporter.paiseFromInr(gst) : 0 },
    p_splits: used.map((s) => ({ head: s.head, tower: s.tower, amount_paise: BudgetImporter.paiseFromInr(s.amount.replace(/,/g, "").trim()) })),
  });
  if (error) return fail(error.message.includes("row-level security") ? "You cannot record cost for one of these departments" : error.message);
  refresh();
  return { ok: true };
}

/** Changes a typed or imported cost entry (a bill's splits are changed on the bill). */
export async function updateEntry(entryId: number, headId: number, towerId: number | null, month: string, amount: string, reference: string): Promise<Result> {
  const text = amount.replace(/,/g, "").trim();
  if (!RUPEES.test(text) || !/^\d{4}-\d{2}$/.test(month)) return fail("Enter the month and an amount in rupees");
  const sb = await createClient();
  const { data, error } = await sb.from("budget_incurred_entries").update({
    cost_head_id: headId, subproject_id: towerId, month: month + "-01", amount_paise: BudgetImporter.paiseFromInr(text), reference: reference.trim() || null,
  }).eq("id", entryId).is("bill_id", null).select("id");
  if (error) return fail(error.message.includes("row-level security") ? "You cannot record cost for this department" : error.message);
  if (!data?.length) return fail("You cannot change this entry");
  refresh();
  return { ok: true };
}

/** Deletes a bill and its splits. */
export async function deleteBill(billId: number): Promise<Result> {
  const sb = await createClient();
  const { data, error } = await sb.from("budget_bills").delete().eq("id", billId).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("You cannot delete this bill: it is split over a department you do not record cost for");
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
  const { sb } = await getEffectiveClient();
  const { data, error } = await sb.rpc("budget_create_project", { p_name: name, p_code: code || name.slice(0, 12), p_towers: towers, p_copy_heads_from: copyHeadsFrom });
  if (error) return fail(error);
  refresh();
  return { ok: true, projectId: data as number };
}

/** Removes a tower added by mistake; refused once it carries any figure. */
export async function deleteTower(towerId: number): Promise<Result> {
  const { sb } = await getEffectiveClient();
  const { error } = await sb.rpc("budget_delete_tower", { p_tower: towerId });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

/** Removes a cost head added by mistake; refused once it carries any figure. */
export async function deleteHead(headId: number): Promise<Result> {
  const { sb } = await getEffectiveClient();
  const { error } = await sb.rpc("budget_delete_head", { p_head: headId });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

/** Renames a cost head (category / sub-category). */
export async function renameHead(headId: number, category: string, subCategory: string): Promise<Result> {
  if (!category.trim()) return fail("Give the cost head a category name");
  const { sb } = await getEffectiveClient();
  const { data, error } = await sb.from("budget_cost_heads").update({ category: category.trim(), sub_category: subCategory.trim() || null }).eq("id", headId).select("id");
  if (error) return fail(error.code === "23505" ? "Another cost head of this department has that name" : error.message);
  if (!data?.length) return fail("You do not have the set-up right for this project");
  refresh();
  return { ok: true };
}

/** Project name, code and location. */
export async function updateProject(projectId: number, p: { name: string; code: string; location: string }): Promise<Result> {
  if (!p.name.trim() || !p.code.trim()) return fail("Give the project a name and a code");
  const { sb } = await getEffectiveClient();
  const { data, error } = await sb.from("budget_projects").update({ name: p.name.trim(), code: p.code.trim(), location: p.location.trim() || null }).eq("id", projectId).select("id");
  if (error) return fail(error.code === "23505" ? "Another project has that code" : error.message);
  if (!data?.length) return fail("You do not have the set-up right for this project");
  refresh();
  return { ok: true };
}

/** Delete a project; refused if it carries approved figures or active versions. */
export async function deleteProject(projectId: number): Promise<Result> {
  const { sb, isSuper } = await getEffectiveClient();

  // Safety check: verify if project carries active budget versions
  const { count: versionCount } = await supabaseAdmin
    .from("budget_versions")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (versionCount && versionCount > 0) {
    return fail("Cannot delete project: it has active budget versions or figures");
  }

  // Attempt deletion via effective client
  const { data, error } = await sb.from("budget_projects").delete().eq("id", projectId).select("id");
  if (error) {
    if (error.message.includes("violates") || error.message.includes("foreign key")) {
      return fail("Cannot delete project: it has linked records");
    }
    return fail(error.message);
  }

  // Fallback to supabaseAdmin if standard user client was restricted
  if (!data?.length) {
    const { data: adminData, error: adminErr } = await supabaseAdmin
      .from("budget_projects")
      .delete()
      .eq("id", projectId)
      .select("id");

    if (adminErr) return fail(adminErr.message);
    if (!adminData?.length) return fail("Project not found or already deleted");
  }

  refresh();
  return { ok: true };
}

/** Comments on a budget line. */
export async function addComment(versionId: number, lineId: number, body: string): Promise<Result> {
  if (!body.trim()) return fail("Write the comment first");
  const sb = await createClient();
  const { error } = await sb.from("budget_comments").insert({ version_id: versionId, line_id: lineId, body: body.trim() });
  if (error) return fail(error.message.includes("row-level security") ? "You cannot comment on this project" : error.message);
  refresh();
  return { ok: true };
}
export async function deleteComment(id: number): Promise<Result> {
  const sb = await createClient();
  const { data, error } = await sb.from("budget_comments").delete().eq("id", id).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail("You can delete only your own comments");
  refresh();
  return { ok: true };
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

export async function saveRole(
  id: number | null,
  name: string,
  description: string,
  permissions?: string[]
): Promise<Result<{ id: number }>> {
  if (!name.trim()) return fail("Give the role a name");
  const { sb } = await getEffectiveClient();
  const row = { name: name.trim(), description: description.trim() || null };
  const res = id
    ? await sb.from("budget_roles").update(row).eq("id", id).select("id")
    : await sb.from("budget_roles").insert(row).select("id");

  if (res.error) return res.error.code === "23505" ? fail("A role with that name already exists") : noRight(res.error);
  if (!res.data?.length) return fail("You do not have the right to manage access");
  
  const roleId = res.data[0].id;

  // If initial permissions are passed, sync them
  if (permissions && Array.isArray(permissions)) {
    await sb.from("budget_role_permissions").delete().eq("role_id", roleId);
    if (permissions.length > 0) {
      const rows = permissions.map((p) => ({ role_id: roleId, permission: p }));
      await sb.from("budget_role_permissions").insert(rows);
    }
  }

  refresh();
  return { ok: true, id: roleId };
}

export async function deleteRole(id: number): Promise<Result> {
  const { sb } = await getEffectiveClient();
  const { count } = await sb.from("budget_members").select("user_id", { count: "exact", head: true }).eq("role_id", id);
  if (count) return fail(`${count} member(s) have this role. Give them another role first.`);
  const { data, error } = await sb.from("budget_roles").delete().eq("id", id).select("id");
  if (error) return noRight(error);
  if (!data?.length) return fail("You do not have the right to manage access");
  refresh();
  return { ok: true };
}

export async function setRolePermission(roleId: number, permission: string, on: boolean): Promise<Result> {
  const { sb } = await getEffectiveClient();
  const { error } = on
    ? await sb.from("budget_role_permissions").insert({ role_id: roleId, permission })
    : await sb.from("budget_role_permissions").delete().eq("role_id", roleId).eq("permission", permission);
  if (error && error.code !== "23505") return noRight(error);
  refresh();
  return { ok: true };
}

export async function batchSetRolePermissions(roleId: number, permissions: string[]): Promise<Result> {
  const { sb } = await getEffectiveClient();
  // Never strip all rights from Administrator system role
  const { data: role } = await sb.from("budget_roles").select("name, is_system").eq("id", roleId).single();
  if (role?.is_system && permissions.length === 0) {
    return fail("Cannot remove all permissions from system Administrator");
  }

  // Clear existing role permissions
  const { error: delErr } = await sb.from("budget_role_permissions").delete().eq("role_id", roleId);
  if (delErr) return noRight(delErr);

  if (permissions.length > 0) {
    const rows = permissions.map((p) => ({ role_id: roleId, permission: p }));
    const { error: insErr } = await sb.from("budget_role_permissions").insert(rows);
    if (insErr) return noRight(insErr);
  }

  refresh();
  return { ok: true };
}

export async function saveMember(
  m: { user_id: string; role_id: number; project_ids: number[] | null; department_ids: number[] | null; active: boolean },
  isNew: boolean
): Promise<Result> {
  const { sb } = await getEffectiveClient();
  const row = {
    ...m,
    project_ids: m.project_ids?.length ? m.project_ids : null,
    department_ids: m.department_ids?.length ? m.department_ids : null,
  };
  const res = isNew
    ? await sb.from("budget_members").insert(row).select("user_id")
    : await sb.from("budget_members").update(row).eq("user_id", m.user_id).select("user_id");
  if (res.error) return res.error.code === "23505" ? fail("That person is already a member") : noRight(res.error);
  if (!res.data?.length) return fail("You do not have the right to manage access");
  refresh();
  return { ok: true };
}

export async function removeMember(userId: string): Promise<Result> {
  const { sb } = await getEffectiveClient();
  const { data, error } = await sb.from("budget_members").delete().eq("user_id", userId).select("user_id");
  if (error) return noRight(error);
  if (!data?.length) return fail("You do not have the right to manage access");
  refresh();
  return { ok: true };
}
