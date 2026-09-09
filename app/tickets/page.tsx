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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><ChandakLoader size="lg" title="Loading Tickets..." /></div>}>
      <TicketsPageContent />
    </Suspense>
  );
}

function TicketsPageContent() {
  const router = useRouter();
  const supabase = createClient();
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);
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
      const data = await fetchTicketDashboardData({
        searchQuery: searchQuery || undefined,
        status_id: selectedStatus,
        priority_id: selectedPriority,
        scope_id: selectedScope
      });

      const finalTicketData = data.tickets || [];
      const activeDepts = data.departments || [];
      const activePrios = data.priorities || [];
      const activeStates = data.states || [];
      const activeCats = data.categories || [];
      const activeSubcats = data.subcategories || [];
      const activeTypes = data.issueTypes || [];
      const activeScopes = data.scopes || [];

      setDepartments(activeDepts);
      setPriorities(activePrios);
      setStates(activeStates);
      setCategories(activeCats);
      setSubcategories(activeSubcats);
      setIssueTypes(activeTypes);
      
      // Map scopes for the list filter pills (requires id and name properties)
      setScopesList(activeScopes.map(s => ({
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
          priorityObj: activePrios.find(p => p.id === t.priority_id),
          statusObj: activeStates.find(s => s.id === t.status_id),
          departmentObj: activeDepts.find(d => d.id === t.department_id),
          categoryObj: activeCats.find(c => c.id === custom.category_id),
          subcategoryObj: activeSubcats.find(sc => sc.id === custom.subcategory_id),
          issueTypeObj: activeTypes.find(it => it.id === custom.issue_type_id),
          assignedTo: t.assignee?.full_name || "Unassigned Operations Swarm",
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
    if (!code) return "bg-gray-500";
    if (code.includes("CRITICAL") || code === "PRIO_CRIT_P1" || code === "P1") return "bg-danger text-white";
    if (code.includes("HIGH") || code === "PRIO_HIGH_P2" || code === "P2") return "bg-warning text-white";
    if (code.includes("MEDIUM") || code === "PRIO_MED_P3" || code === "P3") return "bg-theme-btn-primary text-white";
    return "bg-success text-white";
  };

  // End User Role Visibility: Can only see their own created or assigned tickets is handled on the server side using the existing getVisibleTickets logic, but we still apply it here just in case, though the DB already enforces it. Actually, wait. The DB filters for ends users as well? Yes, getVisibleTickets handles user isolation. So we can just use tickets directly.
  const filteredTickets = tickets;

  if (!mounted || permissionsLoading) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center transition-colors duration-300 bg-surface text-foreground`}>
        <ChandakLoader
          size="lg"
          title="Verifying Capabilities..."
          subtitle="Loading enterprise ticketing system"
        />
      </div>
    );
  }

  if (!hasPermission("TICKETS_VIEW")) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 bg-surface text-foreground`}>
        <div className="p-4 rounded-full bg-danger/10 border border-rose-500/20 text-danger">
          <Database className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-xs text-muted">You do not have capabilities to view Operations Tickets.</p>
      </div>
    );
  }

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="Operations Control Center"
        icon={<Database className="h-6 w-6" />}
        children={
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className={`text-[0.65rem] font-bold uppercase tracking-widest text-muted`}>Live Node: Chandak Workspace-ENTERPRISE-01</span>
            </div>
            <div className={`h-4 w-px bg-elevated`} />
            <div className="flex items-center gap-4 text-xs">
              <span className="font-semibold text-muted uppercase tracking-wide">Active: <span className="text-foreground dark:text-white">{tickets.length}</span></span>
              <span className="font-semibold text-success uppercase tracking-wide">SLA Stability: 98.4%</span>
            </div>
          </div>
        }
        actions={
          <>
            <AppButton variant="outline" size="sm" onClick={() => router.push("/")} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </AppButton>
            <AppButton 
              variant="outline" 
              size="sm" 
              onClick={() => window.open("/masters?scope=ERP_SOFTWARE", "_blank")}
              leftIcon={<Database className="h-4 w-4" />}
            >
              Registry
            </AppButton>
            <AppButton 
              variant="outline" 
              size="sm" 
              onClick={() => fetchData()}
              leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />}
            >
              Sync
            </AppButton>
            {hasPermission("TICKETS_CREATE") && (
              <AppButton 
                variant="primary" 
                size="sm" 
                onClick={() => setShowWizard(true)}
                leftIcon={<Plus className="h-4 w-4" />}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold tracking-wide shadow-[0_0_15px_rgba(99,102,241,0.3)] border-none transition-all hover:scale-105"
              >
                Initialize Ticket
              </AppButton>
            )}
          </>
        }
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden gap-4 sm:gap-6 p-3 sm:p-6">
        {/* Filters Top Bar */}
        <div className={`p-3 sm:p-4 space-y-3 sm:space-y-4 rounded-xl ${
          "theme-card-structural"
        }`}>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input 
                type="text"
                placeholder="Search tickets by ID or title..."
                className={`w-full h-10 pl-10 pr-4 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 ${
                  "bg-elevated border-border text-foreground placeholder:text-muted"
                }`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted hidden md:inline shrink-0">Status:</span>
              <select 
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className={`flex-1 sm:flex-initial min-w-0 h-9 pl-2.5 pr-6 sm:pr-8 rounded-lg text-xs sm:text-sm border outline-none cursor-pointer truncate ${
                  "bg-surface border-border"
                }`}
              >
                <option value="ALL">All Statuses</option>
                {states.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select 
                value={selectedPriority}
                onChange={e => setSelectedPriority(e.target.value)}
                className={`flex-1 sm:flex-initial min-w-0 h-9 pl-2.5 pr-6 sm:pr-8 rounded-lg text-xs sm:text-sm border outline-none cursor-pointer truncate ${
                  "bg-surface border-border"
                }`}
              >
                <option value="ALL">All Priorities</option>
                {priorities.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pt-2 pb-1 border-t border-border no-scrollbar w-full">
            <AppButton 
              onClick={() => setSelectedScope("ALL")}
              variant={selectedScope === "ALL" ? "primary" : "ghost"}
              size="sm"
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                selectedScope === "ALL" 
                  ? "bg-theme-btn-primary text-white hover:bg-theme-btn-primary-secondary" 
                  : ""
              }`}
            >
              All Scopes
            </AppButton>
            {scopesList.map(scope => (
              <AppButton 
                key={scope.id}
                onClick={() => setSelectedScope(scope.id)}
                variant={selectedScope === scope.id ? "primary" : "ghost"}
                size="sm"
                className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                  selectedScope === scope.id 
                    ? "bg-theme-btn-primary text-white hover:bg-theme-btn-primary-secondary" 
                    : ""
                }`}
              >
                {scope.name}
              </AppButton>
            ))}
          </div>
        </div>

        {/* Data Container: Mobile Cards (<1024px) + Desktop Table (>=1024px) */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading && tickets.length === 0 ? (
            <div className="flex-1 h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-theme-icon" />
            </div>
          ) : (
            <>
              {/* Mobile Card List (<1024px) */}
              <div className="block lg:hidden space-y-3">
                {filteredTickets.length === 0 ? (
                  <div className="text-center py-12 text-muted text-sm border border-dashed border-border rounded-xl bg-surface/50 animate-in fade-in duration-300">
                    No tickets found matching your criteria.
                  </div>
                ) : (
                  filteredTickets.map((ticket, index) => {
                    const isCritical = ticket.priorityObj?.code?.includes("CRITICAL") || ticket.priorityObj?.code === "PRIO_CRIT_P1" || ticket.priorityObj?.code === "P1";
                    const isUrgent = isCritical || ticket.priorityObj?.code?.includes("HIGH") || ticket.priorityObj?.code === "P2";
                    const staggerClass = index < 8 ? `delay-${index + 1}` : "";

                    return (
                      <div 
                        key={ticket.dbId}
                        onClick={() => handleTicketClick(ticket)}
                        className={`rounded-2xl border border-border/70 bg-surface/90 p-4 shadow-xs hover:border-theme-btn-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer space-y-3 relative active:scale-[0.99] animate-stagger-in ${staggerClass}`}
                      >
                        {/* Top Row: Code, Priority, Status */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-theme-icon bg-theme-btn-primary/10 px-2 py-0.5 rounded-md shrink-0">
                            {ticket.id}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <AppBadge 
                              variant={isCritical ? "danger" : isUrgent ? "warning" : "neutral"}
                              withPulse={isCritical}
                              className="text-[10px] font-bold tracking-wider"
                            >
                              {ticket.priorityObj?.name || "STANDARD"}
                            </AppBadge>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-border bg-surface text-foreground whitespace-nowrap">
                              {ticket.statusObj?.name || "Unknown"}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <div>
                          <h3 className="text-sm font-bold text-foreground line-clamp-2 hover:text-theme-btn-primary transition-colors">
                            {ticket.title}
                          </h3>
                        </div>

                        {/* Department & Assignee */}
                        <div className="flex items-center justify-between gap-2 text-xs text-muted flex-wrap">
                          <div className="flex items-center gap-1.5 truncate">
                            {ticket.departmentObj?.name && (
                              <span className="bg-elevated px-2 py-0.5 rounded-md text-[10px] font-bold text-foreground/80 truncate max-w-[140px]">
                                {ticket.departmentObj.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-medium text-foreground truncate max-w-[160px]">
                            <span className="text-muted">Assignee:</span>
                            <span className="font-semibold truncate">{ticket.assignedTo}</span>
                          </div>
                        </div>

                        {/* Bottom Row: Created Date & Quick Action Buttons */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                          <span className="text-[11px] text-muted">
                            {new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <AppButton 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2.5 text-xs text-theme-icon hover:bg-theme-btn-primary/10 rounded-lg flex items-center gap-1 active:scale-95 transition-all"
                              onClick={() => handleTicketClick(ticket)}
                            >
                              <Search className="h-3.5 w-3.5" /> View
                            </AppButton>
                            {ticket.statusObj?.code !== "ST_RESOLVED" && ticket.statusObj?.name !== "Resolved" && (
                              <AppButton 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 px-2.5 text-xs text-success hover:bg-success/10 rounded-lg flex items-center gap-1 active:scale-95 transition-all"
                                onClick={() => handleTicketClick(ticket)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                              </AppButton>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop Table View (>=1024px) */}
              <div className="hidden lg:block">
                <AppTableContainer>
                  <AppTable>
                    <AppTableHeader>
                      <AppTableRow>
                        <AppTableHead>Ticket ID</AppTableHead>
                        <AppTableHead>Title</AppTableHead>
                        <AppTableHead>Priority</AppTableHead>
                        <AppTableHead>Status</AppTableHead>
                        <AppTableHead>Department</AppTableHead>
                        <AppTableHead>Assignee</AppTableHead>
                        <AppTableHead>Created At</AppTableHead>
                        <AppTableHead className="text-right">Actions</AppTableHead>
                      </AppTableRow>
                    </AppTableHeader>
                    <AppTableBody>
                      {filteredTickets.length > 0 ? (
                        filteredTickets.map((ticket, index) => {
                          const isCritical = ticket.priorityObj?.code?.includes("CRITICAL") || ticket.priorityObj?.code === "PRIO_CRIT_P1" || ticket.priorityObj?.code === "P1";
                          const isUrgent = isCritical || ticket.priorityObj?.code?.includes("HIGH") || ticket.priorityObj?.code === "P2";
                          const staggerClass = index < 10 ? `delay-${index + 1}` : "";

                          return (
                            <AppTableRow 
                              key={ticket.dbId} 
                              onClick={() => handleTicketClick(ticket)}
                              className={`cursor-pointer hover:bg-surface-hover/80 transition-colors animate-stagger-in ${staggerClass}`}
                            >
                              <AppTableCell className="font-mono text-xs font-bold text-theme-icon dark:text-theme-icon">
                                {ticket.id}
                              </AppTableCell>
                              <AppTableCell className="font-semibold max-w-xs truncate group-hover:text-theme-btn-primary transition-colors">
                                {ticket.title}
                              </AppTableCell>
                              <AppTableCell>
                                <AppBadge 
                                  variant={isCritical ? "danger" : isUrgent ? "warning" : "neutral"}
                                  withPulse={isCritical}
                                  className="text-[10px] font-bold tracking-wider"
                                >
                                  {ticket.priorityObj?.name || "STANDARD"}
                                </AppBadge>
                              </AppTableCell>
                              <AppTableCell>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-border bg-surface text-foreground whitespace-nowrap shadow-2xs">
                                  {ticket.statusObj?.name || "Unknown"}
                                </span>
                              </AppTableCell>
                              <AppTableCell className="text-xs text-muted-foreground">
                                {ticket.departmentObj?.name || "-"}
                              </AppTableCell>
                              <AppTableCell className="text-xs font-medium">
                                {ticket.assignedTo}
                              </AppTableCell>
                              <AppTableCell className="text-xs text-muted-foreground">
                                {new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              </AppTableCell>
                              <AppTableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <AppButton 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 px-2.5 text-theme-icon hover:bg-theme-btn-primary/10 transition-all active:scale-95"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTicketClick(ticket);
                                    }}
                                    title="View Details"
                                  >
                                    <Search className="h-4 w-4" />
                                  </AppButton>
                                  {ticket.statusObj?.code !== "ST_RESOLVED" && ticket.statusObj?.name !== "Resolved" && (
                                    <AppButton 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 px-2.5 text-success hover:bg-success/10 transition-all active:scale-95"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTicketClick(ticket);
                                      }}
                                      title="Resolve Ticket"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </AppButton>
                                  )}
                                </div>
                              </AppTableCell>
                            </AppTableRow>
                          );
                        })
                      ) : (
                        <AppTableRow>
                          <AppTableCell colSpan={8} className="h-32 text-center text-muted-foreground animate-in fade-in duration-300">
                            No tickets found matching your criteria.
                          </AppTableCell>
                        </AppTableRow>
                      )}
                    </AppTableBody>
                  </AppTable>
                </AppTableContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Drawer removed in favor of full page routing */}

      {/* Creation Wizard */}
      {showWizard && (
        <TicketCreationWizard 
          onClose={() => setShowWizard(false)}
          onSuccess={(id) => {
            setShowWizard(false);
            if (id.includes("-REQ-")) {
              router.push("/requirements");
            } else {
              fetchData();
              setToastMessage(`Ticket ${id} initialized successfully.`);
            }
          }}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-4 duration-300">
          <div className="px-6 py-3 bg-theme-btn-primary text-white text-sm font-bold rounded-2xl shadow-2xl shadow-indigo-500/40 border border-theme-btn-primary flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4" />
            {toastMessage}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

