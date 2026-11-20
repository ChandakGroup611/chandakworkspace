"use client";

import React, { useState, useEffect, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { TicketWorkspaceConsole } from "@/components/tickets/TicketWorkspaceConsole";
import { TicketCreationWizard } from "@/components/tickets/TicketCreationWizard";
import { AppButton } from "@/components/ui/AppButton";
import { Plus, RefreshCw, CheckCircle2, Database, Loader2, ArrowLeft, Search, Filter } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { fetchTicketDashboardData } from "@/lib/actions/tickets";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppTable, AppTableBody, AppTableCell, AppTableContainer, AppTableHead, AppTableHeader, AppTableRow } from "@/components/ui/AppTable";
import { AppBadge } from "@/components/ui/AppBadge";
import { StatusBadge, PriorityIndicator, DateCell, UserCell, StatTile, StatTileRow, statusTone } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback/States";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><ChandakLoader size="lg" title="Loading tickets…" /></div>}>
      <TicketsPageContent />
    </Suspense>
  );
}

function TicketsPageContent() {
  const router = useRouter();
  const supabase = createClient();
  const { isLight: isLightMode } = useTheme();
  const { hasPermission, roleCode, userId, loading: permissionsLoading } = usePermissions();
  
  // Master Data
  const [departments, setDepartments] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [issueTypes, setIssueTypes] = useState<any[]>([]);
  const [scopesList, setScopesList] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScope, setSelectedScope] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [showWizard, setShowWizard] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get("create") === "true") {
      setShowWizard(true);
    }
  }, [searchParams]);

  // Transition States for Drawer (Removed)

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("searchQuery", searchQuery);
      if (selectedStatus && selectedStatus !== "ALL") params.set("status_id", selectedStatus);
      if (selectedPriority && selectedPriority !== "ALL") params.set("priority_id", selectedPriority);
      if (selectedScope && selectedScope !== "ALL") params.set("scope_id", selectedScope);

      let data: any = null;
      try {
        const res = await fetch(`/api/tickets${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" });
        if (res.ok) {
          data = await res.json();
        }
      } catch {}

      if (!data) {
        data = await fetchTicketDashboardData({
          searchQuery: searchQuery || undefined,
          status_id: selectedStatus,
          priority_id: selectedPriority,
          scope_id: selectedScope
        });
      }

      const finalTicketData = data?.tickets || [];
      const activeDepts = data?.departments || [];
      const activePrios = data?.priorities || [];
      const activeStates = data?.states || [];
      const activeCats = data?.categories || [];
      const activeSubcats = data?.subcategories || [];
      const activeTypes = data?.issueTypes || [];
      const activeScopes = data?.scopes || [];

      setDepartments(activeDepts);
      setPriorities(activePrios);
      setStates(activeStates);
      setCategories(activeCats);
      setSubcategories(activeSubcats);
      setIssueTypes(activeTypes);
      
      // Map scopes for the list filter pills (requires id and name properties)
      setScopesList(activeScopes.map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code
      })));
      
      const mappedTickets = (finalTicketData || []).map((t: any) => {
        const custom = t.custom_fields || {};
        return {
          ...t,
          dbId: t.id,
          id: t.code || `INC-${t.id.slice(0, 8)}`,
          priorityObj: activePrios.find((p: any) => p.id === t.priority_id),
          statusObj: activeStates.find((s: any) => s.id === t.status_id),
          departmentObj: activeDepts.find((d: any) => d.id === t.department_id),
          categoryObj: activeCats.find((c: any) => c.id === custom.category_id),
          subcategoryObj: activeSubcats.find((sc: any) => sc.id === custom.subcategory_id),
          issueTypeObj: activeTypes.find((it: any) => it.id === custom.issue_type_id),
          assignedTo: t.assignee?.full_name || "",
          createdAt: t.created_at
        };
      });

      setTickets(mappedTickets);

    } catch (err) {
      console.error("Critical recovery during ticket hydration:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, selectedScope, selectedStatus, selectedPriority]);

  const handleTicketClick = (ticket: any) => {
    router.push(`/tickets/${ticket.dbId}`);
  };

  const getPriorityColor = (code: string | undefined) => {
    if (!code) return "bg-sunken text-muted";
    if (code.includes("CRITICAL") || code === "PRIO_CRIT_P1" || code === "P1") return "bg-danger text-primary-foreground";
    if (code.includes("HIGH") || code === "PRIO_HIGH_P2" || code === "P2") return "bg-warning text-primary-foreground";
    if (code.includes("MEDIUM") || code === "PRIO_MED_P3" || code === "P3") return "bg-primary text-primary-foreground";
    return "bg-success text-primary-foreground";
  };

  // End User Role Visibility: Can only see their own created or assigned tickets is handled on the server side using the existing getVisibleTickets logic, but we still apply it here just in case, though the DB already enforces it. Actually, wait. The DB filters for ends users as well? Yes, getVisibleTickets handles user isolation. So we can just use tickets directly.
  const filteredTickets = tickets;

  const SEG_ON = "bg-surface text-foreground font-semibold shadow-sm";
  const SEG_OFF = "text-muted hover:text-foreground";
  const SEG_BTN = "inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors";
  const toneCount = (tone: string) => tickets.filter((t) => statusTone(t.statusObj?.name) === tone).length;
  const filtersActive = !!searchQuery || selectedStatus !== "ALL" || selectedPriority !== "ALL" || selectedScope !== "ALL";

  if (!mounted || permissionsLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-foreground">
        <ChandakLoader size="lg" title="Loading tickets…" />
      </div>
    );
  }

  if (!hasPermission("TICKETS_VIEW")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-3 text-center text-foreground">
        <div className="rounded-full bg-warning-soft p-3 text-warning-text">
          <Database className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="text-[15px] font-semibold text-heading">You don't have access to tickets</h2>
        <p className="text-[13px] text-muted">Ask your administrator to grant Tickets view access in RBAC access policies.</p>
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Tickets"
        description="Support and operations requests raised across Chandak Group"
        actions={
          <>
            <AppButton
              variant="ghost"
              onClick={() => window.open("/masters?scope=ERP_SOFTWARE", "_blank")}
              leftIcon={<Database className="h-4 w-4" />}
              title="Open the ticket categories and scopes master in a new tab"
            >
              Categories
            </AppButton>
            <AppButton
              variant="ghost"
              size="icon"
              onClick={() => fetchData()}
              aria-label="Refresh tickets"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </AppButton>
            {hasPermission("TICKETS_CREATE") && (
              <AppButton
                variant="primary"
                onClick={() => setShowWizard(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                New ticket
              </AppButton>
            )}
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <StatTileRow>
          <StatTile label="Total" value={tickets.length} tone="neutral" />
          <StatTile label="Open" value={toneCount("info")} tone="info" />
          <StatTile label="In progress" value={toneCount("accent") + toneCount("warning")} tone="accent" />
          <StatTile label="Resolved" value={toneCount("success")} tone="success" />
        </StatTileRow>

        {/* Toolbar: search, status, priority, scope */}
        <div className="theme-card-structural flex flex-col gap-3 p-3">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                aria-label="Search tickets"
                placeholder="Search by ticket code or title"
                className="h-9 w-full pl-9 pr-3 text-[13.5px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="tk-status">Status</label>
              <select id="tk-status" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="h-9 min-w-0 flex-1 px-3 text-[13.5px] sm:flex-initial">
                <option value="ALL">All statuses</option>
                {states.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <label className="sr-only" htmlFor="tk-priority">Priority</label>
              <select id="tk-priority" value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className="h-9 min-w-0 flex-1 px-3 text-[13.5px] sm:flex-initial">
                <option value="ALL">All priorities</option>
                {priorities.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {filtersActive && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setSelectedStatus("ALL"); setSelectedPriority("ALL"); setSelectedScope("ALL"); }}
                className="text-[12.5px] font-medium text-accent-soft-text hover:underline sm:ml-auto"
              >
                Clear filters
              </button>
            )}
          </div>

          {scopesList.length > 0 && (
            <div className="flex items-center gap-2 border-t border-border pt-3">
              <span className="theme-label shrink-0">Scope</span>
              <div className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-border bg-sunken p-0.5 no-scrollbar" role="radiogroup" aria-label="Scope">
                <button type="button" role="radio" aria-checked={selectedScope === "ALL"} onClick={() => setSelectedScope("ALL")} className={cn(SEG_BTN, selectedScope === "ALL" ? SEG_ON : SEG_OFF)}>
                  All scopes
                </button>
                {scopesList.map(scope => (
                  <button key={scope.id} type="button" role="radio" aria-checked={selectedScope === scope.id} onClick={() => setSelectedScope(scope.id)} className={cn(SEG_BTN, selectedScope === scope.id ? SEG_ON : SEG_OFF)}>
                    {scope.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && tickets.length === 0 ? (
            <div className="theme-card-structural flex h-64 items-center justify-center">
              <ChandakLoader size="md" title="Loading tickets…" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="theme-card-structural">
              <EmptyState
                kind={filtersActive ? "no-results" : "empty"}
                title={filtersActive ? "No tickets match these filters" : "No tickets yet"}
                description={filtersActive ? "Clear filters or try a different ticket code." : "Raise a ticket when something needs the IT or operations team."}
                action={!filtersActive && hasPermission("TICKETS_CREATE") ? (
                  <AppButton variant="secondary" onClick={() => setShowWizard(true)} leftIcon={<Plus className="h-4 w-4" />}>New ticket</AppButton>
                ) : undefined}
              />
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <ul className="space-y-2 lg:hidden">
                {filteredTickets.map((ticket) => (
                  <li key={ticket.dbId}>
                    <button
                      type="button"
                      onClick={() => handleTicketClick(ticket)}
                      className="theme-card-structural w-full space-y-2 p-4 text-left transition-[border-color,box-shadow] hover:border-border-active hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[12.5px] font-medium text-accent-soft-text">{ticket.id}</span>
                        <StatusBadge status={ticket.statusObj?.name || null} size="sm" />
                      </div>
                      <div className="line-clamp-2 text-[14px] font-semibold text-foreground">{ticket.title}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                        <PriorityIndicator priority={ticket.priorityObj?.name} className="text-[12.5px]" />
                        {ticket.departmentObj?.name && <span className="truncate">{ticket.departmentObj.name}</span>}
                        <DateCell value={ticket.createdAt} className="ml-auto" />
                      </div>
                      <div className="border-t border-border pt-2 text-[12.5px]">
                        <UserCell name={ticket.assignedTo || null} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="hidden lg:block">
                <AppTableContainer>
                  <AppTable>
                    <AppTableHeader>
                      <AppTableRow>
                        <AppTableHead>Ticket</AppTableHead>
                        <AppTableHead>Title</AppTableHead>
                        <AppTableHead>Priority</AppTableHead>
                        <AppTableHead>Status</AppTableHead>
                        <AppTableHead>Department</AppTableHead>
                        <AppTableHead>Assignee</AppTableHead>
                        <AppTableHead>Created</AppTableHead>
                        <AppTableHead className="text-right">Actions</AppTableHead>
                      </AppTableRow>
                    </AppTableHeader>
                    <AppTableBody>
                      {filteredTickets.map((ticket) => (
                        <AppTableRow key={ticket.dbId} onClick={() => handleTicketClick(ticket)} className="cursor-pointer">
                          <AppTableCell className="whitespace-nowrap font-mono text-[12.5px] font-medium text-accent-soft-text">{ticket.id}</AppTableCell>
                          <AppTableCell className="max-w-xs truncate font-medium text-foreground" title={ticket.title}>{ticket.title}</AppTableCell>
                          <AppTableCell><PriorityIndicator priority={ticket.priorityObj?.name} /></AppTableCell>
                          <AppTableCell><StatusBadge status={ticket.statusObj?.name || null} /></AppTableCell>
                          <AppTableCell className="text-subtle">{ticket.departmentObj?.name || "—"}</AppTableCell>
                          <AppTableCell><UserCell name={ticket.assignedTo || null} /></AppTableCell>
                          <AppTableCell className="whitespace-nowrap"><DateCell value={ticket.createdAt} /></AppTableCell>
                          <AppTableCell className="text-right">
                            <button
                              type="button"
                              aria-label={`Open ${ticket.id}`}
                              title="Open ticket"
                              onClick={(e) => { e.stopPropagation(); handleTicketClick(ticket); }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-foreground"
                            >
                              <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden />
                            </button>
                          </AppTableCell>
                        </AppTableRow>
                      ))}
                    </AppTableBody>
                  </AppTable>
                </AppTableContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {showWizard && (
        <TicketCreationWizard
          onClose={() => setShowWizard(false)}
          onSuccess={(id) => {
            setShowWizard(false);
            if (id.includes("-REQ-")) {
              router.push("/requirements");
            } else {
              fetchData();
              setToastMessage(`Ticket ${id} created`);
            }
          }}
        />
      )}

      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 z-[var(--z-toast)] flex items-center gap-2 rounded-[10px] border border-border border-l-[3px] border-l-success bg-elevated px-4 py-3 text-[13.5px] text-foreground shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
          {toastMessage}
        </div>
      )}
    </PageContainer>
  );
}
