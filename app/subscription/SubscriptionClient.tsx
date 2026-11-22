"use client";

import React, { useState, useEffect } from "react";
import { 
  Check, 
  Star, 
  Zap, 
  Shield, 
  Crown, 
  Clock, 
  Calendar, 
  CreditCard, 
  Layers, 
  ArrowRight, 
  Loader2, 
  PlusCircle, 
  Edit, 
  AlertCircle,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { createClient } from "@/utils/supabase/client";
import { formatDateTime, formatDate } from "@/components/ui/data";

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  buttonText: string;
  highlighted: boolean;
  color: string;
}

const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "Perfect for individuals and small teams getting started.",
    icon: <Zap className="w-5 h-5 text-accent" />,
    features: [
      "Up to 5 Users",
      "Basic Task Management",
      "Standard Support",
      "5GB Storage",
    ],
    buttonText: "Current Plan",
    highlighted: false,
    color: "blue",
  },
  {
    name: "Professional",
    price: "$29",
    period: "per user/month",
    description: "Advanced tools for growing teams that need more power.",
    icon: <Star className="w-5 h-5 text-accent-soft-text" />,
    features: [
      "Unlimited Users",
      "Advanced Hierarchy & Workspaces",
      "Priority Support (24/7)",
      "100GB Storage",
      "Custom Workflows & Automations",
      "Timeline Audits",
    ],
    buttonText: "Upgrade to Pro",
    highlighted: true,
    color: "accent",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "billed annually",
    description: "Maximum security, control, and dedicated support for large organisations.",
    icon: <Crown className="w-5 h-5 text-warning-text" />,
    features: [
      "Everything in Professional",
      "Single Sign-On (SSO)",
      "Dedicated Success Manager",
      "Unlimited Storage",
      "Advanced Access Controls (IAM)",
      "Custom SLA & Contracts",
    ],
    buttonText: "Contact Sales",
    highlighted: false,
    color: "amber",
  },
];

const IGNORED_KEYS = new Set([
  'id', 'created_at', 'updated_at', 'is_deleted', 'metadata', 'search_vector', 'fts'
]);

const SUB_FIELD_LABELS: Record<string, string> = {
  software_name: "Subscription / Software Name",
  contract_type: "Plan / Type",
  contract_status: "Status",
  vendor_id: "Vendor",
  vendor_name: "Vendor Name",
  department_id: "Department",
  cost: "Cost",
  total_cost: "Total Cost",
  currency: "Currency",
  billing_frequency: "Billing Cycle",
  start_date: "Start Date",
  expiry_date: "Renewal Date",
  auto_renewal: "Auto Renewal",
  total_licenses: "Total Seats",
  used_licenses: "Assigned Seats",
  license_type: "License Model",
  support_level: "Support Tier",
  is_active: "Active Status",
  payment_terms: "Payment Terms",
  notes: "Remarks"
};

