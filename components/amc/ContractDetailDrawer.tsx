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
  Edit
} from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
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
  const [activeTab, setActiveTab] = useState("Spend History (TCO)");

  if (!isOpen || !record) return null;

  const isSubscription = record.contract_type === "Subscription";

  // Type-tailored tab list
  const tabList = isSubscription
    ? [
        { id: "Allocations", label: "Seat Allocations", icon: Users },
        { id: "Renewals", label: "Renewals", icon: RotateCcw },
        { id: "Attachments", label: "Attachments", icon: Paperclip },
        { id: "Spend History (TCO)", label: "Spend History", icon: TrendingUp },
        { id: "History", label: "Audit Changelog", icon: Clock },
      ]
    : [
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
            variant="outline"
            size="sm"
            onClick={() => onOpenEditForm(record)}
            leftIcon={<Edit className="h-3.5 w-3.5" />}
            className="text-xs"
          >
            Edit Contract
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
          {record.total_licenses && (
            <>
              <div className="h-3 w-[1px] bg-border hidden sm:block"></div>
              <div className="flex items-center gap-1.5 text-muted">
                <span>Seats:</span>
                <span className="font-mono text-foreground font-medium">
                  {record.used_licenses || 0} / {record.total_licenses}
                </span>
              </div>
            </>
          )}
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
