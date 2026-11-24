"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { AMCRenewalModal } from "@/components/amc/AMCRenewalModal";
import { 
  X, 
  FileText, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Clock, 
  Paperclip, 
  CreditCard, 
  Users, 
  RotateCcw,
  Boxes,
  Edit,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppCard } from "@/components/ui/AppCard";
import { 
  AppTableContainer, 
  AppTable, 
  AppTableHeader, 
  AppTableBody, 
  AppTableRow, 
  AppTableHead, 
  AppTableCell 
} from "@/components/ui/AppTable";
import { formatDate } from "@/components/ui/data";
import { cn } from "@/lib/utils";

// Sub-tabs
import { AMCRenewalsTab } from "@/components/amc/AMCRenewalsTab";
import { AMCAllocationsTab } from "@/components/amc/AMCAllocationsTab";
import { AMCAttachmentsTab } from "@/components/amc/AMCAttachmentsTab";
import { AMCHistoryTab } from "@/components/amc/AMCHistoryTab";
import { AMCPaymentsTab } from "@/components/amc/AMCPaymentsTab";
import { AMCImplementationTab } from "@/components/amc/AMCImplementationTab";
import { AMCTCOSpendHistoryTab } from "@/components/amc/AMCTCOSpendHistoryTab";
import { AMCTransactionsTab } from "@/components/amc/AMCTransactionsTab";

interface ContractDetailDrawerProps {
  record: any | null;
  isOpen: boolean;
  /** "page": the record page /amc/contracts/[id]; "overlay": full-screen overlay. */
  variant?: "overlay" | "page";
  onClose: () => void;
  onRefresh: () => void;
  onOpenEditForm: (record: any) => void;
  isLightMode?: boolean;
}

