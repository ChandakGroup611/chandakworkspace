"use client";

/**
 * Full-page record screens for AMC contracts and subscriptions (record standard):
 *   /amc/<section>/new        → create form, full page
 *   /amc/<section>/<id>       → record page (overview mirrors the create form + tabs)
 *   /amc/<section>/<id>/edit  → the same form as create, pre-filled, full page
 * After a create the user lands on the register with the new record highlighted;
 * after an edit, back on the record page.
 */
import React, { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { EmptyState } from "@/components/ui/feedback/States";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { recordCreatedHref } from "@/components/ui/record";
import { AMCContractModal } from "./AMCContractModal";
import { SubscriptionContractModal } from "./SubscriptionContractModal";
import { ContractDetailDrawer } from "./ContractDetailDrawer";
import { AMCShell } from "./AMCShell";
import { useAMCData, amcRecordHref } from "./useAMCData";

type Kind = "amc" | "subscription";
const sectionOf = (kind: Kind) => (kind === "subscription" ? "/amc/subscriptions" : "/amc/contracts");
const labelOf = (kind: Kind) => (kind === "subscription" ? "Subscriptions" : "AMC contracts");

function Loading() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <ChandakLoader size="lg" title="Loading…" />
    </div>
  );
}

function NotFound({ kind }: { kind: Kind }) {
  return (
    <div className="theme-card-structural mx-auto max-w-lg">
      <EmptyState
        kind="no-results"
        title="Record not found"
        description="It may have been deleted, or you may not have access to it."
        action={<Link href={sectionOf(kind)} className="text-[13px] font-medium text-accent-soft-text hover:underline">Back to {labelOf(kind).toLowerCase()}</Link>}
      />
    </div>
  );
}

/** Create (no id) or edit (id) as a full page. */
export function AMCRecordFormPage({ kind, id }: { kind: Kind; id?: string }) {
  const router = useRouter();
  const { records, vendors, departments, users, loading } = useAMCData();
  const navigated = useRef(false);
  const section = sectionOf(kind);
  const record = id ? records.find((r) => r.id === id) : null;

  // The form calls onSaved(id) and then onClose(); only the first navigation counts.
  const go = (href: string) => {
    if (navigated.current) return;
    navigated.current = true;
    router.push(href);
    router.refresh();
  };
  const onSaved = (newId?: string) => {
    if (id && record) go(amcRecordHref(record));
    else if (newId) go(recordCreatedHref(section, newId));
    else go(section);
  };
  const onClose = () => go(id && record ? amcRecordHref(record) : section);

  const title = id ? `Edit ${kind === "subscription" ? "subscription" : "AMC contract"}` : `New ${kind === "subscription" ? "subscription" : "AMC contract"}`;
  const crumbs = [
    { label: "AMC & Subscriptions", href: "/amc" },
    { label: labelOf(kind), href: section },
    ...(record ? [{ label: record.software_name || "Record", href: amcRecordHref(record) }] : []),
    { label: id ? "Edit" : "New" },
  ];

  let body: React.ReactNode;
  if (loading) body = <Loading />;
  else if (id && !record) body = <NotFound kind={kind} />;
  else {
    const common = { variant: "page" as const, isOpen: true, onClose, onSaved, initialRecord: record || null, vendors, departments, users };
    body = kind === "subscription" ? <SubscriptionContractModal {...common} /> : <AMCContractModal {...common} />;
  }

  return (
    <AMCShell title={title} breadcrumbs={crumbs} showNew={false} showNav={false} strict={false}>
      {body}
    </AMCShell>
  );
}

/** Record page: overview (mirrors the create form) + renewals, payments, history… tabs. */
export function AMCRecordViewPage({ kind, id }: { kind: Kind; id: string }) {
  const router = useRouter();
  let isLightMode = false;
  try { isLightMode = useTheme().isLight; } catch {}
  const { records, loading, fetchRecords } = useAMCData();
  const record = records.find((r) => r.id === id);
  const section = sectionOf(kind);

  return (
    <AMCShell
      title={record?.software_name || labelOf(kind)}
      breadcrumbs={[{ label: "AMC & Subscriptions", href: "/amc" }, { label: labelOf(kind), href: section }, { label: record?.software_name || "Record" }]}
      showNew={false}
      showNav={false}
      strict={false}
      actions={
        <Link href={section} className="inline-flex h-9 items-center gap-1.5 text-[13px] font-medium text-accent-soft-text hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to {labelOf(kind).toLowerCase()}
        </Link>
      }
    >
      {loading ? (
        <Loading />
      ) : !record ? (
        <NotFound kind={kind} />
      ) : (
        <ContractDetailDrawer
          variant="page"
          record={record}
          isOpen
          onClose={() => router.push(section)}
          onRefresh={fetchRecords}
          onOpenEditForm={(rec: any) => router.push(amcRecordHref(rec, "/edit"))}
          isLightMode={isLightMode}
        />
      )}
    </AMCShell>
  );
}