export function SubscriptionClient() {
  const [activeTab, setActiveTab] = useState<"pricing" | "history">("pricing");
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (activeTab === "history") {
      fetchSubscriptionHistory();
    }
  }, [activeTab]);

  const fetchSubscriptionHistory = async () => {
    setLoadingHistory(true);
    try {
      // 1. Fetch software subscriptions
      const { data: subsData } = await supabase
        .from("software_amc")
        .select("*")
        .eq("contract_type", "Subscription")
        .order("created_at", { ascending: false });

      const subs = subsData || [];
      setSubscriptions(subs);

      const subIds = subs.map(s => s.id);
      let logs: any[] = [];

      if (subIds.length > 0) {
        const { data: logData } = await supabase
          .from("software_amc_audit_logs")
          .select("*")
          .in("amc_id", subIds)
          .order("created_at", { ascending: false })
          .limit(50);
        logs = logData || [];
      } else {
        // Fallback: fetch recent audit logs from software_amc_audit_logs
        const { data: logData } = await supabase
          .from("software_amc_audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        logs = logData || [];
      }

      // Resolve actor names
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const rawActorIds = Array.from(new Set(logs.map(l => l.actor_id).filter(Boolean)));
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

      const subMap = Object.fromEntries(subs.map(s => [s.id, s.software_name]));

      const enriched = logs.map(l => ({
        ...l,
        software_name: subMap[l.amc_id] || l.after_values?.software_name || l.before_values?.software_name || "Subscription",
        actor_name: l.actor_id ? (userMap[l.actor_id] || "Team Member") : "System Administrator"
      }));

      setAuditLogs(enriched);
    } catch (err) {
      console.error("Failed to load subscription history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

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
          field: SUB_FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
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
          label: "CANCELLED"
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
    <div className="w-full space-y-6 animate-in fade-in-50 duration-700 py-6 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="text-center space-y-3 pb-6 border-b border-border/30">
        <AppBadge variant="neutral" className="px-3 py-1 text-accent-soft-text border border-border-active bg-accent-soft rounded-full mb-1">
          Workspace billing & plans
        </AppBadge>
        <h1 id="subscription-page-title" className="text-3xl md:text-5xl font-semibold tracking-tight bg-gradient-to-br from-foreground via-foreground/90 to-foreground/50 bg-clip-text text-transparent">
          Subscription Management
        </h1>
        <p className="text-sm md:text-base text-muted max-w-2xl mx-auto leading-relaxed">
          Manage workspace tiers, view enterprise software subscriptions, track renewal cycles, and inspect immutable audit history.
        </p>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center pt-4">
          <div role="tablist" aria-label="Subscription views" className="inline-flex rounded-lg border border-border bg-surface p-1 shadow-xs">
            <AppButton
              variant="ghost"
              type="button"
              role="tab"
              aria-selected={activeTab === "pricing"}
              onClick={() => setActiveTab("pricing")}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-all h-auto ${
                activeTab === "pricing"
                  ? "bg-accent-soft text-accent-soft-text border border-primary/30 ring-1 ring-primary/20 shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {activeTab === "pricing" && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
              <Zap className="h-3.5 w-3.5" />
              <span>Plans & Pricing</span>
            </AppButton>
            <AppButton
              variant="ghost"
              type="button"
              role="tab"
              aria-selected={activeTab === "history"}
              onClick={() => setActiveTab("history")}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-all h-auto ${
                activeTab === "history"
                  ? "bg-accent-soft text-accent-soft-text border border-primary/30 ring-1 ring-primary/20 shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {activeTab === "history" && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
              <Clock className="h-3.5 w-3.5" />
              <span>Subscription Activity & History</span>
            </AppButton>
          </div>
        </div>
      </header>

      {/* TAB 1: Plans & Pricing */}
      {activeTab === "pricing" && (
        <div className="space-y-8 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => (
              <AppCard 
                key={plan.name}
                className={`relative flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  plan.highlighted 
                    ? 'border-primary shadow-[0_0_40px_-15px_rgba(var(--accent),0.3)] bg-gradient-to-b from-accent/5 to-transparent' 
                    : 'border-border/40 hover:border-border'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
                )}
                
                <div className="p-6 md:p-8 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-surface border border-border/50">
                      {plan.icon}
                    </div>
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    {plan.highlighted && (
                      <AppBadge className="ml-auto bg-primary text-theme-icon-foreground border-none shadow-sm text-[11px] font-semibold">
                        Most popular
                      </AppBadge>
                    )}
                  </div>
                  
                  <div className="mb-2">
                    <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                    {plan.price !== "Custom" && (
                      <span className="text-sm text-muted font-medium ml-1">/{plan.period}</span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted mb-8 min-h-[40px]">
                    {plan.description}
                  </p>
                  
                  <div className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-3">
                        <div className={`mt-0.5 shrink-0 rounded-full p-0.5 ${plan.highlighted ? 'bg-accent-soft text-accent-soft-text' : 'bg-surface/50 text-muted'}`}>
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </div>
                        <span className="text-sm font-medium opacity-90">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-auto pt-6 border-t border-border/40">
                    <AppButton 
                      variant={plan.highlighted ? "primary" : "outline"} 
                      className={`w-full py-6 text-sm font-semibold shadow-sm transition-all duration-300 ${
                        plan.highlighted 
                          ? 'shadow-[0_4px_20px_-5px_rgba(var(--accent),0.4)] hover:shadow-[0_6px_25px_-5px_rgba(var(--accent),0.6)]' 
                          : 'hover:bg-surface'
                      }`}
                    >
                      {plan.buttonText}
                    </AppButton>
                  </div>
                </div>
              </AppCard>
            ))}
          </div>

          {/* Footer Teaser */}
          <div className="mt-12 text-center pb-8">
            <div className="inline-flex items-center justify-center gap-2 p-4 rounded-lg bg-surface/30 border border-border/40">
              <Shield className="w-5 h-5 text-muted" />
              <span className="text-sm font-medium text-muted">All plans include enterprise-grade security and 99.9% uptime SLA.</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Subscription Activity & Audit History */}
      {activeTab === "history" && (
        <div className="space-y-6 pt-2">
          {/* Summary Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-border/50 bg-elevated p-2 text-theme-icon">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Tracked Software Subscriptions</h2>
                <p className="text-xs text-muted">
                  {subscriptions.length} active software subscription {subscriptions.length === 1 ? 'contract' : 'contracts'} configured in Chandak Workspace
                </p>
              </div>
            </div>
            <Link href="/amc">
              <AppButton variant="outline" size="sm" className="gap-1.5 text-xs">
                <span>Manage Subscriptions & AMCs</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </AppButton>
            </Link>
          </div>

          {/* Subscriptions Grid / Cards */}
          {subscriptions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions.map(sub => (
                <AppCard key={sub.id} className="p-4 space-y-2 border-border shadow-xs hover:border-border-active transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-foreground truncate">{sub.software_name}</h3>
                    <AppBadge variant="warning" className="text-[10px] shrink-0 font-semibold">
                      Subscription
                    </AppBadge>
                  </div>
                  <div className="text-xs text-muted font-mono space-y-1 pt-1">
                    <div className="flex justify-between">
                      <span>Renewal Date:</span>
                      <span className="text-foreground font-semibold">{formatDate(sub.expiry_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Annual Cost:</span>
                      <span className="text-foreground font-semibold">{sub.currency || "INR"} {Number(sub.total_cost || 0).toLocaleString()}</span>
                    </div>
                    {sub.total_licenses && (
                      <div className="flex justify-between">
                        <span>Licenses / Seats:</span>
                        <span className="text-foreground">{sub.used_licenses || 0} / {sub.total_licenses}</span>
                      </div>
                    )}
                  </div>
                </AppCard>
              ))}
            </div>
          )}

          {/* Audit History Timeline */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-theme-icon" />
                <h3 className="text-sm font-semibold text-foreground">Subscription Changelog & Lifecycle History</h3>
              </div>
              <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-mono font-medium text-subtle">
                {auditLogs.length} events recorded
              </span>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center gap-2 py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted" aria-hidden />
                <span className="text-xs text-muted">Loading subscription history…</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="rounded-lg border border-border bg-surface p-12 text-center">
                <Clock className="mx-auto mb-3 h-8 w-8 text-muted opacity-40" />
                <p className="text-sm font-medium text-foreground">No subscription changes recorded yet</p>
                <p className="mt-1 text-xs text-muted">When subscriptions are created, renewed, or edited, the audit log appears here.</p>
              </div>
            ) : (
              <div className="relative space-y-4 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-border">
                {auditLogs.map((log) => {
                  const badge = getOperationBadge(log.operation);
                  const Icon = badge.icon;
                  const diffs = log.operation === 'UPDATE' ? extractDiffs(log.before_values, log.after_values) : [];
                  const after = log.after_values || {};

                  return (
                    <div key={log.id} className="relative flex items-start gap-3 pl-1">
                      <div className={`z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border shadow-xs ${badge.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>

                      <div className="flex-1 rounded-lg border border-border bg-surface p-3.5 shadow-xs transition-colors hover:border-border-active">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-theme-icon">
                              {log.actor_name}
                            </span>
                            <span className="text-xs text-foreground/90 font-medium">
                              {log.operation === 'INSERT' ? `registered ${log.software_name}` :
                               log.operation === 'DELETE' ? `removed ${log.software_name}` :
                               `updated ${log.software_name}`}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${badge.color}`}>
                              {badge.label}
                            </span>
                          </div>
                          <span className="font-mono text-[11.5px] text-muted">
                            {formatDateTime(log.created_at)}
                          </span>
                        </div>

                        {/* Diff display */}
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

                        {/* INSERT details */}
                        {log.operation === 'INSERT' && (
                          <div className="mt-2.5 rounded border border-border/50 bg-sunken/40 p-2.5 font-mono text-xs space-y-1">
                            <div className="flex gap-2">
                              <span className="w-36 font-bold uppercase text-[11px] text-muted">SUBSCRIPTION:</span>
                              <span className="text-foreground font-semibold">{after.software_name || log.software_name || "-"}</span>
                            </div>
                            {after.total_cost !== undefined && (
                              <div className="flex gap-2">
                                <span className="w-36 font-bold uppercase text-[11px] text-muted">TOTAL COST:</span>
                                <span className="text-foreground font-semibold">{after.currency || "INR"} {Number(after.total_cost || 0).toLocaleString()}</span>
                              </div>
                            )}
                            {after.expiry_date && (
                              <div className="flex gap-2">
                                <span className="w-36 font-bold uppercase text-[11px] text-muted">RENEWAL DATE:</span>
                                <span className="text-foreground">{after.expiry_date}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
