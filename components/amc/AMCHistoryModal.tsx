"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  X, 
  Clock, 
  User, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  PlusCircle, 
  Edit 
} from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { formatDateTime } from "@/components/ui/data";

interface AMCHistoryModalProps {
  amcId: string;
  onClose: () => void;
  isLightMode?: boolean;
}

const IGNORED_KEYS = new Set([
  'id', 'created_at', 'updated_at', 'is_deleted', 'metadata', 'search_vector', 'fts'
]);

const AMC_FIELD_LABELS: Record<string, string> = {
  software_name: "Software / Subscription Name",
  contract_type: "Contract Type",
  contract_status: "Status",
  vendor_id: "Vendor",
  vendor_name: "Vendor Name",
  department_id: "Department",
  department_name: "Department Name",
  cost: "Cost",
  total_cost: "Total Cost",
  currency: "Currency",
  billing_frequency: "Billing Frequency",
  start_date: "Start Date",
  expiry_date: "Expiry Date",
  auto_renewal: "Auto Renewal",
  total_licenses: "Total Licenses",
  used_licenses: "Used Licenses",
  license_type: "License Type",
  support_level: "Support Level",
  is_active: "Active Status",
  payment_terms: "Payment Terms",
  notes: "Notes / Remarks",
  implementation_status: "Implementation Status",
  sla_terms: "SLA Terms",
  escalation_contact: "Escalation Contact",
  procurement_po_number: "PO Number",
  invoice_number: "Invoice Number",
  business_criticality: "Business Criticality",
  category: "Category",
  owner_id: "Owner",
  line_item_calculation: "Line-Item Calculation"
};

