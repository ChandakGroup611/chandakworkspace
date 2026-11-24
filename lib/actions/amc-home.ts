"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { checkServerPermission } from "@/lib/permissions";

/**
 * AMC & Subscriptions home (redesign stage 1): what needs attention. Read-only.
 * Renewals come from expiry dates, payments from pending invoices (amc_invoices), seats from
 * total / used licences, and "to tidy up" from records missing a PO or documents.
 */

export interface AMCHomeRow {
  id: string;
  name: string;
  vendor: string;
  type: "AMC" | "Subscription";
  owner: string;
  department: string;
  amount: number;
  currency: string;
  date: string | null;
  days: number | null;
}

export interface AMCHomeData {
  activeCount: number;
  activeValue: number;
  currency: string;
  /** Contracts in other currencies are never added to rupee totals. */
  otherCurrencies: { currency: string; amount: number; count: number }[];
  renewals: AMCHomeRow[];
  payments: (AMCHomeRow & { invoice: string })[];
  overdueCount: number;
  dueValue: number;
  unusedSeats: number;
  unusedSeatsValue: number;
  seatsTop: (AMCHomeRow & { unused: number; total: number })[];
  noPo: AMCHomeRow[];
  noDocs: AMCHomeRow[];
  expiredActive: AMCHomeRow[];
  byDepartment: { name: string; amount: number }[];
}

const DAY = 86400000;
const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const daysFrom = (today: string, d?: string | null) => (d ? Math.round((new Date(d.slice(0, 10)).getTime() - new Date(today).getTime()) / DAY) : null);

export async function getAMCHome(): Promise<AMCHomeData | null> {
  const allowed =
    (await checkServerPermission("SUPER_ADMIN")) || (await checkServerPermission("AMC_VIEW")) || (await checkServerPermission("AMC_MANAGE"));
  if (!allowed) return null;

  const today = todayIST();
  const [recRes, invRes, attRes, deptRes] = await Promise.all([
    supabaseAdmin
      .from("software_amc")
      .select("id, software_name, provider_name, contract_type, status, expiry_date, cost, currency, po_number, total_licenses, used_licenses, department_id, assigned_to, vendor_id")
      .eq("is_deleted", false)
      .limit(2000),
    supabaseAdmin
      .from("amc_invoices")
      .select("id, amc_id, amount, due_date, status, description, invoice_number")
      .eq("status", "Pending")
      .lte("due_date", new Date(new Date(today).getTime() + 30 * DAY).toISOString().slice(0, 10))
      .order("due_date", { ascending: true })
      .limit(500),
    supabaseAdmin.from("amc_attachments").select("amc_id").limit(5000),
    supabaseAdmin.from("departments").select("id, name"),
  ]);

  const recs0 = (recRes.data || []) as any[];
  const userIds = Array.from(new Set(recs0.map((r) => r.assigned_to).filter(Boolean)));
  const vendorIds = Array.from(new Set(recs0.map((r) => r.vendor_id).filter(Boolean)));
  const [usersRes, vendorsRes] = await Promise.all([
    userIds.length ? supabaseAdmin.from("user_master").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [] } as any),
    vendorIds.length ? supabaseAdmin.from("vendor_master").select("id, name").in("id", vendorIds) : Promise.resolve({ data: [] } as any),
  ]);
  const userName = new Map(((usersRes as any).data || []).map((u: any) => [u.id, u.full_name]));
  const vendorName = new Map(((vendorsRes as any).data || []).map((v: any) => [v.id, v.name]));
  const depts = new Map((deptRes.data || []).map((d: any) => [d.id, d.name]));
  const withDocs = new Set((attRes.data || []).map((a: any) => a.amc_id));
  const recs = recs0;

  const toRow = (r: any, amount?: number, date?: string | null): AMCHomeRow => ({
    id: r.id,
    name: r.software_name || "Untitled",
    vendor: (vendorName.get(r.vendor_id) as string) || r.provider_name || "",
    type: r.contract_type === "Subscription" ? "Subscription" : "AMC",
    owner: (userName.get(r.assigned_to) as string) || "",
    department: depts.get(r.department_id) || "",
    amount: Number(amount ?? r.cost) || 0,
    currency: r.currency || "INR",
    date: date === undefined ? r.expiry_date : date,
    days: daysFrom(today, date === undefined ? r.expiry_date : date),
  });

  const active = recs.filter((r) => String(r.status || "").toLowerCase() === "active");
  const byId = new Map(recs.map((r) => [r.id, r]));

  const renewals = active
    .map((r) => toRow(r))
    .filter((r) => r.days !== null && r.days >= 0 && r.days <= 90)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

  const payments = (invRes.data || [])
    .map((i: any) => {
      const r = byId.get(i.amc_id);
      if (!r) return null;
      return { ...toRow(r, Number(i.amount), i.due_date), invoice: i.description || i.invoice_number || "Payment" };
    })
    .filter(Boolean) as AMCHomeData["payments"];

  const seats = active
    .filter((r) => r.contract_type === "Subscription" && Number(r.total_licenses) > 0)
    .map((r) => {
      const total = Number(r.total_licenses) || 0;
      const used = Math.min(Number(r.used_licenses) || 0, total);
      return { ...toRow(r), unused: total - used, total, perSeat: total ? (Number(r.cost) || 0) / total : 0 };
    })
    .filter((r) => r.unused > 0)
    .sort((a, b) => b.unused - a.unused);

  const byDeptMap = new Map<string, number>();
  const isInr = (r: any) => !r.currency || String(r.currency).toUpperCase() === "INR";
  const others = new Map<string, { amount: number; count: number }>();
  for (const r of active.filter((x) => !isInr(x))) {
    const c = String(r.currency).toUpperCase();
    const o = others.get(c) || { amount: 0, count: 0 };
    o.amount += Number(r.cost) || 0;
    o.count += 1;
    others.set(c, o);
  }
  for (const r of active.filter(isInr)) {
    const k = depts.get(r.department_id) || "No department";
    byDeptMap.set(k, (byDeptMap.get(k) || 0) + (Number(r.cost) || 0));
  }

  return {
    activeCount: active.length,
    activeValue: active.filter(isInr).reduce((s, r) => s + (Number(r.cost) || 0), 0),
    otherCurrencies: Array.from(others.entries()).map(([currency, o]) => ({ currency, ...o })),
    currency: "INR",
    renewals,
    payments,
    overdueCount: payments.filter((p) => (p.days ?? 0) < 0).length,
    dueValue: payments.filter((p) => !p.currency || p.currency.toUpperCase() === "INR").reduce((s, p) => s + p.amount, 0),
    unusedSeats: seats.reduce((s, r) => s + r.unused, 0),
    unusedSeatsValue: seats.reduce((s, r) => s + r.unused * r.perSeat, 0),
    seatsTop: seats.slice(0, 5).map(({ perSeat: _p, ...r }) => r),
    noPo: active.filter((r) => !String(r.po_number || "").trim()).map((r) => toRow(r)),
    noDocs: active.filter((r) => !withDocs.has(r.id)).map((r) => toRow(r)),
    expiredActive: active.filter((r) => r.expiry_date && r.expiry_date < today).map((r) => toRow(r)),
    byDepartment: Array.from(byDeptMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8),
  };
}
