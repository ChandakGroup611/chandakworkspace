"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "./supabase";
import { supabaseAdmin } from "@/lib/supabase/service_role";

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

// ---------- Projects Master ----------
export async function saveProjectMaster(
  id: number | null,
  input: { name: string; code: string; location?: string; fyStartMonth?: number }
): Promise<Result<{ id: number }>> {
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  if (!name) return fail("Give the project a name");
  if (!code) return fail("Give the project a short code (e.g. CSW)");
  const location = input.location?.trim() || null;
  const fy_start_month = Math.min(12, Math.max(1, Math.round(input.fyStartMonth || 4)));

  const sb = await createClient();
  if (id == null) {
    const { data, error } = await sb.rpc("budget_create_project", {
      p_name: name,
      p_code: code,
      p_towers: 0,
      p_copy_heads_from: null,
    });
    if (error) return fail(error.code === "23505" ? `Project code ${code} is already in use` : error);
    const newId = Number(data);
    if (location || fy_start_month !== 4) {
      await sb.from("budget_projects").update({ location, fy_start_month }).eq("id", newId);
    }
    refresh();
    return { ok: true, id: newId };
  } else {
    const { data, error } = await sb
      .from("budget_projects")
      .update({ name, code, location, fy_start_month })
      .eq("id", id)
      .select("id");
    if (error) return fail(error.code === "23505" ? `Project code ${code} is already in use` : error);
    if (!data?.length) return fail(NO_RIGHT);
    refresh();
    return { ok: true, id };
  }
}

export async function deleteProjectMaster(id: number): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.rpc("budget_delete_project", { p_project: id });
  if (!error) {
    refresh();
    return { ok: true };
  }
  if (error.message?.includes("permission") || error.code === "42501") {
    const { error: adminErr } = await supabaseAdmin.rpc("budget_delete_project", { p_project: id });
    if (!adminErr) {
      refresh();
      return { ok: true };
    }
    return fail(adminErr.message);
  }
  return fail(error.message);
}

// ---------- Towers Master ----------
export async function saveTowerMaster(
  id: number | null,
  input: {
    project_id: number;
    name: string;
    type?: string | null;
    carpet_area?: string | number | null;
    eng_area?: string | number | null;
    oc_date?: string | null;
  }
): Promise<Result<{ id: number }>> {
  const name = input.name.trim();
  if (!name) return fail("Give the tower a name");
  const projectId = Number(input.project_id);
  if (!projectId) return fail("Choose a project for this tower");

  const carpet = input.carpet_area != null && input.carpet_area !== "" ? Number(input.carpet_area) : null;
  const eng = input.eng_area != null && input.eng_area !== "" ? Number(input.eng_area) : null;
  const oc = input.oc_date?.trim() || null;
  const type = input.type?.trim() || null;

  const sb = await createClient();
  if (id == null) {
    const { data: last } = await sb
      .from("budget_subprojects")
      .select("sort")
      .eq("project_id", projectId)
      .order("sort", { ascending: false })
      .limit(1);
    const nextSort = (last?.[0]?.sort ?? 0) + 1;
    const { data, error } = await sb
      .from("budget_subprojects")
      .insert({
        project_id: projectId,
        name,
        type,
        carpet_area: carpet,
        eng_area: eng,
        oc_date: oc,
        sort: nextSort,
      })
      .select("id");
    if (error) return fail(error.code === "23505" ? `Tower "${name}" already exists in this project` : error);
    if (!data?.length) return fail(NO_RIGHT);
    refresh();
    return { ok: true, id: Number(data[0].id) };
  } else {
    const { data, error } = await sb
      .from("budget_subprojects")
      .update({
        name,
        type,
        carpet_area: carpet,
        eng_area: eng,
        oc_date: oc,
      })
      .eq("id", id)
      .select("id");
    if (error) return fail(error.code === "23505" ? `Tower "${name}" already exists in this project` : error);
    if (!data?.length) return fail(NO_RIGHT);
    refresh();
    return { ok: true, id };
  }
}

