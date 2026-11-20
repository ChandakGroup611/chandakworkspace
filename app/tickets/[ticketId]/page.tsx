"use client";
import { toast } from 'react-toastify';

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { TicketWorkspaceConsole } from "@/components/tickets/TicketWorkspaceConsole";
import { TicketRightPanel } from "@/components/tickets/TicketRightPanel";
import { fetchTicketDashboardData, fetchSingleTicketDetails } from "@/lib/actions/tickets";
import { usePermissions } from "@/hooks/usePermissions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppButton } from "@/components/ui/AppButton";
import { StatusBadge, PriorityIndicator, DateCell, UserCell } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback/States";
import ChandakLoader from "@/components/ui/ChandakLoader";
import DOMPurify from 'dompurify';

export default function TicketDetailsPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const router = useRouter();
  const { ticketId } = use(params);
  const { userId, hasPermission, roleCode, loading: permissionsLoading } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [ticketData, setTicketData] = useState<any>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  
  // Master Data
  const [departments, setDepartments] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [issueTypes, setIssueTypes] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Load the ticket first, then the masters of THIS ticket's scope, so the priority and status
      // lists show the names defined for its scope (IT Infrastructure / ERP / General).
      const foundTicket: any = await fetchSingleTicketDetails(ticketId);
      const data = await fetchTicketDashboardData(
        foundTicket?.scope_id ? { scope_id: foundTicket.scope_id } : undefined
      );

      setDepartments(data.departments || []);
      setPriorities(data.priorities || []);
      setStates(data.states || []);
      setCategories(data.categories || []);
      setSubcategories(data.subcategories || []);
      setIssueTypes(data.issueTypes || []);

      if (foundTicket && typeof foundTicket === 'object') {
        const custom = foundTicket.custom_fields || {};
        const mappedTicket = {
          ...foundTicket,
          dbId: foundTicket.id,
          id: foundTicket.code || `INC-${foundTicket.id.slice(0, 8)}`,
          priorityObj: (data.priorities || []).find((p: any) => p.id === foundTicket.priority_id) || foundTicket.priority,
          statusObj: (data.states || []).find((s: any) => s.id === foundTicket.status_id) || foundTicket.status,
          departmentObj: (data.departments || []).find((d: any) => d.id === foundTicket.department_id) || foundTicket.department,
          categoryObj: (data.categories || []).find((c: any) => c.id === custom.category_id),
          subcategoryObj: (data.subcategories || []).find((sc: any) => sc.id === custom.subcategory_id),
          issueTypeObj: (data.issueTypes || []).find((it: any) => it.id === custom.issue_type_id),
          assignedTo: foundTicket.assignee?.full_name || "",
          createdAt: foundTicket.created_at
        };
        setTicketData(mappedTicket);
        if (!isEditing) {
          setEditTitle(mappedTicket.title || "");
          setEditDescription(mappedTicket.description || "");
        }
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

  const handleSaveDetails = async () => {
    try {
      const { updateTicketDetails } = await import("@/lib/actions/tickets");
      await updateTicketDetails(ticketData.dbId, {
        title: editTitle,
        description: editDescription
      });
      setIsEditing(false);
      fetchData();
    } catch (err: any) {
      toast.error("Couldn't save the ticket: " + err.message);
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

  const isSuperAdmin = roleCode === "SUPER_ADMIN" || (hasPermission && hasPermission("SUPER_ADMIN"));
  const isTicketOwner = userId ? (ticketData.created_by === userId || ticketData.assigned_to === userId || ticketData.owner_id === userId) : false;
  const canEditTicket = isSuperAdmin || isTicketOwner || (hasPermission && (hasPermission("TICKETS_UPDATE") || hasPermission("TICKETS_MANAGE")));

  const label = "text-[12.5px] text-muted";

  return (
    <div className="flex h-full flex-col space-y-5 text-foreground">
      <Link href="/tickets" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-accent-soft-text hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to tickets
      </Link>
      <div className="space-y-5">
        <div className="grid items-stretch gap-5 xl:grid-cols-[1.8fr_1fr]">
          <div className="theme-card-structural p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12.5px] font-medium text-accent-soft-text">{ticketData.id}</span>
              <StatusBadge status={ticketData.statusObj?.name || null} />
              {canEditTicket && priorities.length > 0 ? (
                <select
                  aria-label="Ticket Priority"
                  value={ticketData.priority_id || ticketData.priorityObj?.id || ""}
                  onChange={async (e) => {
                    const newPrioId = e.target.value;
                    if (!newPrioId) return;
                    try {
                      const { updateTicketDetails } = await import("@/lib/actions/tickets");
                      await updateTicketDetails(ticketData.dbId, { priority_id: newPrioId });
                      toast.success("Ticket priority updated successfully.");
                      fetchData();
                    } catch (err: any) {
                      toast.error("Failed to update priority: " + err.message);
                    }
                  }}
                  className="h-7 rounded-md border border-border bg-surface px-2 text-[12px] font-medium text-foreground outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  {priorities.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.priority_name}
                    </option>
                  ))}
                </select>
              ) : (
                ticketData.priorityObj?.name && <PriorityIndicator priority={ticketData.priorityObj.name} className="text-[12.5px] text-subtle" />
              )}
              {canEditTicket && (
                <div className="ml-auto flex gap-2">
                  {!isEditing ? (
                    <AppButton variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                      Edit details
                    </AppButton>
                  ) : (
                    <>
                      <AppButton variant="ghost" size="sm" onClick={() => {
                        setIsEditing(false);
                        setEditTitle(ticketData.title || "");
                        setEditDescription(ticketData.description || "");
                      }}>
                        Cancel
                      </AppButton>
                      <AppButton variant="primary" size="sm" onClick={handleSaveDetails}>
                        Save changes
                      </AppButton>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="mt-3">
              {!isEditing ? (
                <h1 className="whitespace-normal break-words text-[20px] font-semibold leading-snug text-heading">{ticketData.title}</h1>
              ) : (
                <>
                  <label htmlFor="tk-title" className="mb-1.5 block text-[13px] font-medium text-subtle">Subject</label>
                  <input
                    id="tk-title"
                    className="h-9 w-full px-3 text-[14px]"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </>
              )}
            </div>

            <div className="mt-5">
              <div className="mb-1.5 text-[13px] font-medium text-subtle">Description</div>
              {!isEditing ? (
                <div
                  className="prose prose-sm w-full max-w-full rounded-md border border-border bg-sunken p-4 text-[13.5px] leading-relaxed text-foreground dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ticketData.description || "No description added.") }}
                />
              ) : (
                <textarea
                  aria-label="Description"
                  className="min-h-[140px] w-full resize-y p-3 text-[13.5px]"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              )}
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 md:grid-cols-4">
              <div>
                <dt className={label}>Department</dt>
                <dd className="mt-1 text-[13.5px] text-foreground">{ticketData.departmentObj?.name || "—"}</dd>
              </div>
              <div>
                <dt className={label}>Raised by</dt>
                <dd className="mt-1 text-[13.5px]"><UserCell name={ticketData.creator?.full_name || null} emptyLabel="—" /></dd>
              </div>
              <div>
                <dt className={label}>Raised on</dt>
                <dd className="mt-1 text-[13.5px]"><DateCell value={ticketData.createdAt} /></dd>
              </div>
              <div>
                <dt className={label}>Last updated</dt>
                <dd className="mt-1 text-[13.5px]"><DateCell value={ticketData.updated_at} /></dd>
              </div>
            </dl>
          </div>

          <div className="relative w-full h-full xl:h-auto">
            <div className="xl:absolute xl:inset-0 w-full h-full">
              <TicketRightPanel ticketId={ticketData.id} dbId={ticketData.dbId} />
            </div>
          </div>
        </div>

        <div className="w-full">
          <TicketWorkspaceConsole 
            ticket={ticketData}
            onUpdate={fetchData}
            departments={departments}
            priorities={priorities}
            states={states}
            categories={categories}
            subcategories={subcategories}
            issueTypes={issueTypes}
            currentUserId={userId}
          />
        </div>
      </div>
    </div>
  );
}