export function AMCHistoryModal({
  amcId,
  onClose
}: AMCHistoryModalProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchHistory() {
      if (!amcId) return;
      setLoading(true);

      try {
        const { data: logData, error } = await supabase
          .from("software_amc_audit_logs")
          .select("*")
          .eq("amc_id", amcId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const rawLogs = logData || [];
        if (rawLogs.length === 0) {
          setLogs([]);
          return;
        }

        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const rawActorIds = Array.from(new Set(rawLogs.map(l => l.actor_id).filter(Boolean)));
        const validActorUuids = rawActorIds.filter((id) => typeof id === "string" && UUID_REGEX.test(id));
        let userMap: Record<string, string> = {};

        if (validActorUuids.length > 0) {
          const { data: userData } = await supabase
            .from("user_master")
            .select("id, full_name")
            .in("id", validActorUuids);

          if (userData) {
            userMap = Object.fromEntries(userData.map((u: any) => [u.id, u.full_name]));
          }
        }

        const enrichedLogs = rawLogs.map(log => ({
          ...log,
          actor_name: log.actor_id ? (userMap[log.actor_id] || "Team Member") : "System Process"
        }));

        setLogs(enrichedLogs);
      } catch (err) {
        console.error("Failed to fetch AMC history:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [amcId, supabase]);

  const extractDiffs = (before: any, after: any) => {
    if (!before || !after) return [];
    const diffs: Array<{ field: string; old_value: any; new_value: any }> = [];
    const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

    for (const key of allKeys) {
      if (IGNORED_KEYS.has(key)) continue;
      const bVal = before[key];
      const aVal = after[key];

      if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
        diffs.push({
          field: AMC_FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          old_value: bVal === null || bVal === undefined ? "None" : String(bVal),
          new_value: aVal === null || aVal === undefined ? "None" : String(aVal)
        });
      }
    }
    return diffs;
  };

  const getOperationBadge = (op: string) => {
    switch (op) {
      case "INSERT":
        return {
          icon: PlusCircle,
          color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
          label: "CREATED"
        };
      case "UPDATE":
        return {
          icon: Edit,
          color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
          label: "UPDATED"
        };
      case "DELETE":
        return {
          icon: AlertCircle,
          color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
          label: "DELETED"
        };
      default:
        return {
          icon: Clock,
          color: "text-muted bg-sunken border-border",
          label: op
        };
    }
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-[var(--overlay)] animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-lg overflow-hidden border border-border bg-surface shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0 border-border bg-elevated">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-surface shadow-xs border border-border/50">
              <Clock className="h-5 w-5 text-theme-icon" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Audit trail & lifecycle history</h2>
              <p className="text-xs text-muted">Immutable changelog for this contract</p>
            </div>
          </div>
          <AppButton 
            variant="ghost" 
            size="icon-sm"
            aria-label="Close audit history"
            onClick={onClose} 
            className="text-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </AppButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted">
              <Loader2 className="h-7 w-7 animate-spin mb-3 text-theme-icon" />
              <p className="text-xs">Loading audit trail…</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted space-y-2">
              <Clock className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium text-foreground">No history available yet</p>
              <p className="text-xs text-muted">Any updates to this record will appear here.</p>
            </div>
          ) : (
            <div className="relative space-y-4 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-border">
              {logs.map((log) => {
                const badge = getOperationBadge(log.operation);
                const Icon = badge.icon;
                const diffs = log.operation === 'UPDATE' ? extractDiffs(log.before_values, log.after_values) : [];
                const after = log.after_values || {};

                return (
                  <div key={log.id} className="relative flex items-start gap-3 pl-1">
                    {/* Timeline Node Icon */}
                    <div className={`z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border shadow-xs ${badge.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>

                    <div className="flex-1 rounded-lg border border-border bg-surface p-3.5 shadow-xs transition-colors hover:border-border-active">
                      {/* Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-theme-icon">
                            {log.actor_name}
                          </span>
                          <span className="text-xs text-foreground/90 font-medium">
                            {log.operation === 'INSERT' ? 'created this record' :
                             log.operation === 'DELETE' ? 'deleted this record' :
                             'updated details'}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <span className="font-mono text-[11.5px] text-muted">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>

                      {/* Diff Viewer for Updates */}
                      {log.operation === 'UPDATE' && diffs.length > 0 && (
                        <div className="mt-2.5 space-y-1.5 font-mono">
                          {diffs.map((d, idx) => (
                            <div key={idx} className="flex flex-wrap items-center gap-2 rounded border border-border/50 bg-sunken/60 px-2.5 py-1 text-xs">
                              <span className="w-36 shrink-0 font-bold uppercase text-[11px] text-muted">{d.field}:</span>
                              <span className="max-w-[200px] truncate text-danger/80 line-through opacity-80" title={String(d.old_value)}>
                                {String(d.old_value || "None")}
                              </span>
                              <ArrowRight className="h-3 w-3 shrink-0 text-muted" />
                              <span className="max-w-[220px] truncate font-semibold text-success-text" title={String(d.new_value)}>
                                {String(d.new_value || "None")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {log.operation === 'UPDATE' && diffs.length === 0 && (
                        <p className="mt-2 text-xs text-muted italic">Record state synchronized.</p>
                      )}
                      
                      {/* INSERT snapshot */}
                      {log.operation === 'INSERT' && (
                        <div className="mt-2.5 rounded border border-border/50 bg-sunken/40 p-2.5 font-mono text-xs space-y-1">
                          <div className="flex gap-2">
                            <span className="w-36 font-bold uppercase text-[11px] text-muted">SOFTWARE:</span>
                            <span className="text-foreground font-semibold">{after.software_name || "-"}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="w-36 font-bold uppercase text-[11px] text-muted">TYPE:</span>
                            <span className="text-foreground">{after.contract_type || "AMC"}</span>
                          </div>
                          {after.total_cost !== undefined && (
                            <div className="flex gap-2">
                              <span className="w-36 font-bold uppercase text-[11px] text-muted">TOTAL COST:</span>
                              <span className="text-foreground font-semibold">{after.currency || "INR"} {Number(after.total_cost || 0).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {log.operation === 'DELETE' && (
                        <p className="mt-2 text-xs text-danger-text font-medium">This record was removed.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
