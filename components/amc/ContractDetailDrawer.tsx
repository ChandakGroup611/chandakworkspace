"use client";

import React, { useState } from "react";
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
  onClose: () => void;
  onRefresh: () => void;
  onOpenEditForm: (record: any) => void;
  isLightMode?: boolean;
}

export function ContractDetailDrawer({
  record,
  isOpen,
  onClose,
  onRefresh,
  onOpenEditForm,
  isLightMode = false
}: ContractDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState("Overview");

  if (!isOpen || !record) return null;

  const isSubscription = record.contract_type === "Subscription";

  // Type-tailored tab list with Overview as the primary tab
  const tabList = isSubscription
    ? [
        { id: "Overview", label: "Subscription Overview", icon: FileText },
        { id: "Allocations", label: "Seat Allocations", icon: Users },
        { id: "Renewals", label: "Renewals", icon: RotateCcw },
        { id: "Attachments", label: "Attachments", icon: Paperclip },
        { id: "Spend History (TCO)", label: "Spend History", icon: TrendingUp },
        { id: "History", label: "Audit Changelog", icon: Clock },
      ]
    : [
        { id: "Overview", label: "Contract & Line Items", icon: FileText },
        { id: "Implementation", label: "Implementation Lifecycle", icon: Layers },
        { id: "Spend History (TCO)", label: "Spend History (TCO)", icon: TrendingUp },
        { id: "Transactions", label: "Add-ons & Scope", icon: Boxes },
        { id: "Payments", label: "Payment Milestones", icon: CreditCard },
        { id: "Renewals", label: "Renewals", icon: RotateCcw },
        { id: "Allocations", label: "Allocations", icon: Users },
        { id: "Attachments", label: "Attachments", icon: Paperclip },
        { id: "History", label: "Audit Changelog", icon: Clock },
      ];

  const cost = Number(record.total_cost || record.cost || 0);

  const handleExportDossier = () => {
    window.print();
  };

  const lineItems = Array.isArray(record.solution_line_items) ? record.solution_line_items : [];
  const contact = record.vendor_contact_json || {};
  const taxation = record.taxation_json || {};
  const bank = record.bank_details_json || {};
  const paymentMilestones = Array.isArray(record.payment_terms_json?.milestones) ? record.payment_terms_json.milestones : [];

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col animate-in slide-in-from-bottom-4 duration-300 bg-surface">
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

        <div className="flex items-center gap-2">
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onOpenEditForm(record)}
            leftIcon={<Edit className="h-3.5 w-3.5" />}
            className="text-xs font-semibold"
          >
            Edit {isSubscription ? "Subscription" : "Contract"}
          </AppButton>
          <AppButton
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportDossier}
            leftIcon={<FileText className="h-3.5 w-3.5" />}
            className="text-xs hidden sm:inline-flex"
          >
            Export Dossier
          </AppButton>
          <AppButton 
            aria-label="Close contract drawer" 
            title="Close" 
            variant="ghost" 
            size="icon-sm" 
            onClick={onClose} 
            className="text-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </AppButton>
        </div>
      </div>

      {/* TCO Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-sunken px-5 py-2 text-[12.5px]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-muted">
            <span>Contract Value:</span>
            <span className="font-semibold tabular-nums text-foreground">
              {record.currency || "INR"} {cost.toLocaleString()}
            </span>
          </div>
          {record.po_number && (
            <>
              <div className="h-3 w-[1px] bg-border hidden sm:block"></div>
              <div className="flex items-center gap-1.5 text-muted">
                <span>PO:</span>
                <span className="font-mono text-foreground font-medium">{record.po_number}</span>
              </div>
            </>
          )}
          {record.total_licenses ? (
            <>
              <div className="h-3 w-[1px] bg-border hidden sm:block"></div>
              <div className="flex items-center gap-1.5 text-muted">
                <span>Seats:</span>
                <span className="font-mono text-foreground font-medium">
                  {record.used_licenses || 0} / {record.total_licenses}
                </span>
              </div>
            </>
          ) : null}
          {record.monthly_amortized_cost ? (
            <>
              <div className="h-3 w-[1px] bg-border hidden sm:block"></div>
              <div className="flex items-center gap-1.5 text-muted">
                <span>Monthly Burn:</span>
                <span className="font-mono text-foreground font-medium">
                  {record.currency || "INR"} {Number(record.monthly_amortized_cost).toLocaleString()}/mo
                </span>
              </div>
            </>
          ) : null}
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
      <div className="flex-1 overflow-y-auto p-5 md:p-8">
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
    </div>
  );
}
