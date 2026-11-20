"use server";

import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { checkServerPermission } from "@/lib/permissions";

/**
 * AMC & Subscription reports.
 *
 * Every value is resolved to display text / plain numbers on the server so the report
 * screen and the Excel / PDF export show exactly the same thing.
 *
 * Reads go through the signed-in user's Supabase client, so row-level security gives the
 * same visibility as the AMC & subscriptions page itself.
 */

export type RenewalState = "Expired" | "Due in 30 days" | "Due in 90 days" | "Active" | "No expiry";

export interface ContractReportRow {
  id: string;
  software_name: string;
  contract_type: string;
  vendor: string;
  department: string;
  cost_center: string;
  owner: string;
  status: string;
  approval_status: string;
  implementation_status: string;
  renewal_period: string;
  po_number: string;
  purchase_date: string | null;
  expiry_date: string | null;
  days_to_expiry: number | null;
  renewal_state: RenewalState;
  currency: string;
  cost: number;
  monthly_cost: number;
  remaining_value: number;
  total_licenses: number;
  used_licenses: number;
  utilisation_pct: number | null;
  risk_level: string;
  support_tier: string;
  created_at: string | null;
}

export interface InvoiceReportRow {
  id: string;
  amc_id: string;
  software_name: string;
  contract_type: string;
  vendor: string;
  invoice_number: string;
  description: string;
  payment_type: string;
  due_date: string | null;
  amount: number;
  currency: string;
  status: "Paid" | "Overdue" | "Pending" | "Cancelled";
  payment_date: string | null;
}

export interface RenewalReportRow {
  id: string;
  amc_id: string;
  software_name: string;
  contract_type: string;
  vendor: string;
  renewal_date: string | null;
  previous_expiry: string | null;
  new_expiry: string | null;
  renewal_cost: number;
  currency: string;
  po_number: string;
  notes: string;
}

export interface TransactionReportRow {
  id: string;
  amc_id: string;
  software_name: string;
  contract_type: string;
  vendor: string;
  transaction_type: string;
  line_item: string;
  transaction_date: string | null;
  cost: number;
  currency: string;
  licenses_added: number;
  po_number: string;
  notes: string;
}

export interface AllocationReportRow {
  id: string;
  amc_id: string;
  software_name: string;
  contract_type: string;
  user_name: string;
  allocated_by: string;
  allocated_at: string | null;
  status: string;
  revoked_at: string | null;
  notes: string;
}

export interface AMCReportData {
  contracts: ContractReportRow[];
  invoices: InvoiceReportRow[];
  renewals: RenewalReportRow[];
  transactions: TransactionReportRow[];
  allocations: AllocationReportRow[];
  error?: string;
}

const EMPTY: AMCReportData = { contracts: [], invoices: [], renewals: [], transactions: [], allocations: [] };
const DAY_MS = 86_400_000;

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Today's date (YYYY-MM-DD) in India time. */
function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Whole days from `fromDay` to `toDay` (both YYYY-MM-DD). */
function daysBetween(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / DAY_MS);
}

function dayOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** Monthly cost: the stored amortised figure, else cost spread over the contract term (else 12 months). */
function monthlyCost(cost: number, stored: unknown, start: string | null, end: string | null): number {
  const s = num(stored);
  if (s > 0) return s;
  if (cost <= 0) return 0;
  if (start && end) {
    const [sy, sm] = start.split("-").map(Number);
    const [ey, em] = end.split("-").map(Number);
    const months = Math.max(1, (ey - sy) * 12 + (em - sm));
    return cost / months;
  }
  return cost / 12;
}

/** Unused (not yet consumed) contract value, pro-rated by days left in the term. */
function remainingValue(cost: number, start: string | null, end: string | null, today: string): number {
  if (!end || cost <= 0 || end <= today) return 0;
  const total = start ? Math.max(1, daysBetween(start, end)) : 365;
  const left = Math.max(0, daysBetween(today, end));
  return Math.min(cost, cost * (left / total));
}

