"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppButton } from "@/components/ui/AppButton";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { AccessRestricted } from "@/components/errors/AccessRestricted";
import { createClient } from "@/utils/supabase/client";
import { deleteAMCEntity } from "@/lib/actions/amc-client";

// Tab Sub-Components
import { AMCOverviewTab } from "@/components/amc/AMCOverviewTab";
import { AMCContractsListTab } from "@/components/amc/AMCContractsListTab";
import { AMCSubscriptionsListTab } from "@/components/amc/AMCSubscriptionsListTab";
import { AMCReportsHistoryTab } from "@/components/amc/AMCReportsHistoryTab";

// Modals & Drawer
import { AMCContractModal } from "@/components/amc/AMCContractModal";
import { SubscriptionContractModal } from "@/components/amc/SubscriptionContractModal";
import { ContractDetailDrawer } from "@/components/amc/ContractDetailDrawer";
import { AMCHistoryModal } from "@/components/amc/AMCHistoryModal";
import { AMCRenewalModal } from "@/components/amc/AMCRenewalModal";

import { 
  BarChart3, 
  ShieldCheck, 
  Zap, 
  FileBarChart, 
  Plus, 
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2
} from "lucide-react";

type ModuleTab = "overview" | "amc" | "subscriptions" | "reports";

