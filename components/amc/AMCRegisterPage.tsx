"use client";

/**
 * Register (list) page for AMC contracts or subscriptions.
 * Record standard: View → /amc/<section>/<id>, Edit → /amc/<section>/<id>/edit,
 * a record just created is highlighted (?created=<id>).
 */
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Trash2, RefreshCw } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/components/theme/ThemeProvider";
import { deleteAMCEntity } from "@/lib/actions/amc-client";
import { RecordHighlighter } from "@/components/ui/record";
import { AMCContractsListTab } from "./AMCContractsListTab";
import { AMCSubscriptionsListTab } from "./AMCSubscriptionsListTab";
import { AMCHistoryModal } from "./AMCHistoryModal";
import { AMCRenewalModal } from "./AMCRenewalModal";
import { AMCShell } from "./AMCShell";
import { useAMCData, amcRecordHref } from "./useAMCData";

export function AMCRegisterPage({ kind }: { kind: "amc" | "subscription" }) {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  let isLightMode = false;
  try { isLightMode = useTheme().isLight; } catch {}

  const { records, vendors, departments, loading, fetchRecords } = useAMCData();
  const [renewRecord, setRenewRecord] = useState<any | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Rows only carry data-record-id after the list renders; re-run the highlighter then.
  const [ready, setReady] = useState(false);
  useEffect(() => { if (!loading) setReady(true); }, [loading]);

  const isSub = kind === "subscription";
  const section = isSub ? "/amc/subscriptions" : "/amc/contracts";
  const amcCount = records.filter((r) => r.contract_type !== "Subscription").length;
  const subCount = records.filter((r) => r.contract_type === "Subscription").length;

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    try {
      const res = await deleteAMCEntity("software_amc", deleteCandidate.id);
      if (!res.success) throw new Error(res.error);
      toast.success(`"${deleteCandidate.software_name}" deleted.`);
      setDeleteCandidate(null);
      await fetchRecords();
    } catch (err: any) {
      toast.error("Failed to delete record: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const listProps = {
    records,
    vendors,
    departments,
    loading,
    onRefresh: fetchRecords,
    onOpenCreate: () => router.push(`${section}/new`),
    onOpenView: (rec: any) => router.push(amcRecordHref(rec)),
    onOpenEdit: (rec: any) => router.push(amcRecordHref(rec, "/edit")),
    onOpenRenew: (rec: any) => setRenewRecord(rec),
    onOpenHistory: (id: string) => setHistoryRecordId(id),
    onDelete: (rec: any) => setDeleteCandidate(rec),
    hasPermission,
  };

  return (
    <AMCShell
      title={isSub ? "Subscriptions" : "AMC contracts"}
      breadcrumbs={[{ label: "AMC & Subscriptions", href: "/amc" }, { label: isSub ? "Subscriptions" : "AMC contracts" }]}
      counts={{ "/amc/contracts": amcCount, "/amc/subscriptions": subCount }}
      actions={
        <AppButton variant="outline" size="sm" onClick={fetchRecords} leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />} className="h-9 text-xs" aria-label="Refresh records">
          Refresh
        </AppButton>
      }
    >
      {ready && <RecordHighlighter />}
      {isSub ? <AMCSubscriptionsListTab {...listProps} /> : <AMCContractsListTab {...listProps} />}

      {renewRecord && (
        <AMCRenewalModal
          amcData={renewRecord}
          isLightMode={isLightMode}
          onClose={() => setRenewRecord(null)}
          onRenewed={async () => { setRenewRecord(null); await fetchRecords(); }}
        />
      )}

      {historyRecordId && (
        <AMCHistoryModal amcId={historyRecordId} onClose={() => setHistoryRecordId(null)} isLightMode={isLightMode} />
      )}

      {deleteCandidate && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-[var(--overlay)] animate-in fade-in duration-200">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-danger-soft p-2.5 text-danger-text">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Delete {isSub ? "subscription" : "contract"}?</h3>
            </div>
            <p className="text-sm text-foreground">
              <strong>{deleteCandidate.software_name}</strong> will be moved to deleted records.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <AppButton variant="outline" size="sm" onClick={() => setDeleteCandidate(null)} disabled={isDeleting}>Cancel</AppButton>
              <AppButton variant="destructive" size="sm" onClick={handleDeleteConfirm} disabled={isDeleting} className="font-semibold">
                {isDeleting ? "Deleting…" : "Delete"}
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </AMCShell>
  );
}