function renewalState(daysToExpiry: number | null): RenewalState {
  if (daysToExpiry === null) return "No expiry";
  if (daysToExpiry < 0) return "Expired";
  if (daysToExpiry <= 30) return "Due in 30 days";
  if (daysToExpiry <= 90) return "Due in 90 days";
  return "Active";
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 20; // up to 20,000 rows per table

/** Reads every row of a table the user can see, 1,000 at a time (Supabase caps a single read). */
async function fetchAllRows(supabase: any, table: string, select: string, orderBy: string, ascending: boolean): Promise<any[]> {
  const out: any[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(orderBy, { ascending, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(`[generateAMCReportData] ${table}:`, error.message);
      break;
    }
    out.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return out;
}

export async function generateAMCReportData(): Promise<AMCReportData> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...EMPTY, error: "Please sign in again." };

  const canView =
    (await checkServerPermission("SUPER_ADMIN")) ||
    (await checkServerPermission("AMC_VIEW")) ||
    (await checkServerPermission("AMC_MANAGE"));
  if (!canView) return { ...EMPTY, error: "You do not have permission to view AMC reports." };

  try {
    const { data: amcs, error: amcErr } = await supabase
      .from("software_amc")
      .select(`
        id, software_name, contract_type, status, approval_status, implementation_status,
        renewal_period_type, po_number, purchase_date, expiry_date, cost, currency,
        monthly_amortized_cost, total_licenses, used_licenses, risk_level, support_tier, created_at,
        user_master:assigned_to (full_name),
        departments:department_id (name),
        cost_center:cost_center_id (name),
        vendor_master:vendor_id (name)
      `)
      .eq("is_deleted", false)
      .order("software_name", { ascending: true });
    if (amcErr) throw amcErr;

    const today = todayIST();
    const contractById = new Map<string, { name: string; type: string; vendor: string; currency: string }>();

    const contracts: ContractReportRow[] = (amcs || []).map((a: any) => {
      const cost = num(a.cost);
      const start = dayOf(a.purchase_date);
      const end = dayOf(a.expiry_date);
      const daysToExpiry = end ? daysBetween(today, end) : null;
      const total = Math.max(0, Math.trunc(num(a.total_licenses)));
      const used = Math.max(0, Math.trunc(num(a.used_licenses)));
      const vendor = a.vendor_master?.name || "Direct";
      const currency = a.currency || "INR";
      contractById.set(a.id, { name: a.software_name || "", type: a.contract_type || "", vendor, currency });
      return {
        id: a.id,
        software_name: a.software_name || "",
        contract_type: a.contract_type || "",
        vendor,
        department: a.departments?.name || "",
        cost_center: a.cost_center?.name || "",
        owner: a.user_master?.full_name || "Unassigned",
        status: a.status || "",
        approval_status: a.approval_status || "",
        implementation_status: a.implementation_status || "",
        renewal_period: a.renewal_period_type || "",
        po_number: a.po_number || "",
        purchase_date: start,
        expiry_date: end,
        days_to_expiry: daysToExpiry,
        renewal_state: renewalState(daysToExpiry),
        currency,
        cost: round2(cost),
        monthly_cost: round2(monthlyCost(cost, a.monthly_amortized_cost, start, end)),
        remaining_value: round2(remainingValue(cost, start, end, today)),
        total_licenses: total,
        used_licenses: used,
        utilisation_pct: total > 0 ? Math.round((used / total) * 100) : null,
        risk_level: a.risk_level || "",
        support_tier: a.support_tier || "",
        created_at: a.created_at || null,
      };
    });

    if (contractById.size === 0) return { ...EMPTY };

    // Child records. Rows of deleted contracts (or contracts this user cannot see) are dropped below.
    const [invRows, renRows, txRows, allocRows] = await Promise.all([
      fetchAllRows(supabase, "amc_invoices",
        "id, amc_id, invoice_number, description, payment_type, due_date, amount, status, payment_date",
        "due_date", true),
      fetchAllRows(supabase, "amc_renewals",
        "id, amc_id, renewal_date, previous_expiry, new_expiry, renewal_cost, po_number, notes",
        "renewal_date", false),
      fetchAllRows(supabase, "amc_transactions",
        "id, amc_id, transaction_type, line_item_name, transaction_date, cost, licenses_added, po_number, notes, is_deleted",
        "transaction_date", false),
      fetchAllRows(supabase, "amc_license_allocations",
        "id, amc_id, user_id, allocated_by, allocated_at, status, revoked_at, notes",
        "allocated_at", false),
    ]);
    const known = (r: any) => contractById.has(r.amc_id);

    const base = (amcId: string) => {
      const c = contractById.get(amcId);
      return { software_name: c?.name || "", contract_type: c?.type || "", vendor: c?.vendor || "", currency: c?.currency || "INR" };
    };

    const invoices: InvoiceReportRow[] = invRows.filter(known).map((i: any) => {
      const b = base(i.amc_id);
      const due = dayOf(i.due_date);
      const status: InvoiceReportRow["status"] =
        i.status === "Paid" ? "Paid" : i.status === "Cancelled" ? "Cancelled" : due && due < today ? "Overdue" : "Pending";
      return {
        id: i.id,
        amc_id: i.amc_id,
        software_name: b.software_name,
        contract_type: b.contract_type,
        vendor: b.vendor,
        invoice_number: i.invoice_number || "",
        description: i.description || "",
        payment_type: i.payment_type || "Scheduled",
        due_date: due,
        amount: round2(num(i.amount)),
        currency: b.currency,
        status,
        payment_date: dayOf(i.payment_date),
      };
    });

    const renewals: RenewalReportRow[] = renRows.filter(known).map((r: any) => {
      const b = base(r.amc_id);
      return {
        id: r.id,
        amc_id: r.amc_id,
        software_name: b.software_name,
        contract_type: b.contract_type,
        vendor: b.vendor,
        renewal_date: dayOf(r.renewal_date),
        previous_expiry: dayOf(r.previous_expiry),
        new_expiry: dayOf(r.new_expiry),
        renewal_cost: round2(num(r.renewal_cost)),
        currency: b.currency,
        po_number: r.po_number || "",
        notes: r.notes || "",
      };
    });

    const transactions: TransactionReportRow[] = txRows
      .filter(known)
      .filter((t: any) => t.is_deleted !== true)
      .map((t: any) => {
        const b = base(t.amc_id);
        return {
          id: t.id,
          amc_id: t.amc_id,
          software_name: b.software_name,
          contract_type: b.contract_type,
          vendor: b.vendor,
          transaction_type: t.transaction_type || "",
          line_item: t.line_item_name || "",
          transaction_date: dayOf(t.transaction_date),
          cost: round2(num(t.cost)),
          currency: b.currency,
          licenses_added: Math.trunc(num(t.licenses_added)),
          po_number: t.po_number || "",
          notes: t.notes || "",
        };
      });

    // Resolve allocation user names in one query.
    const allocData: any[] = allocRows.filter(known);
    const userIds = Array.from(new Set(allocData.flatMap((a) => [a.user_id, a.allocated_by]).filter(Boolean)));
    const userNames = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: users } = await supabase.from("user_master").select("id, full_name").in("id", userIds);
      (users || []).forEach((u: any) => userNames.set(u.id, u.full_name || ""));
    }

    const allocations: AllocationReportRow[] = allocData.map((a: any) => {
      const b = base(a.amc_id);
      return {
        id: a.id,
        amc_id: a.amc_id,
        software_name: b.software_name,
        contract_type: b.contract_type,
        user_name: userNames.get(a.user_id) || "",
        allocated_by: userNames.get(a.allocated_by) || "",
        allocated_at: a.allocated_at || null,
        status: a.status || "Active",
        revoked_at: a.revoked_at || null,
        notes: a.notes || "",
      };
    });

    return { contracts, invoices, renewals, transactions, allocations };
  } catch (err: any) {
    console.error("[generateAMCReportData]", err);
    return { ...EMPTY, error: err?.message || "Could not load the AMC report." };
  }
}
