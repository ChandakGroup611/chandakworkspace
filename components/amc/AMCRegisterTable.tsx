"use client";

/**
 * One register for AMC contracts and subscriptions (redesign stage 2).
 * Type chips, status tabs, search and department / vendor filters; each row shows the end date
 * with days left, seats and the next pending payment. Row actions: Renew, History, Edit, Delete.
 */
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, RotateCcw, History, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { amcRecordHref } from "./useAMCData";

type TypeFilter = "all" | "amc" | "sub";
type Tab = "active" | "soon" | "due" | "expired" | "draft" | "all";

const DAY = 86400000;
const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const daysTo = (d?: string | null) => (d ? Math.round((new Date(String(d).slice(0, 10)).getTime() - new Date(todayStr()).getTime()) / DAY) : null);
const money = (n: number, cur?: string) => {
  const v = Math.round(Number(n) || 0);
  const sym = cur === "USD" ? "$ " : cur === "EUR" ? "€ " : "₹ ";
  if (!cur || cur === "INR") {
    if (v >= 1e7) return `${sym}${(v / 1e7).toFixed(2)} Cr`;
    if (v >= 1e5) return `${sym}${(v / 1e5).toFixed(1)} L`;
  }
  return `${sym}${v.toLocaleString("en-IN")}`;
};
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const statusOf = (r: any) => String(r.status || "").toLowerCase();

const TABS: { id: Tab; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "soon", label: "Renewing in 60 days" },
  { id: "due", label: "Payment due in 30 days" },
  { id: "expired", label: "Expired" },
  { id: "draft", label: "Draft" },
  { id: "all", label: "All" },
];

