"use client";
import { toast } from 'react-toastify';

import React, { useState, useEffect, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TicketWorkspaceConsole } from "@/components/tickets/TicketWorkspaceConsole";
import { TicketRecordForm, scopeCodeOf } from "@/components/tickets/TicketRecordForm";
import { fetchTicketDashboardData, fetchSingleTicketDetails } from "@/lib/actions/tickets";
import { usePermissions } from "@/hooks/usePermissions";
import { ArrowLeft, Pencil, ShieldAlert, Eye } from "lucide-react";
import Link from "next/link";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { StatusBadge, PriorityIndicator } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback/States";
import ChandakLoader from "@/components/ui/ChandakLoader";
import DOMPurify from 'dompurify';

export default function TicketDetailsPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = use(params);
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><ChandakLoader size="lg" title="Loading ticket…" /></div>}>
      <TicketDetailsContent ticketId={ticketId} />
    </Suspense>
  );
}

function TicketDetailsContent({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isViewMode = searchParams?.get("mode") === "view";
  // ?mode=edit opens the ticket's own form (the one it was raised with) straight in edit mode.
  const openFormInEdit = searchParams?.get("mode") === "edit";
  const { userId, hasPermission, roleCode, loading: permissionsLoading } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [ticketData, setTicketData] = useState<any>(null);

  // Inline editing (same behaviour as the Task page: click the pencil, edit, save)
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  // Master Data
  const [departments, setDepartments] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [issueTypes, setIssueTypes] = useState<any[]>([]);
  const [scopeName, setScopeName] = useState("");
  const [scopeRow, setScopeRow] = useState<any>(null);

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      // Load the ticket first, then the masters of THIS ticket's scope, so the priority and status
      // lists show the names defined for its scope (IT Infrastructure / ERP / General).
      const foundTicket: any = await fetchSingleTicketDetails(ticketId);
      const data: any = await fetchTicketDashboardData(
        foundTicket?.scope_type ? { scope_type: foundTicket.scope_type } : undefined
      );

      setDepartments(data.departments || []);
      setPriorities(data.priorities || []);
      setStates(data.states || []);
      setCategories(data.categories || []);
      setSubcategories(data.subcategories || []);
      setIssueTypes(data.issueTypes || []);

      if (foundTicket && typeof foundTicket === 'object') {
        const scopeCode = String(foundTicket.scope_type || "").toUpperCase() === "ERP/SOFTWARE" ? "ERP" : String(foundTicket.scope_type || "").toUpperCase();
        const scope = (data.scopes || []).find((s: any) => String(s.code || "").toUpperCase() === scopeCode);
        setScopeName(scope?.name || foundTicket.scope_type || "");
        setScopeRow(scope || null);

        const custom = foundTicket.custom_fields || {};
        const mappedTicket = {
          ...foundTicket,
          dbId: foundTicket.id,
          id: foundTicket.code || `INC-${foundTicket.id.slice(0, 8)}`,
          priorityObj: (data.priorities || []).find((p: any) => p.id === foundTicket.priority_id) ||
            (foundTicket.priority ? { id: foundTicket.priority_id, name: foundTicket.priority.priority_name } : undefined),
          statusObj: (data.states || []).find((s: any) => s.id === foundTicket.status_id) ||
            (foundTicket.status ? { id: foundTicket.status_id, name: foundTicket.status.status_name, is_terminal: foundTicket.status.is_terminal } : undefined),
          departmentObj: (data.departments || []).find((d: any) => d.id === foundTicket.department_id) || foundTicket.department,
          categoryObj: (data.categories || []).find((c: any) => c.id === custom.category_id),
          subcategoryObj: (data.subcategories || []).find((sc: any) => sc.id === custom.subcategory_id),
          issueTypeObj: (data.issueTypes || []).find((it: any) => it.id === custom.issue_type_id),
          assignedTo: foundTicket.assignee?.full_name || "",
          createdAt: foundTicket.created_at
        };
        setTicketData(mappedTicket);
        if (!editingTitle) setEditTitle(mappedTicket.title || "");
        if (!editingDescription) setEditDescription(mappedTicket.description || "");
      } else {
        setTicketData(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [ticketId]);

  const saveDetails = async (fields: { title?: string; description?: string }) => {
    if (fields.title !== undefined && !fields.title.trim()) {
      toast.warning("The subject can't be empty.");
      return;
    }
    setSavingDetails(true);
    try {
      const { updateTicketDetails } = await import("@/lib/actions/tickets");
      const res: any = await updateTicketDetails(ticketData.dbId, fields);
      if (res?.error || res?.success === false) throw new Error(res?.error || "Failed to save ticket details");
      setEditingTitle(false);
      setEditingDescription(false);
      toast.success("Ticket saved.");
      fetchData(false);
    } catch (err: any) {
      toast.error("Couldn't save the ticket: " + (err?.message || "unknown error"));
    } finally {
      setSavingDetails(false);
    }
  };

  if (loading || permissionsLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-foreground">
        <ChandakLoader size="lg" title="Loading ticket…" />
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div className="theme-card-structural mx-auto mt-10 max-w-lg">
        <EmptyState
          kind="no-results"
          title="We couldn't find that ticket"
          description="It may have been deleted, or you may not have access to it."
          action={<AppButton variant="secondary" onClick={() => router.push("/tickets")} leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to tickets</AppButton>}
        />
      </div>
    );
  }

  const fromReports = searchParams?.get("from") === "reports";
  const isSuperAdmin = roleCode === "SUPER_ADMIN" || (hasPermission && hasPermission("SUPER_ADMIN"));
  const isTicketOwner = userId
    ? (ticketData.creator_id === userId || ticketData.assignee_id === userId || ticketData.queue_owner_id === userId)
    : false;
  const canEditTicket = !isViewMode && (isSuperAdmin || isTicketOwner || (hasPermission && (hasPermission("TICKETS_UPDATE") || hasPermission("TICKETS_MANAGE"))));
  // Record standard: show the ticket in the form it was raised with. Inline title/description
  // editing stays only as a fallback for tickets whose scope has no form.
  const hasRecordForm = Boolean(scopeRow?.id && scopeCodeOf(ticketData));
  const inlineEdit = canEditTicket && !hasRecordForm;

  return (
    <div className="space-y-5 pb-6 pt-2 text-foreground">
      {/* Header — same structure as the Task page */}
      <header className="flex flex-col gap-3 border-b border-border pb-4">
        <nav aria-label="Ticket navigation" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[13px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {fromReports ? (
              <>
                <AppButton
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/tickets/reports")}
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                  Back to Reports
                </AppButton>
                <span aria-hidden className="text-muted">/</span>
                <Link href="/tickets/reports" className="font-semibold text-primary transition-colors hover:underline">
                  Ticket reports
                </Link>
                <span aria-hidden className="text-muted">/</span>
                <span className="font-mono text-muted">{ticketData.id}</span>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => (window.history.length > 1 ? router.back() : router.push("/tickets"))}
                  className="inline-flex items-center gap-1.5 font-medium text-accent-soft-text hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back
                </button>
                <span aria-hidden className="text-muted">/</span>
                <Link href="/tickets" className="font-medium text-muted transition-colors hover:text-foreground">All tickets</Link>
                <span aria-hidden className="text-muted">/</span>
                <Link href="/tickets/reports" className="font-medium text-muted transition-colors hover:text-foreground">Reports and analytics</Link>
              </>
            )}
          </div>
          {fromReports && (
            <Link href="/tickets" className="text-xs text-muted hover:text-foreground">
              All tickets list →
            </Link>
          )}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[12.5px] font-medium text-accent-soft-text">{ticketData.id}</span>
          <StatusBadge status={ticketData.statusObj?.name || null} />
          {ticketData.priorityObj?.name && <PriorityIndicator priority={ticketData.priorityObj.name} className="text-[12.5px] text-subtle" />}
          <span className="text-[12.5px] text-muted">
            {scopeName ? `${scopeName} · ` : ""}{ticketData.departmentObj?.name || "No department"}
          </span>
          {isViewMode && (
            <Link
              href={`/tickets/${ticketData.dbId}`}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[12.5px] font-medium text-foreground hover:bg-surface-hover"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Switch to edit
            </Link>
          )}
        </div>

        <div>
          {editingTitle ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="tk-title" className="sr-only">Subject</label>
              <input
                id="tk-title"
                autoFocus
                className="h-10 flex-1 rounded-md border border-border bg-surface px-3 text-[16px] font-semibold text-heading outline-none focus:ring-2 focus:ring-ring"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveDetails({ title: editTitle.trim() });
                  if (e.key === "Escape") { setEditingTitle(false); setEditTitle(ticketData.title || ""); }
                }}
              />
              <div className="flex gap-2">
                <AppButton variant="ghost" size="sm" disabled={savingDetails} onClick={() => { setEditingTitle(false); setEditTitle(ticketData.title || ""); }}>Cancel</AppButton>
                <AppButton variant="primary" size="sm" disabled={savingDetails} onClick={() => saveDetails({ title: editTitle.trim() })}>
                  {savingDetails ? "Saving…" : "Save"}
                </AppButton>
              </div>
            </div>
          ) : (
            <div className="group flex items-start gap-2">
              <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading w-full whitespace-normal break-words leading-snug">{ticketData.title}</h1>
              {inlineEdit && (
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  aria-label="Edit subject"
                  title="Edit subject"
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {hasRecordForm ? (
        <TicketRecordForm
          ticket={{ ...ticketData, id: ticketData.dbId, code: ticketData.id }}
          scope={scopeRow}
          canEdit={canEditTicket}
          initialMode={openFormInEdit ? "edit" : "view"}
          onSaved={() => fetchData(false)}
        />
      ) : (
      /* Description (fallback when the ticket's scope has no form) */
      <AppCard className="space-y-3 border border-border bg-surface p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-subtle">Description</h2>
          {inlineEdit && !editingDescription && (
            <AppButton variant="ghost" size="sm" onClick={() => setEditingDescription(true)} leftIcon={<Pencil className="h-3.5 w-3.5" />}>
              Edit
            </AppButton>
          )}
        </div>
        {editingDescription ? (
          <div className="space-y-2">
            <textarea
              aria-label="Description"
              autoFocus
              className="min-h-[140px] w-full resize-y rounded-md border border-border bg-surface p-3 text-[13.5px] text-foreground outline-none focus:ring-2 focus:ring-ring"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <AppButton variant="ghost" size="sm" disabled={savingDetails} onClick={() => { setEditingDescription(false); setEditDescription(ticketData.description || ""); }}>Cancel</AppButton>
              <AppButton variant="primary" size="sm" disabled={savingDetails} onClick={() => saveDetails({ description: editDescription })}>
                {savingDetails ? "Saving…" : "Save description"}
              </AppButton>
            </div>
          </div>
        ) : (
          <div
            className="prose prose-sm w-full max-w-full text-[13.5px] leading-relaxed text-foreground dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticketData.description || "<span class='text-muted'>No description added.</span>") }}
          />
        )}
      </AppCard>
      )}

      {isViewMode && (
        <div role="status" className="flex items-start gap-3 rounded-md border border-border bg-sunken p-3 text-[13px] text-subtle">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          You are viewing this ticket in read-only mode.
        </div>
      )}
      {!isViewMode && !canEditTicket && (
        <div role="status" className="flex items-start gap-3 rounded-md border border-warning-border bg-warning-soft p-3 text-[13px] text-warning-text">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Only the creator, the assignee, a ticket manager or a super admin can change this ticket.
        </div>
      )}

      <TicketWorkspaceConsole
        ticket={ticketData}
        onUpdate={() => fetchData(false)}
        departments={departments}
        priorities={priorities}
        states={states}
        categories={categories}
        subcategories={subcategories}
        issueTypes={issueTypes}
        currentUserId={userId}
        readOnly={isViewMode}
      />
    </div>
  );
}
