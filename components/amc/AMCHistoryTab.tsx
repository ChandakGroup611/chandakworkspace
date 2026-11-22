"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  Clock, 
  User, 
  PlusCircle, 
  Edit, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  Calendar,
  Layers
} from "lucide-react";
import { formatDateTime } from "@/components/ui/data";

interface AMCHistoryTabProps {
  amcId: string;
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

export function AMCHistoryTab({ amcId }: AMCHistoryTabProps) {
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

        // Resolve user IDs for actors
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
        console.error("Failed to load AMC history:", err);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted" aria-hidden />
        <span className="text-[13px] text-muted">Loading audit history…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <Clock className="h-4 w-4 text-theme-icon" />
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Audit trail & lifecycle history</h3>
            <p className="text-[11.5px] text-muted">Immutable changelog and operational history for this contract</p>
          </div>
        </div>
        <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-mono font-medium text-subtle">
          {logs.length} {logs.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-muted opacity-40" />
          <p className="text-sm font-medium text-foreground">No history recorded yet</p>
          <p className="mt-1 text-xs text-muted">Changes to contract terms, renewals, and lifecycle will appear here automatically.</p>
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
                {/* Timeline node icon */}
                <div className={`z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border shadow-xs ${badge.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>

                {/* Structured card */}
                <div className="flex-1 rounded-lg border border-border bg-surface p-3.5 shadow-xs transition-colors hover:border-border-active">
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-theme-icon">
                        {log.actor_name}
                      </span>
                      <span className="text-xs text-foreground/90 font-medium">
                        {log.operation === 'INSERT' ? 'created this contract record' :
                         log.operation === 'DELETE' ? 'deleted this contract record' :
                         'updated contract details'}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <span className="font-mono text-[11.5px] text-muted">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>

                  {/* UPDATE: Field-level diffs */}
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

                  {/* UPDATE with no detected diffs */}
                  {log.operation === 'UPDATE' && diffs.length === 0 && (
                    <p className="mt-2 text-xs text-muted italic">Contract record state synchronized.</p>
                  )}

                  {/* INSERT: Initial details snapshot */}
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
                      {after.expiry_date && (
                        <div className="flex gap-2">
                          <span className="w-36 font-bold uppercase text-[11px] text-muted">EXPIRY DATE:</span>
                          <span className="text-foreground">{after.expiry_date}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DELETE message */}
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
  );
}