export function AMCRegisterTable({
  records,
  vendors,
  departments,
  users,
  loading,
  initialType,
  onRenew,
  onHistory,
  onDelete,
  canEdit,
  canDelete,
}: {
  records: any[];
  vendors: any[];
  departments: any[];
  users: any[];
  loading: boolean;
  initialType: TypeFilter;
  onRenew: (rec: any) => void;
  onHistory: (id: string) => void;
  onDelete: (rec: any) => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [type, setType] = useState<TypeFilter>(initialType);
  const [tab, setTab] = useState<Tab>("active");
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [vendor, setVendor] = useState("all");
  const [nextPay, setNextPay] = useState<Map<string, { amount: number; due: string }>>(new Map());

  // Next pending payment per record
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("amc_invoices")
      .select("amc_id, amount, due_date")
      .eq("status", "Pending")
      .order("due_date", { ascending: true })
      .limit(3000)
      .then(({ data }) => {
        const m = new Map<string, { amount: number; due: string }>();
        for (const i of data || []) if (!m.has(i.amc_id)) m.set(i.amc_id, { amount: Number(i.amount) || 0, due: i.due_date });
        setNextPay(m);
      });
  }, [records.length]);

  const vendorName = useMemo(() => new Map<string, string>(vendors.map((v: any) => [v.id, v.vendor_name || v.name])), [vendors]);
  const deptName = useMemo(() => new Map<string, string>(departments.map((d: any) => [d.id, d.name])), [departments]);
  const userName = useMemo(() => new Map<string, string>(users.map((u: any) => [u.id, u.full_name])), [users]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return records
      .filter((r) => !r.is_deleted)
      .filter((r) => (type === "all" ? true : type === "sub" ? r.contract_type === "Subscription" : r.contract_type !== "Subscription"))
      .map((r) => {
        const days = daysTo(r.expiry_date);
        const pay = nextPay.get(r.id) || null;
        return { r, days, pay, payDays: pay ? daysTo(pay.due) : null };
      })
      .filter(({ r, days, pay }) => {
        const st = statusOf(r);
        if (tab === "active" && st !== "active") return false;
        if (tab === "soon" && !(st === "active" && days !== null && days >= 0 && days <= 60)) return false;
        if (tab === "due" && !(pay && daysTo(pay.due) !== null && (daysTo(pay.due) as number) <= 30)) return false;
        if (tab === "expired" && !(st === "expired" || (days !== null && days < 0))) return false;
        if (tab === "draft" && !(st === "draft" || st.includes("review") || st.includes("trial"))) return false;
        if (dept !== "all" && r.department_id !== dept) return false;
        if (vendor !== "all" && r.vendor_id !== vendor) return false;
        if (term) {
          const hay = [r.software_name, vendorName.get(r.vendor_id), r.provider_name, r.po_number, r.solution_name, deptName.get(r.department_id)].join(" ").toLowerCase();
          if (!hay.includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999));
  }, [records, type, tab, q, dept, vendor, nextPay, vendorName, deptName]);

  const tabCount = (t: Tab) => {
    // cheap count with the same type filter only
    return records.filter((r) => {
      if (r.is_deleted) return false;
      if (type === "sub" ? r.contract_type !== "Subscription" : type === "amc" ? r.contract_type === "Subscription" : false) return false;
      const st = statusOf(r);
      const d = daysTo(r.expiry_date);
      if (t === "active") return st === "active";
      if (t === "soon") return st === "active" && d !== null && d >= 0 && d <= 60;
      if (t === "due") { const p = nextPay.get(r.id); const d = p ? daysTo(p.due) : null; return d !== null && d <= 30; }
      if (t === "expired") return st === "expired" || (d !== null && d < 0);
      if (t === "draft") return st === "draft" || st.includes("review") || st.includes("trial");
      return true;
    }).length;
  };

  const chip = (on: boolean) =>
    `inline-flex h-9 items-center rounded-full border px-4 text-[13.5px] font-semibold ${
      on ? "border-primary bg-accent-soft text-accent-soft-text" : "border-border bg-surface text-subtle hover:bg-surface-hover"
    }`;
  const select = "h-10 rounded-lg border border-border bg-surface px-3 text-[14px] text-foreground focus:border-primary focus:outline-none";

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Status" className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[14px] font-semibold ${
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            <span className="rounded-full bg-sunken px-1.5 text-[11.5px] tabular-nums text-subtle">{tabCount(t.id)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, vendor or PO number"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </label>
        <div className="flex gap-1.5" role="group" aria-label="Type">
          <button type="button" aria-pressed={type === "all"} onClick={() => setType("all")} className={chip(type === "all")}>All types</button>
          <button type="button" aria-pressed={type === "amc"} onClick={() => setType("amc")} className={chip(type === "amc")}>AMC</button>
          <button type="button" aria-pressed={type === "sub"} onClick={() => setType("sub")} className={chip(type === "sub")}>Subscriptions</button>
        </div>
        <label className="flex items-center gap-1.5 text-[13px] text-subtle">
          Department
          <select value={dept} onChange={(e) => setDept(e.target.value)} className={select}>
            <option value="all">All</option>
            {departments.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[13px] text-subtle">
          Vendor
          <select value={vendor} onChange={(e) => setVendor(e.target.value)} className={select}>
            <option value="all">All</option>
            {vendors.map((v: any) => (
              <option key={v.id} value={v.id}>{v.vendor_name || v.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-[12.5px] font-semibold text-muted">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5 text-right">Value</th>
              <th className="px-3 py-2.5">Ends</th>
              <th className="px-3 py-2.5">Next payment</th>
              <th className="px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[14px] text-muted">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[14px] text-muted">Nothing matches.</td></tr>
            ) : (
              rows.map(({ r, days, pay, payDays }) => {
                const isSub = r.contract_type === "Subscription";
                const st = statusOf(r);
                const total = Number(r.total_licenses) || 0;
                return (
                  <tr key={r.id} data-record-id={r.id} className="group border-b border-border align-top last:border-0 hover:bg-surface-hover focus-within:bg-surface-hover">
                    <td className="px-4 py-3">
                      <Link href={amcRecordHref(r)} className="text-[14px] font-semibold text-foreground hover:text-primary">{r.software_name || "Untitled"}</Link>
                      <div className="mt-0.5 text-[12.5px] text-muted">
                        {[vendorName.get(r.vendor_id) || r.provider_name, deptName.get(r.department_id), userName.get(r.assigned_to)].filter(Boolean).join(" · ")}
                      </div>
                      <div className="mt-1.5 flex gap-3 text-[12.5px] font-semibold opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                        {canEdit && (
                          <button type="button" onClick={() => onRenew(r)} className="inline-flex items-center gap-1 text-primary hover:underline">
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Renew
                          </button>
                        )}
                        {canEdit && (
                          <Link href={amcRecordHref(r, "/edit")} className="inline-flex items-center gap-1 text-primary hover:underline">
                            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                          </Link>
                        )}
                        <button type="button" onClick={() => onHistory(r.id)} className="inline-flex items-center gap-1 text-primary hover:underline">
                          <History className="h-3.5 w-3.5" aria-hidden /> History
                        </button>
                        {canDelete && (
                          <button type="button" onClick={() => onDelete(r)} className="inline-flex items-center gap-1 text-danger-text hover:underline">
                            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold ${isSub ? "bg-success-soft text-success-text" : "bg-accent-soft text-accent-soft-text"}`}>
                        {isSub ? "Subscription" : r.contract_type === "AMC" ? "AMC" : r.contract_type || "AMC"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-[14px] font-semibold tabular-nums">{money(r.cost, r.currency)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-[13.5px]">
                      {fmt(r.expiry_date)}
                      {(days !== null || total > 0) && (
                        <div className="mt-0.5 text-[12.5px]">
                          {days !== null && (
                            <span className={`font-semibold ${days < 0 ? "text-danger-text" : days <= 30 ? "text-warning-text" : "text-muted"}`}>
                              {days < 0 ? `${-days} days ago` : days === 0 ? "today" : `in ${days} days`}
                            </span>
                          )}
                          {total > 0 && <span className="text-muted">{days !== null ? " · " : ""}{Math.min(Number(r.used_licenses) || 0, total)} of {total} seats</span>}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[13.5px]">
                      {pay ? (
                        <>
                          {money(pay.amount, r.currency)}
                          <div className={`mt-0.5 text-[12.5px] font-semibold ${payDays !== null && payDays < 0 ? "text-danger-text" : payDays !== null && payDays <= 7 ? "text-warning-text" : "text-muted"}`}>
                            {payDays !== null && payDays < 0 ? `${-payDays} days late` : `due ${fmt(pay.due)}`}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted">Nothing due</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold ${
                          st === "active" ? "bg-success-soft text-success-text" : st === "expired" || st.includes("terminat") ? "bg-danger-soft text-danger-text" : "bg-sunken text-subtle"
                        }`}
                      >
                        {r.status || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-muted">{rows.length} shown · sorted by end date, soonest first</p>
    </div>
  );
}