export default function AMCPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { hasPermission, loading: permsLoading, roleCode } = usePermissions();
  
  let isLightMode = false;
  try {
    const themeCtx = useTheme();
    isLightMode = themeCtx.isLight;
  } catch (e) {}

  // Synchronize active tab with URL query parameter
  const tabParam = searchParams.get("tab") as ModuleTab | null;
  const [activeTab, setActiveTab] = useState<ModuleTab>(
    tabParam && ["overview", "amc", "subscriptions", "reports"].includes(tabParam)
      ? tabParam
      : "overview"
  );

  const handleTabChange = (tab: ModuleTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`/amc?${params.toString()}`, { scroll: false });
  };

  // Shared Data State
  const [records, setRecords] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawer State
  const [isAMCModalOpen, setIsAMCModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [drawerRecord, setDrawerRecord] = useState<any | null>(null);
  const [renewRecord, setRenewRecord] = useState<any | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all contracts and dependencies
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("software_amc")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err: any) {
      console.error("Error loading contracts:", err);
      toast.error("Failed to load contracts: " + (err.message || "Network error"));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchDependencies = useCallback(async () => {
    try {
      const [vRes, dRes, uRes] = await Promise.all([
        supabase.from("vendor_master").select("id, vendor_name, email, phone, contact_person, gst_number, pan_number").order("vendor_name"),
        supabase.from("departments").select("id, name, department_name").order("name"),
        supabase.from("user_master").select("id, full_name, email").order("full_name")
      ]);

      if (vRes.data) setVendors(vRes.data);
      if (dRes.data) setDepartments(dRes.data);
      if (uRes.data) setUsers(uRes.data);
    } catch (err) {
      console.error("Error fetching dependencies:", err);
    }
  }, [supabase]);

  useEffect(() => {
    fetchRecords();
    fetchDependencies();
  }, [fetchRecords, fetchDependencies]);

  // Open Create Modals
  const handleOpenCreateAMC = () => {
    setEditingRecord(null);
    setIsAMCModalOpen(true);
  };

  const handleOpenCreateSub = () => {
    setEditingRecord(null);
    setIsSubModalOpen(true);
  };

  // Open Drawer or Direct Edit
  const handleOpenDrawer = (record: any) => {
    setDrawerRecord(record);
  };

  const handleOpenEditDirect = (record: any) => {
    if (record.contract_type === "Subscription") {
      setEditingRecord(record);
      setIsSubModalOpen(true);
    } else {
      setEditingRecord(record);
      setIsAMCModalOpen(true);
    }
  };

  const handleOpenEditFromDrawer = (record: any) => {
    setDrawerRecord(null);
    handleOpenEditDirect(record);
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    try {
      const res = await deleteAMCEntity("software_amc", deleteCandidate.id);
      if (!res.success) throw new Error(res.error);
      toast.success(`"${deleteCandidate.software_name}" deleted successfully.`);
      setDeleteCandidate(null);
      await fetchRecords();
    } catch (err: any) {
      toast.error("Failed to delete record: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Permission Guard
  const canView = hasPermission("SUPER_ADMIN") || hasPermission("AMC_VIEW") || hasPermission("AMC_MANAGE");
  if (!permsLoading && !canView) {
    return (
      <AccessRestricted
        requiredRole="AMC Manager"
        requiredPermission="AMC_VIEW"
        moduleName="AMC and Subscriptions"
      />
    );
  }

  return (
    <PageContainer strict={true}>
      {/* Enterprise Page Header */}
      <PageHeader
        title="AMC & Subscriptions"
        description="Software subscriptions, annual maintenance agreements, vendor commitments, and renewal lifecycles."
        icon={<ShieldCheck className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-2">
            <AppButton
              variant="outline"
              size="sm"
              onClick={fetchRecords}
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />}
              className="text-xs h-9"
              aria-label="Refresh records"
            >
              Refresh
            </AppButton>
            {hasPermission("AMC_CREATE") && (
              <>
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={handleOpenCreateAMC}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  className="text-xs h-9 font-medium"
                >
                  New AMC Contract
                </AppButton>
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreateSub}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  className="text-xs h-9 font-semibold"
                >
                  New Subscription
                </AppButton>
              </>
            )}
          </div>
        }
      />

      {/* Top Navigation Tabs */}
      <div className="border-b border-border bg-surface -mx-4 px-4 sm:-mx-6 sm:px-6 mb-5">
        <div role="tablist" aria-label="Module sections" className="flex max-w-full gap-1 overflow-x-auto hide-scrollbar py-1">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "amc", label: "AMC Contracts", icon: ShieldCheck, count: records.filter(r => r.contract_type !== "Subscription").length },
            { id: "subscriptions", label: "Subscriptions", icon: Zap, count: records.filter(r => r.contract_type === "Subscription").length },
            { id: "reports", label: "Reports & History", icon: FileBarChart }
          ].map(t => {
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
                onClick={() => handleTabChange(t.id as ModuleTab)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-3.5 py-1.5 my-1.5 rounded-md text-[13px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive 
                    ? "bg-accent-soft text-accent-soft-text border border-primary/30 ring-1 ring-primary/20 font-semibold shadow-xs hover:bg-accent-soft hover:text-accent-soft-text" 
                    : "border border-transparent text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span className="rounded-full bg-sunken px-1.5 text-[11px] font-mono tabular-nums text-subtle">
                    {t.count}
                  </span>
                )}
              </AppButton>
            );
          })}
        </div>
      </div>

      {/* Tab Panes */}
      <div className="space-y-6">
        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <AMCOverviewTab
            records={records}
            departments={departments}
            vendors={vendors}
            isLightMode={isLightMode}
            onSelectRecord={handleOpenDrawer}
            onRefresh={fetchRecords}
            onNavigateToAMC={() => handleTabChange("amc")}
            onNavigateToSubscriptions={() => handleTabChange("subscriptions")}
            onOpenCreateAMC={handleOpenCreateAMC}
            onOpenCreateSubscription={handleOpenCreateSub}
          />
        )}

        {/* Tab 2: AMC Contracts */}
        {activeTab === "amc" && (
          <AMCContractsListTab
            records={records}
            vendors={vendors}
            departments={departments}
            loading={loading}
            onRefresh={fetchRecords}
            onOpenCreate={handleOpenCreateAMC}
            onOpenView={handleOpenDrawer}
            onOpenEdit={handleOpenEditDirect}
            onOpenRenew={(rec) => setRenewRecord(rec)}
            onOpenHistory={(id) => setHistoryRecordId(id)}
            onDelete={(rec) => setDeleteCandidate(rec)}
            hasPermission={hasPermission}
          />
        )}

        {/* Tab 3: Subscriptions */}
        {activeTab === "subscriptions" && (
          <AMCSubscriptionsListTab
            records={records}
            vendors={vendors}
            departments={departments}
            loading={loading}
            onRefresh={fetchRecords}
            onOpenCreate={handleOpenCreateSub}
            onOpenView={handleOpenDrawer}
            onOpenEdit={handleOpenEditDirect}
            onOpenRenew={(rec) => setRenewRecord(rec)}
            onOpenHistory={(id) => setHistoryRecordId(id)}
            onDelete={(rec) => setDeleteCandidate(rec)}
            hasPermission={hasPermission}
          />
        )}

        {/* Tab 4: Reports & History */}
        {activeTab === "reports" && (
          <AMCReportsHistoryTab />
        )}
      </div>

      {/* Contract Detail Drawer */}
      <ContractDetailDrawer
        record={drawerRecord}
        isOpen={!!drawerRecord}
        onClose={() => setDrawerRecord(null)}
        onRefresh={fetchRecords}
        onOpenEditForm={handleOpenEditFromDrawer}
        isLightMode={isLightMode}
      />

      {/* AMC Create / Edit Modal */}
      <AMCContractModal
        isOpen={isAMCModalOpen}
        onClose={() => { setIsAMCModalOpen(false); setEditingRecord(null); }}
        onSaved={async () => {
          await fetchRecords();
        }}
        initialRecord={editingRecord}
        vendors={vendors}
        departments={departments}
        users={users}
      />

      {/* Subscription Create / Edit Modal */}
      <SubscriptionContractModal
        isOpen={isSubModalOpen}
        onClose={() => { setIsSubModalOpen(false); setEditingRecord(null); }}
        onSaved={async () => {
          await fetchRecords();
        }}
        initialRecord={editingRecord}
        vendors={vendors}
        departments={departments}
        users={users}
      />

      {/* Standalone Renewal Modal */}
      {renewRecord && (
        <AMCRenewalModal
          amcData={renewRecord}
          isLightMode={isLightMode}
          onClose={() => setRenewRecord(null)}
          onRenewed={async () => {
            setRenewRecord(null);
            await fetchRecords();
          }}
        />
      )}

      {/* Standalone History Modal */}
      {historyRecordId && (
        <AMCHistoryModal
          amcId={historyRecordId}
          onClose={() => setHistoryRecordId(null)}
          isLightMode={isLightMode}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-[var(--overlay)] animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-danger-soft p-2.5 text-danger-text">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Confirm Deletion</h3>
                <p className="text-xs text-muted">This action will soft-delete the contract.</p>
              </div>
            </div>

            <p className="text-sm text-foreground">
              Are you sure you want to delete <strong className="text-primary">{deleteCandidate.software_name}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <AppButton
                variant="outline"
                size="sm"
                onClick={() => setDeleteCandidate(null)}
                disabled={isDeleting}
              >
                Cancel
              </AppButton>
              <AppButton
                variant="destructive"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="font-semibold"
              >
                {isDeleting ? "Deleting…" : "Delete Contract"}
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