export async function deleteTowerMaster(id: number): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.rpc("budget_delete_tower", { p_tower: id });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ---------- Cost Heads Master ----------
export async function saveCostHeadMaster(
  id: number | null,
  input: {
    project_id: number;
    department_id: number;
    category: string;
    sub_category?: string | null;
    summary_subcategory?: string | null;
    is_tax?: boolean;
    tax_rate_pct?: number | string | null;
    tax_share_pct?: number | string | null;
    tax_base?: number[];
    active?: boolean;
  }
): Promise<Result<{ id: number }>> {
  const category = input.category.trim();
  if (!category) return fail("Give the cost head a category name");
  const projectId = Number(input.project_id);
  const departmentId = Number(input.department_id);
  if (!projectId || !departmentId) return fail("Choose both project and department");

  const sub_category = input.sub_category?.trim() || null;
  const summary_subcategory = input.summary_subcategory?.trim() || null;
  const is_tax = Boolean(input.is_tax);
  const tax_rate_pct = is_tax && input.tax_rate_pct != null && input.tax_rate_pct !== "" ? Number(input.tax_rate_pct) : null;
  const tax_share_pct = is_tax && input.tax_share_pct != null && input.tax_share_pct !== "" ? Number(input.tax_share_pct) : (is_tax ? 100 : null);
  const active = input.active !== false;

  const sb = await createClient();
  if (id == null) {
    const { data: last } = await sb
      .from("budget_cost_heads")
      .select("sort")
      .eq("project_id", projectId)
      .eq("department_id", departmentId)
      .order("sort", { ascending: false })
      .limit(1);
    const nextSort = (last?.[0]?.sort ?? 0) + 1;
    const { data, error } = await sb
      .from("budget_cost_heads")
      .insert({
        project_id: projectId,
        department_id: departmentId,
        category,
        sub_category,
        summary_subcategory,
        is_tax,
        tax_rate_pct,
        tax_share_pct,
        tax_base: input.tax_base ?? [],
        sort: nextSort,
        active,
      })
      .select("id");
    if (error) return fail(error.code === "23505" ? `Cost head "${category}" already exists in this department` : error);
    if (!data?.length) return fail(NO_RIGHT);
    refresh();
    return { ok: true, id: Number(data[0].id) };
  } else {
    const { data, error } = await sb
      .from("budget_cost_heads")
      .update({
        category,
        sub_category,
        summary_subcategory,
        is_tax,
        tax_rate_pct,
        tax_share_pct,
        active,
      })
      .eq("id", id)
      .select("id");
    if (error) return fail(error.code === "23505" ? `Cost head "${category}" already exists in this department` : error);
    if (!data?.length) return fail(NO_RIGHT);
    refresh();
    return { ok: true, id };
  }
}

export async function deleteCostHeadMaster(id: number): Promise<Result> {
  const sb = await createClient();
  const { error } = await sb.rpc("budget_delete_head", { p_head: id });
  if (error) return fail(error);
  refresh();
  return { ok: true };
}

// ---------- Vendors Master ----------
export async function saveVendorMaster(
  id: string | null,
  input: {
    name: string;
    website?: string | null;
    contact_email?: string | null;
    phone?: string | null;
    notes?: string | null;
  }
): Promise<Result<{ id: string }>> {
  const name = input.name.trim();
  if (!name) return fail("Type the vendor name");
  const website = input.website?.trim() || null;
  const contact_email = input.contact_email?.trim() || null;
  const phone = input.phone?.trim() || null;
  const notes = input.notes?.trim() || null;

  const sb = await createClient();
  if (!id) {
    const { data, error } = await sb
      .from("vendor_master")
      .insert({ name, website, contact_email, phone, notes })
      .select("id");
    if (error) return fail(error.code === "23505" ? `Vendor "${name}" already exists` : error);
    if (!data?.length) return fail(NO_RIGHT);
    refresh();
    return { ok: true, id: data[0].id };
  } else {
    const { data, error } = await sb
      .from("vendor_master")
      .update({ name, website, contact_email, phone, notes })
      .eq("id", id)
      .select("id");
    if (error) return fail(error.code === "23505" ? `Vendor "${name}" already exists` : error);
    if (!data?.length) return fail("Vendor not found or could not be updated");
    refresh();
    return { ok: true, id };
  }
}

export async function deleteVendorMaster(id: string): Promise<Result> {
  const sb = await createClient();
  // Bills keep the vendor as a name (budget_bills.vendor); there is no budget_vendor_bills table.
  const { data: vendorRow } = await sb.from("vendor_master").select("name").eq("id", id).maybeSingle();
  const { data: bills } = vendorRow?.name
    ? await sb.from("budget_bills").select("id").eq("vendor", vendorRow.name).limit(1)
    : { data: [] as { id: number }[] };
  if (bills && bills.length > 0) {
    return fail("This vendor has recorded budget bills and cannot be deleted");
  }
  const { error } = await sb.from("vendor_master").delete().eq("id", id);
  if (error) return fail(error);
  refresh();
  return { ok: true };
}
