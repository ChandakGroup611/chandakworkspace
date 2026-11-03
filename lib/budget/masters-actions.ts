"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase";

// Writes from Masters & setup → Masters: departments, summary rows and GST rules.
// Row Level Security (right project.setup) and the triggers in 20261028121200_budget_masters.sql decide
// what is allowed; a refusal comes back as { error } for the screen to show.

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (e: { message: string } | string): { ok: false; error: string } => ({ ok: false, error: typeof e === "string" ? e : e.message });
const refresh = () => revalidatePath("/budget", "layout");
const NO_RIGHT = "You need the right to maintain towers, areas, cost heads and GST rules for all projects";
const pct = (raw: string | number) => {
  const n = Number(String(raw).replace(/%/g, "").trim());
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : null;
};
const int = (raw: string | number) => {
  const n = Number(String(raw).trim() || 0);
  return Number.isInteger(n) ? n : null;
};

// ---------- departments ----------
export async function saveDepartment(id: number | null, input: { name: string; summary_category: string; sort: string | number }): Promise<Result> {
  const name = input.name.trim();
  if (!name) return fail("Type the department name");
  const sort = int(input.sort);
  if (sort == null) return fail("Order must be a whole number");
  const sb = await createClient();
  const { data: cat } = await sb.from("budget_summary_template").select("category").eq("category", input.summary_category).limit(1);
  if (!cat?.length) return fail("Choose the summary category the department rolls into");
  const row = { name, summary_category: input.summary_category, sort };
  const { data, error } = id == null
    ? await sb.from("budget_departments").insert(row).select("id")
    : await sb.from("budget_departments").update(row).eq("id", id).select("id");
  if (error) return fail(error.code === "23505" ? `A department named ${name} already exists` : error);
  if (!data?.length) return fail(NO_RIGHT);
  refresh();
  return { ok: true };
}

export async function deleteDepartment(id: number): Promise<Result> {
  const sb = await createClient();
  const { data, error } = await sb.from("budget_departments").delete().eq("id", id).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail(NO_RIGHT);
  refresh();
  return { ok: true };
}

// ---------- summary rows ----------
export async function saveSummaryRow(old: { category: string; subcategory: string } | null,
  input: { category: string; subcategory: string; category_sort: string | number; subcategory_sort: string | number }): Promise<Result> {
  const category = input.category.trim(), subcategory = input.subcategory.trim();
  if (!category || !subcategory) return fail("Type both the category and the sub-category");
  const cs = int(input.category_sort), ss = int(input.subcategory_sort);
  if (cs == null || ss == null) return fail("Order must be a whole number");
  const row = { category, subcategory, category_sort: cs, subcategory_sort: ss };
  const sb = await createClient();
  const { data, error } = old == null
    ? await sb.from("budget_summary_template").insert(row).select("category")
    : await sb.from("budget_summary_template").update(row).eq("category", old.category).eq("subcategory", old.subcategory).select("category");
  if (error) return fail(error.code === "23505" ? `${category} / ${subcategory} already exists` : error);
  if (!data?.length) return fail(NO_RIGHT);
  refresh();
  return { ok: true };
}

export async function renameSummaryCategory(oldName: string, newName: string, sort: string | number): Promise<Result> {
  const s = int(sort);
  if (s == null) return fail("Order must be a whole number");
  const sb = await createClient();
  const { error } = await sb.rpc("budget_rename_summary_category", { p_old: oldName, p_new: newName.trim(), p_sort: s });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

export async function deleteSummaryRow(category: string, subcategory: string): Promise<Result> {
  const sb = await createClient();
  const { data, error } = await sb.from("budget_summary_template").delete().eq("category", category).eq("subcategory", subcategory).select("category");
  if (error) return fail(error);
  if (!data?.length) return fail(NO_RIGHT);
  refresh();
  return { ok: true };
}

// ---------- GST rules ----------
export async function saveGstRule(id: number | null, input: { name: string; rate: string; share: string; sort: string | number; active: boolean }): Promise<Result> {
  const name = input.name.trim();
  if (!name) return fail("Type a name for the GST rule, for example GST 18% x 74.08%");
  const rate = pct(input.rate), share = pct(input.share || 100), sort = int(input.sort);
  if (rate == null || share == null) return fail("Rate and eligible share are percentages above 0 and up to 100");
  if (sort == null) return fail("Order must be a whole number");
  const row = { name, rate_pct: rate, share_pct: share, sort, active: input.active };
  const sb = await createClient();
  const { data, error } = id == null
    ? await sb.from("budget_gst_rules").insert(row).select("id")
    : await sb.from("budget_gst_rules").update(row).eq("id", id).select("id");
  if (error) return fail(error.code === "23505" ? `A GST rule named ${name} already exists` : error);
  if (!data?.length) return fail(NO_RIGHT);
  refresh();
  return { ok: true };
}

export async function deleteGstRule(id: number): Promise<Result> {
  const sb = await createClient();
  const { data, error } = await sb.from("budget_gst_rules").delete().eq("id", id).select("id");
  if (error) return fail(error);
  if (!data?.length) return fail(NO_RIGHT);
  refresh();
  return { ok: true };
}