export function ContractDetailDrawer({
  variant = "overlay",
  record,
  isOpen,
  onClose,
  onRefresh,
  onOpenEditForm,
  isLightMode = false
}: ContractDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [renewOpen, setRenewOpen] = useState(false);
  const [nextPay, setNextPay] = useState<{ amount: number; due: string } | null>(null);
  const [paidTerm, setPaidTerm] = useState<number>(0);

  // Next pending payment and what's been paid (summary cards)
  useEffect(() => {
    if (!record?.id) return;
    const supabase = createClient();
    supabase
      .from("amc_invoices")
      .select("amount, due_date, status")
      .eq("amc_id", record.id)
      .order("due_date", { ascending: true })
      .then(({ data }) => {
        const rows = data || [];
        const pending = rows.find((r: any) => r.status === "Pending");
        setNextPay(pending ? { amount: Number(pending.amount) || 0, due: pending.due_date } : null);
        setPaidTerm(rows.filter((r: any) => r.status === "Paid").reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0));
      });
  }, [record?.id, activeTab]);

  if (!isOpen || !record) return null;

  const isSubscription = record.contract_type === "Subscription";

  // Type-tailored tab list with Overview as the primary tab
  const tabList = isSubscription
    ? [
        { id: "Overview", label: "Overview", icon: FileText },
        { id: "Payments", label: "Payments", icon: CreditCard },
        { id: "Renewals", label: "Renewals", icon: RotateCcw },
        { id: "Allocations", label: "Seats", icon: Users },
        { id: "Attachments", label: "Documents", icon: Paperclip },
        { id: "History", label: "History", icon: Clock },
      ]
    : [
        { id: "Overview", label: "Overview", icon: FileText },
        { id: "Payments", label: "Payments", icon: CreditCard },
        { id: "Renewals", label: "Renewals", icon: RotateCcw },
        { id: "Transactions", label: "Items and add-ons", icon: Boxes },
        { id: "Implementation", label: "Implementation", icon: Layers },
        { id: "Allocations", label: "Seats", icon: Users },
        { id: "Attachments", label: "Documents", icon: Paperclip },
        { id: "History", label: "History", icon: Clock },
      ];

  const cost = Number(record.total_cost || record.cost || 0);
  const daysLeft = record.expiry_date
    ? Math.round((new Date(String(record.expiry_date).slice(0, 10)).getTime() - new Date(new Date().toISOString().slice(0, 10)).getTime()) / 86400000)
    : null;

  const handleExportDossier = () => {
    window.print();
  };

  const lineItems = Array.isArray(record.solution_line_items) ? record.solution_line_items : [];
  const contact = record.vendor_contact_json || {};
  const taxation = record.taxation_json || {};
  const bank = record.bank_details_json || {};
  const paymentMilestones = Array.isArray(record.payment_terms_json?.milestones) ? record.payment_terms_json.milestones : [];

  return (
    <div className={variant === "page" ? "flex flex-col rounded-xl border border-border bg-surface" : "fixed inset-0 z-[var(--z-modal)] flex flex-col animate-in slide-in-from-bottom-4 duration-300 bg-surface"}>
      {/* Drawer Top Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg border ${
            isSubscription 
              ? "bg-warning-soft text-warning-text border-warning-border" 
              : "bg-primary/10 text-primary border-primary/20"
          }`}>
            {isSubscription ? <Zap className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-heading">
                {record.software_name}
              </h2>
              <AppBadge 
                variant={isSubscription ? "warning" : "accent"} 
                className="text-[10px] font-semibold"
              >
                {record.contract_type || "AMC"}
              </AppBadge>
              <AppBadge 
                variant={record.status === "Active" ? "success" : "neutral"} 
                className="text-[10px]"
              >
                {record.status || "Active"}
              </AppBadge>
            </div>
            <p className="text-xs text-muted truncate">
              {record.po_number ? `PO: ${record.po_number} · ` : ""}
              Valid until: {record.expiry_date ? formatDate(record.expiry_date) : "Open"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AppButton type="button" variant="outline" size="sm" onClick={() => onOpenEditForm(record)} leftIcon={<Edit className="h-3.5 w-3.5" />} className="text-xs font-semibold">
            Edit
          </AppButton>
          <AppButton type="button" variant="outline" size="sm" onClick={() => setActiveTab("Payments")} leftIcon={<CreditCard className="h-3.5 w-3.5" />} className="text-xs font-semibold">
            Record payment
          </AppButton>
          <AppButton type="button" variant="primary" size="sm" onClick={() => setRenewOpen(true)} leftIcon={<RotateCcw className="h-3.5 w-3.5" />} className="text-xs font-semibold">
            Renew
          </AppButton>
          <AppButton type="button" variant="ghost" size="sm" onClick={handleExportDossier} leftIcon={<FileText className="h-3.5 w-3.5" />} className="hidden text-xs sm:inline-flex">
            Print summary
          </AppButton>
          {variant !== "page" && (
            <AppButton aria-label="Close" title="Close" variant="ghost" size="icon-sm" onClick={onClose} className="text-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </AppButton>
          )}
        </div>
      </div>

      {/* Summary: value, term, paid, next payment, seats */}
      <div className="grid grid-cols-2 gap-3 border-b border-border bg-sunken px-5 py-4 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface px-3.5 py-3">
          <div className="text-[12.5px] text-muted">Contract value</div>
          <div className="mt-0.5 text-[19px] font-bold tabular-nums text-heading">{record.currency || "INR"} {cost.toLocaleString("en-IN")}</div>
          {record.monthly_amortized_cost ? (
            <div className="text-[12px] text-muted">{record.currency || "INR"} {Number(record.monthly_amortized_cost).toLocaleString("en-IN")} a month</div>
          ) : null}
        </div>
        <div className="rounded-lg border border-border bg-surface px-3.5 py-3">
          <div className="text-[12.5px] text-muted">Term</div>
          <div className="mt-0.5 text-[15px] font-bold text-heading">
            {record.purchase_date ? formatDate(record.purchase_date) : "—"} – {record.expiry_date ? formatDate(record.expiry_date) : "open"}
          </div>
          {daysLeft !== null && (
            <div className={`text-[12px] font-semibold ${daysLeft < 0 ? "text-danger-text" : daysLeft <= 30 ? "text-warning-text" : "text-muted"}`}>
              {daysLeft < 0 ? `ended ${-daysLeft} days ago` : daysLeft === 0 ? "ends today" : `${daysLeft} days left`}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border bg-surface px-3.5 py-3">
          <div className="text-[12.5px] text-muted">Paid so far</div>
          <div className="mt-0.5 text-[19px] font-bold tabular-nums text-heading">{record.currency || "INR"} {paidTerm.toLocaleString("en-IN")}</div>
          {cost > 0 && (
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (paidTerm / cost) * 100)}%` }} />
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border bg-surface px-3.5 py-3">
          <div className="text-[12.5px] text-muted">{record.total_licenses ? "Next payment · seats" : "Next payment"}</div>
          <div className="mt-0.5 text-[19px] font-bold tabular-nums text-heading">
            {nextPay ? `${record.currency || "INR"} ${nextPay.amount.toLocaleString("en-IN")}` : "Nothing due"}
          </div>
          <div className="text-[12px] text-muted">
            {nextPay ? `due ${formatDate(nextPay.due)}` : ""}
            {record.total_licenses ? `${nextPay ? " · " : ""}${record.used_licenses || 0} of ${record.total_licenses} seats used` : ""}
          </div>
        </div>
      </div>

      {/* Tab Navigation Strip */}
      <div className="shrink-0 border-b border-border bg-surface px-5">
        <div role="tablist" aria-label="Contract sections" className="flex max-w-full gap-1 overflow-x-auto hide-scrollbar py-2">
          {tabList.map(t => {
            const isActive = activeTab === t.id;
            const Icon = t.icon;

            return (
              <AppButton 
                key={t.id}
                type="button"
                role="tab"
                variant="ghost"
                size="sm"
                aria-selected={isActive}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive 
                    ? 'bg-accent-soft text-accent-soft-text border border-primary/30 ring-1 ring-primary/20 font-semibold shadow-xs hover:bg-accent-soft hover:text-accent-soft-text' 
                    : 'border border-transparent text-muted hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </AppButton>
            );
          })}
        </div>
      </div>

      {/* Tab Content Panes */}
      <div className={cn("p-5 md:p-8", variant !== "page" && "flex-1 overflow-y-auto")}>
        {/* Tab: Overview (Mirrors the exact state entered during creation) */}
        {activeTab === 'Overview' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Action Bar */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-sunken/40">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {isSubscription ? "SaaS Subscription Dossier" : "AMC Agreement & Itemwise Transactions"}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Record loaded in the exact saved state. Click Edit to adjust commercials, line items, or attachments.
                </p>
              </div>
              <AppButton
                variant="primary"
                size="sm"
                onClick={() => onOpenEditForm(record)}
                leftIcon={<Edit className="h-3.5 w-3.5" />}
                className="text-xs font-semibold"
              >
                Edit Record
              </AppButton>
            </div>

            {/* Section 1: Identification & Vendor */}
            <AppCard className="p-5 border-border shadow-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <Building2 className="h-4 w-4 text-theme-icon" /> 1. Provider & Identification
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted block">System / Service Name:</span>
                  <span className="font-semibold text-foreground text-sm mt-0.5 block">{record.software_name}</span>
                </div>
                <div>
                  <span className="text-muted block">Contract Type:</span>
                  <span className="font-medium text-foreground mt-0.5 block">{record.contract_type || "AMC"}</span>
                </div>
                <div>
                  <span className="text-muted block">Status:</span>
                  <span className="mt-0.5 inline-block">
                    <AppBadge variant={record.status === "Active" ? "success" : "neutral"} className="text-[10.5px]">
                      {record.status || "Active"}
                    </AppBadge>
                  </span>
                </div>
                {contact.name && (
                  <div>
                    <span className="text-muted block">Contact Person:</span>
                    <span className="font-medium text-foreground mt-0.5 block">{contact.name}</span>
                  </div>
                )}
                {contact.email && (
                  <div>
                    <span className="text-muted block">Contact Email:</span>
                    <span className="font-medium text-foreground mt-0.5 block">{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <span className="text-muted block">Contact Phone:</span>
                    <span className="font-medium text-foreground mt-0.5 block">{contact.phone}</span>
                  </div>
                )}
                {taxation.gstNumber && (
                  <div>
                    <span className="text-muted block">GST Number:</span>
                    <span className="font-mono text-foreground mt-0.5 block">{taxation.gstNumber}</span>
                  </div>
                )}
                {taxation.panNumber && (
                  <div>
                    <span className="text-muted block">PAN Number:</span>
                    <span className="font-mono text-foreground mt-0.5 block">{taxation.panNumber}</span>
                  </div>
                )}
                {bank.bankName && (
                  <div>
                    <span className="text-muted block">Bank Details:</span>
                    <span className="font-mono text-foreground mt-0.5 block">{bank.bankName} ({bank.ifsc})</span>
                  </div>
                )}
              </div>
            </AppCard>

            {/* Section 2: Commercial Terms & Dates */}
            <AppCard className="p-5 border-border shadow-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-theme-icon" /> 2. Commercials & Timeline
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted block">Purchase / Start Date:</span>
                  <span className="font-mono font-medium text-foreground mt-0.5 block">
                    {record.purchase_date ? formatDate(record.purchase_date) : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-muted block">Expiry / Renewal Date:</span>
                  <span className="font-mono font-medium text-foreground mt-0.5 block">
                    {record.expiry_date ? formatDate(record.expiry_date) : "Open"}
                  </span>
                </div>
                <div>
                  <span className="text-muted block">Total Financial Value:</span>
                  <span className="font-semibold text-foreground text-sm tabular-nums mt-0.5 block">
                    {record.currency || "INR"} {cost.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted block">Billing / Renewal Period:</span>
                  <span className="font-medium text-foreground mt-0.5 block">
                    {record.billing_frequency || record.renewal_period_type || "Yearly"}
                  </span>
                </div>
                {record.po_number && (
                  <div>
                    <span className="text-muted block">PO Reference:</span>
                    <span className="font-mono text-foreground mt-0.5 block">{record.po_number}</span>
                  </div>
                )}
                {record.total_licenses && (
                  <div>
                    <span className="text-muted block">Capacity / Seats:</span>
                    <span className="font-mono text-foreground mt-0.5 block">{record.used_licenses || 0} / {record.total_licenses} seats</span>
                  </div>
                )}
              </div>
            </AppCard>

            {/* Section 3: Itemwise Solution Transactions (Created in AMC modal) */}
            {!isSubscription && (
              <AppCard className="p-5 border-border shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-theme-icon" /> 3. Itemwise Solution Breakdown ({lineItems.length} Line Items)
                  </h4>
                  {record.is_line_item_wise && (
                    <AppBadge variant="accent" className="text-[10px]">Line-Item Wise Pricing Active</AppBadge>
                  )}
                </div>

                {lineItems.length > 0 ? (
                  <AppTableContainer className="rounded-lg border border-border">
                    <AppTable className="text-left text-xs">
                      <AppTableHeader>
                        <AppTableRow className="bg-sunken text-muted">
                          <AppTableHead className="w-12 font-semibold">#</AppTableHead>
                          <AppTableHead className="font-semibold">Resolution / Item</AppTableHead>
                          <AppTableHead className="font-semibold text-right">Qty</AppTableHead>
                          <AppTableHead className="font-semibold text-right">Rate</AppTableHead>
                          <AppTableHead className="font-semibold text-right">Taxes (GST)</AppTableHead>
                          <AppTableHead className="font-semibold text-right">Net Amount</AppTableHead>
                        </AppTableRow>
                      </AppTableHeader>
                      <AppTableBody className="divide-y divide-border/60">
                        {lineItems.map((item: any, idx: number) => {
                          const tax = (Number(item.cgstAmount) || 0) + (Number(item.sgstAmount) || 0) + (Number(item.igstAmount) || 0);
                          return (
                            <AppTableRow key={idx} className="hover:bg-surface-hover/50">
                              <AppTableCell className="font-mono text-muted">{idx + 1}</AppTableCell>
                              <AppTableCell className="font-medium text-foreground">{item.resolutionName || "Line Item"}</AppTableCell>
                              <AppTableCell className="text-right font-mono tabular-nums">{item.qty || 1}</AppTableCell>
                              <AppTableCell className="text-right font-mono tabular-nums">{record.currency || "INR"} {Number(item.rate || 0).toLocaleString()}</AppTableCell>
                              <AppTableCell className="text-right font-mono tabular-nums text-muted">{tax > 0 ? `${record.currency || "INR"} ${tax.toLocaleString()}` : "0%"}</AppTableCell>
                              <AppTableCell className="text-right font-mono font-semibold text-foreground tabular-nums">
                                {record.currency || "INR"} {Number(item.netAmount || 0).toLocaleString()}
                              </AppTableCell>
                            </AppTableRow>
                          );
                        })}
                      </AppTableBody>
                    </AppTable>
                  </AppTableContainer>
                ) : (
                  <p className="text-xs text-muted">This AMC contract was registered at a lump-sum value without individual line item lines.</p>
                )}
              </AppCard>
            )}

            {/* Section 4: Payment Milestones */}
            {paymentMilestones.length > 0 && (
              <AppCard className="p-5 border-border shadow-xs space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-theme-icon" /> 4. Payment Schedule Milestones ({paymentMilestones.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {paymentMilestones.map((m: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{m.phaseName || `Phase #${idx + 1}`}</span>
                        <AppBadge variant={m.status === "Amount Released" ? "success" : "neutral"} className="text-[10px]">
                          {m.status || "Pending"}
                        </AppBadge>
                      </div>
                      <div className="flex items-center justify-between text-muted text-[11px] pt-1">
                        <span>Allocation: {m.percentage ? `${m.percentage}%` : ""}</span>
                        <span className="font-mono font-semibold text-foreground">
                          {record.currency || "INR"} {Number(m.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </AppCard>
            )}

            {/* Section 5: SLAs & Operational Notes */}
            <AppCard className="p-5 border-border shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-theme-icon" /> Service Level Agreements & Notes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted block">Support Tier:</span>
                  <span className="font-medium text-foreground mt-0.5 block">{record.support_tier || "Standard (9x5)"}</span>
                </div>
                <div>
                  <span className="text-muted block">SLA Uptime Commitment:</span>
                  <span className="font-mono font-semibold text-foreground mt-0.5 block">{record.sla_uptime || "99.5"}%</span>
                </div>
                <div>
                  <span className="text-muted block">Ticket Turnaround (TAT):</span>
                  <span className="font-medium text-foreground mt-0.5 block">{record.sla_tat || "4 Hours"}</span>
                </div>
              </div>
              {record.specifications && (
                <div className="pt-2 text-xs">
                  <span className="text-muted block">Scope Specifications:</span>
                  <p className="mt-1 text-foreground bg-sunken/40 p-2.5 rounded-lg border border-border/40 whitespace-pre-wrap">{record.specifications}</p>
                </div>
              )}
              {record.notes && (
                <div className="pt-1 text-xs">
                  <span className="text-muted block">Remarks & Notes:</span>
                  <p className="mt-1 text-muted whitespace-pre-wrap">{record.notes}</p>
                </div>
              )}
            </AppCard>
          </div>
        )}

        {activeTab === 'Overview' && (
          <section aria-label="Spend over the years" className="mt-6">
            <h3 className="mb-3 text-[15px] font-semibold text-heading">Spend over the years</h3>
            <AMCTCOSpendHistoryTab amcId={record.id} isLightMode={isLightMode} currency={record.currency || "INR"} record={record} onRefresh={onRefresh} />
          </section>
        )}

        {activeTab === 'Implementation' && (
          <AMCImplementationTab 
            amcId={record.id} 
            isLightMode={isLightMode} 
            onUpdate={onRefresh} 
            softwareName={record.software_name || ""}
            contractPutToUseDate={record.put_to_use_date || ""}
          />
        )}

        {activeTab === 'Spend History (TCO)' && (
          <AMCTCOSpendHistoryTab 
            amcId={record.id} 
            isLightMode={isLightMode} 
            currency={record.currency || "INR"}
            record={record}
            onRefresh={onRefresh}
          />
        )}

        {activeTab === 'Transactions' && (
          <AMCTransactionsTab 
            amcId={record.id} 
            isLightMode={isLightMode} 
            onUpdate={onRefresh} 
          />
        )}

        {activeTab === 'Payments' && (
          <AMCPaymentsTab 
            amcId={record.id} 
            isLightMode={isLightMode} 
            currency={record.currency || "INR"}
          />
        )}

        {activeTab === 'Renewals' && (
          <AMCRenewalsTab 
            amcId={record.id} 
            isLightMode={isLightMode} 
            onUpdate={onRefresh} 
            currentExpiryDate={record.expiry_date}
            currency={record.currency || "INR"}
            baseContractCost={cost}
          />
        )}

        {activeTab === 'Allocations' && (
          <AMCAllocationsTab 
            amcId={record.id} 
            isLightMode={isLightMode} 
            onUpdate={onRefresh} 
          />
        )}

        {activeTab === 'Attachments' && (
          <AMCAttachmentsTab 
            amcId={record.id} 
            isLightMode={isLightMode} 
          />
        )}

        {activeTab === 'History' && (
          <AMCHistoryTab 
            amcId={record.id} 
            isLightMode={isLightMode} 
          />
        )}
      </div>

      {renewOpen && (
        <AMCRenewalModal
          amcData={record}
          isLightMode={isLightMode}
          onClose={() => setRenewOpen(false)}
          onRenewed={() => {
            setRenewOpen(false);
            onRefresh();
            setActiveTab("Renewals");
          }}
        />
      )}
    </div>
  );
}
