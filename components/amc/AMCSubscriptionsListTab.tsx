"use client";

import React, { useState, useMemo } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { 
  AppTable, 
  AppTableHeader, 
  AppTableBody, 
  AppTableRow, 
  AppTableHead, 
  AppTableCell,
  AppTableContainer 
} from "@/components/ui/AppTable";
import { 
  Search, 
  Plus, 
  RefreshCw, 
  Calendar, 
  Clock, 
  Edit, 
  Eye,
  Trash2, 
  Zap, 
  AlertTriangle,
  RotateCcw,
  History,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { formatDate } from "@/components/ui/data";

interface AMCSubscriptionsListTabProps {
  records: any[];
  vendors: any[];
  departments: any[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCreate: () => void;
  onOpenView?: (record: any) => void;
  onOpenEdit: (record: any) => void;
  onOpenRenew: (record: any) => void;
  onOpenHistory: (recordId: string) => void;
  onDelete: (record: any) => void;
  hasPermission: (perm: string) => boolean;
}

export function AMCSubscriptionsListTab({
  records,
  vendors,
  departments,
  loading,
  onRefresh,
  onOpenCreate,
  onOpenView,
  onOpenEdit,
  onOpenRenew,
  onOpenHistory,
  onDelete,
  hasPermission
}: AMCSubscriptionsListTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [autoRenewFilter, setAutoRenewFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState<"all" | "active" | "expiring30" | "expiring60" | "expired">("all");

  const vendorMap = useMemo(() => {
    return Object.fromEntries(vendors.map(v => [v.id, v.vendor_name || v.name]));
  }, [vendors]);

  const deptMap = useMemo(() => {
    return Object.fromEntries(departments.map(d => [d.id, d.name || d.department_name]));
  }, [departments]);

  // Filter only Subscription records
  const subscriptionRecords = useMemo(() => {
    return records.filter(r => r.contract_type === "Subscription");
  }, [records]);

  // Apply filters
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const in30 = new Date();
    in30.setDate(now.getDate() + 30);
    const in60 = new Date();
    in60.setDate(now.getDate() + 60);

    return subscriptionRecords.filter(rec => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sw = (rec.software_name || "").toLowerCase();
        const vendor = (vendorMap[rec.vendor_id] || "").toLowerCase();
        const dept = (deptMap[rec.department_id] || "").toLowerCase();
        if (!sw.includes(q) && !vendor.includes(q) && !dept.includes(q)) {
          return false;
        }
      }

      // Billing Frequency
      if (frequencyFilter !== "all" && rec.billing_frequency !== frequencyFilter) {
        return false;
      }

      // Department
      if (deptFilter !== "all" && rec.department_id !== deptFilter) {
        return false;
      }

      // Auto Renew
      if (autoRenewFilter === "auto" && !rec.auto_renewal) return false;
      if (autoRenewFilter === "manual" && rec.auto_renewal) return false;

      // Expiry filter
      if (expiryFilter !== "all" && rec.expiry_date) {
        const exp = new Date(rec.expiry_date);
        if (expiryFilter === "expired" && exp >= now) return false;
        if (expiryFilter === "active" && exp < now) return false;
        if (expiryFilter === "expiring30" && (exp < now || exp > in30)) return false;
        if (expiryFilter === "expiring60" && (exp < now || exp > in60)) return false;
      }

      return true;
    });
  }, [subscriptionRecords, searchQuery, frequencyFilter, deptFilter, autoRenewFilter, expiryFilter, vendorMap, deptMap]);

  const getExpiryBadge = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return null;
    const now = new Date();
    const exp = new Date(expiryDateStr);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger-text bg-danger-soft px-2 py-0.5 rounded border border-danger-border">
          <AlertTriangle className="h-3 w-3" /> Overdue
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning-text bg-warning-soft px-2 py-0.5 rounded border border-warning-border">
          <Clock className="h-3 w-3" /> Due in {diffDays}d
        </span>
      );
    }
    if (diffDays <= 60) {
      return (
        <span className="text-[11px] font-medium text-muted bg-sunken px-2 py-0.5 rounded">
          Due in {diffDays}d
        </span>
      );
    }
    return (
      <span className="text-[11px] font-medium text-muted">
        {diffDays}d left
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Action & Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted pointer-events-none" />
            <AppInput
              placeholder="Search software subscriptions, vendors…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-full text-xs"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <AppButton
              variant="outline"
              size="sm"
              onClick={onRefresh}
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />}
              className="text-xs h-9"
            >
              Refresh
            </AppButton>
            {hasPermission("AMC_CREATE") && (
              <AppButton
                variant="primary"
                size="sm"
                onClick={onOpenCreate}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                className="text-xs h-9 font-semibold"
              >
                New Subscription
              </AppButton>
            )}
          </div>
        </div>

        {/* Filter Dropdowns & Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-xs">
          {/* Expiry Scope */}
          <div className="inline-flex rounded-lg border border-border bg-sunken p-0.5">
            {[
              { key: "all", label: "All Subscriptions" },
              { key: "active", label: "Active" },
              { key: "expiring30", label: "Renewal in 30d" },
              { key: "expiring60", label: "Renewal in 60d" },
              { key: "expired", label: "Overdue" }
            ].map(p => (
              <AppButton
                key={p.key}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpiryFilter(p.key as any)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                  expiryFilter === p.key
                    ? "bg-surface text-foreground font-semibold shadow-xs hover:bg-surface hover:text-foreground"
                    : "text-muted hover:text-foreground hover:bg-transparent"
                }`}
              >
                {p.label}
              </AppButton>
            ))}
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-foreground outline-none"
            aria-label="Filter by department"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name || d.department_name}</option>
            ))}
          </select>

          {/* Billing Cycle */}
          <select
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-foreground outline-none"
            aria-label="Filter by billing cycle"
          >
            <option value="all">All Cycles</option>
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Half-Yearly">Half-Yearly</option>
            <option value="Yearly">Annual / Yearly</option>
          </select>

          {/* Auto Renewal */}
          <select
            value={autoRenewFilter}
            onChange={(e) => setAutoRenewFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-foreground outline-none"
            aria-label="Filter by auto renewal"
          >
            <option value="all">Auto Renewal: All</option>
            <option value="auto">Auto-Renewing</option>
            <option value="manual">Manual Renewal</option>
          </select>

          {/* Active count badge */}
          <span className="ml-auto text-muted font-mono text-[11.5px]">
            Showing {filteredRecords.length} of {subscriptionRecords.length} Subscriptions
          </span>
        </div>
      </div>

      {/* Subscriptions Table */}
      <AppCard className="overflow-hidden p-0 border-border shadow-xs">
        <AppTableContainer>
          <AppTable>
            <AppTableHeader>
              <AppTableRow className="bg-sunken/50">
                <AppTableHead className="w-64 font-semibold text-xs">Tool / Software Service</AppTableHead>
                <AppTableHead className="w-44 font-semibold text-xs">Vendor</AppTableHead>
                <AppTableHead className="w-36 font-semibold text-xs">Department</AppTableHead>
                <AppTableHead className="w-32 font-semibold text-xs">Seats / Users</AppTableHead>
                <AppTableHead className="w-36 font-semibold text-xs">Cost (Annual / Mo)</AppTableHead>
                <AppTableHead className="w-36 font-semibold text-xs">Next Renewal</AppTableHead>
                <AppTableHead className="w-28 font-semibold text-xs">Auto-Renew</AppTableHead>
                <AppTableHead className="w-44 text-right font-semibold text-xs">Actions</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {loading ? (
                <AppTableRow>
                  <AppTableCell colSpan={8} className="h-40 text-center text-xs text-muted">
                    Loading software subscriptions…
                  </AppTableCell>
                </AppTableRow>
              ) : filteredRecords.length === 0 ? (
                <AppTableRow>
                  <AppTableCell colSpan={8} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Zap className="h-8 w-8 text-muted opacity-40" />
                      <p className="text-sm font-semibold text-foreground">No software subscriptions found</p>
                      <p className="text-xs text-muted max-w-sm">
                        {searchQuery || frequencyFilter !== "all" || deptFilter !== "all"
                          ? "No subscriptions match your applied filters. Try resetting filters."
                          : "Start tracking SaaS tools, seats, and recurring billing by adding a subscription."}
                      </p>
                      {hasPermission("AMC_CREATE") && (
                        <AppButton variant="primary" size="sm" onClick={onOpenCreate} className="mt-2 text-xs">
                          New Subscription
                        </AppButton>
                      )}
                    </div>
                  </AppTableCell>
                </AppTableRow>
              ) : (
                filteredRecords.map((rec) => {
                  const vendorName = vendorMap[rec.vendor_id] || "Direct Vendor";
                  const deptName = deptMap[rec.department_id] || "General";
                  const cost = Number(rec.total_cost || rec.cost || 0);
                  const totalSeats = rec.total_licenses || 0;
                  const usedSeats = rec.used_licenses || 0;
                  const seatPct = totalSeats > 0 ? Math.min(100, Math.round((usedSeats / totalSeats) * 100)) : 0;

                  const handleRowClick = () => {
                    if (onOpenView) {
                      onOpenView(rec);
                    } else {
                      onOpenEdit(rec);
                    }
                  };

                  return (
                    <AppTableRow 
                      key={rec.id} 
                      className="hover:bg-surface-hover/80 transition-colors group cursor-pointer"
                      onClick={handleRowClick}
                    >
                      {/* Software Name */}
                      <AppTableCell>
                        <div className="flex flex-col">
                          <AppButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick();
                            }}
                            className="h-auto p-0 justify-start text-left font-semibold text-sm text-foreground group-hover:text-primary transition-colors hover:underline hover:bg-transparent"
                          >
                            {rec.software_name}
                          </AppButton>
                          <span className="text-[11px] text-muted">
                            {rec.billing_frequency || "Subscription Plan"}
                          </span>
                        </div>
                      </AppTableCell>

                      {/* Vendor */}
                      <AppTableCell>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted shrink-0" />
                          <span className="text-xs text-foreground font-medium truncate max-w-[160px]">
                            {vendorName}
                          </span>
                        </div>
                      </AppTableCell>

                      {/* Department */}
                      <AppTableCell>
                        <span className="text-xs text-muted font-medium">
                          {deptName}
                        </span>
                      </AppTableCell>

                      {/* Seats & Utilization */}
                      <AppTableCell>
                        {totalSeats > 0 ? (
                          <div className="flex flex-col space-y-1">
                            <span className="text-xs font-mono font-medium text-foreground">
                              {usedSeats} / {totalSeats} seats
                            </span>
                            <div className="h-1.5 w-24 rounded-full bg-sunken overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  seatPct >= 90 ? "bg-warning" : "bg-primary"
                                }`} 
                                style={{ width: `${seatPct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted">Unlimited / Team</span>
                        )}
                      </AppTableCell>

                      {/* Cost */}
                      <AppTableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-foreground tabular-nums">
                            {rec.currency || "INR"} {cost.toLocaleString()}
                          </span>
                          {rec.monthly_amortized_cost && (
                            <span className="text-[10.5px] text-muted font-mono">
                              ~{rec.currency || "INR"} {Number(rec.monthly_amortized_cost).toLocaleString()}/mo
                            </span>
                          )}
                        </div>
                      </AppTableCell>

                      {/* Next Renewal Date */}
                      <AppTableCell>
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs font-mono text-foreground">
                            {rec.expiry_date ? formatDate(rec.expiry_date) : "Auto-renews"}
                          </span>
                          {getExpiryBadge(rec.expiry_date)}
                        </div>
                      </AppTableCell>

                      {/* Auto-Renewal Badge */}
                      <AppTableCell>
                        {rec.auto_renewal ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10.5px] font-semibold text-success-text border border-success-border">
                            <CheckCircle2 className="h-3 w-3" /> Auto
                          </span>
                        ) : (
                          <span className="rounded-full bg-sunken px-2 py-0.5 text-[10.5px] font-medium text-muted">
                            Manual
                          </span>
                        )}
                      </AppTableCell>

                      {/* Row Actions */}
                      <AppTableCell 
                        className="text-right" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <AppButton
                            variant="outline"
                            size="sm"
                            title="View Subscription Dossier"
                            aria-label={`View ${rec.software_name}`}
                            onClick={handleRowClick}
                            className="h-7 px-2 text-[11.5px] font-medium"
                            leftIcon={<Eye className="h-3.5 w-3.5 text-theme-icon" />}
                          >
                            View
                          </AppButton>
                          <AppButton
                            variant="ghost"
                            size="icon-sm"
                            title="Edit Subscription"
                            aria-label={`Edit ${rec.software_name}`}
                            onClick={() => onOpenEdit(rec)}
                            className="text-muted hover:text-foreground"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </AppButton>
                          <AppButton
                            variant="ghost"
                            size="icon-sm"
                            title="Renew Subscription"
                            aria-label={`Renew ${rec.software_name}`}
                            onClick={() => onOpenRenew(rec)}
                            className="text-muted hover:text-foreground"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </AppButton>
                          <AppButton
                            variant="ghost"
                            size="icon-sm"
                            title="Audit Trail & History"
                            aria-label={`Audit history for ${rec.software_name}`}
                            onClick={() => onOpenHistory(rec.id)}
                            className="text-muted hover:text-foreground"
                          >
                            <History className="h-3.5 w-3.5" />
                          </AppButton>
                          {hasPermission("AMC_DELETE") && (
                            <AppButton
                              variant="ghost"
                              size="icon-sm"
                              title="Cancel / Delete Subscription"
                              aria-label={`Delete ${rec.software_name}`}
                              onClick={() => onDelete(rec)}
                              className="text-muted hover:text-danger-text hover:bg-danger-soft"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </AppButton>
                          )}
                        </div>
                      </AppTableCell>
                    </AppTableRow>
                  );
                })
              )}
            </AppTableBody>
          </AppTable>
        </AppTableContainer>
      </AppCard>
    </div>
  );
}
