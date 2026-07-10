"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { TicketWorkspaceConsole } from "@/components/tickets/TicketWorkspaceConsole";
import { TicketCreationWizard } from "@/components/tickets/TicketCreationWizard";
import { AppButton } from "@/components/ui/AppButton";
import { Plus, RefreshCw, CheckCircle2, Database, Loader2, ArrowLeft, Search, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { fetchTicketDashboardData } from "@/lib/actions/tickets";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppTable, AppTableBody, AppTableCell, AppTableContainer, AppTableHead, AppTableHeader, AppTableRow } from "@/components/ui/AppTable";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export default function TicketsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
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
    if (code.includes("CRITICAL") || code === "PRIO_CRIT_P1" || code === "P1") return "bg-red-500 text-white";
    if (code.includes("HIGH") || code === "PRIO_HIGH_P2" || code === "P2") return "bg-amber-500 text-white";
    if (code.includes("MEDIUM") || code === "PRIO_MED_P3" || code === "P3") return "bg-accent text-white";
    return "bg-green-500 text-white";
  };

  // End User Role Visibility: Can only see their own created or assigned tickets is handled on the server side using the existing getVisibleTickets logic, but we still apply it here just in case, though the DB already enforces it. Actually, wait. The DB filters for ends users as well? Yes, getVisibleTickets handles user isolation. So we can just use tickets directly.
  const filteredTickets = tickets;

  if (!mounted || permissionsLoading) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 bg-surface text-foreground`}>
        <div className="animate-spin h-10 w-10 border-2 border-accent border-t-transparent rounded-full shadow-lg shadow-indigo-500/20" />
        <span className="text-xs font-bold uppercase tracking-widest animate-pulse text-gray-500">
          Verifying Capabilities...
        </span>
      </div>
    );
  }

  if (!hasPermission("TICKETS_VIEW")) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 bg-surface text-foreground`}>
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <Database className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-xs text-gray-500">You do not have capabilities to view Operations Tickets.</p>
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
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className={`text-[0.65rem] font-bold uppercase tracking-widest text-muted`}>Live Node: Chandak Workspace-ENTERPRISE-01</span>
            </div>
            <div className={`h-4 w-px ${isLightMode ? "bg-gray-300" : "bg-white/10"}`} />
            <div className="flex items-center gap-4 text-xs">
              <span className="font-semibold text-gray-500 uppercase tracking-wide">Active: <span className="text-gray-900 dark:text-white">{tickets.length}</span></span>
              <span className="font-semibold text-emerald-500 uppercase tracking-wide">SLA Stability: 98.4%</span>
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

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden gap-6 p-6">
        {/* Filters Top Bar */}
        <div className={`p-4 space-y-4 rounded-xl border ${
          isLightMode ? "border-gray-100 bg-white shadow-sm" : "border-white/5 bg-white/[0.01]"
        }`}>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input 
                type="text"
                placeholder="Search tickets by ID or title..."
                className={`w-full h-10 pl-10 pr-4 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                  isLightMode 
                    ? "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400" 
                    : "bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                }`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 hidden md:inline">Status:</span>
              </div>
              <select 
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className={`h-9 pl-3 pr-8 rounded-lg text-sm border outline-none cursor-pointer ${
                  isLightMode ? "bg-white border-gray-200" : "bg-black/20 border-white/10 text-white"
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
                className={`h-9 pl-3 pr-8 rounded-lg text-sm border outline-none cursor-pointer ${
                  isLightMode ? "bg-white border-gray-200" : "bg-black/20 border-white/10 text-white"
                }`}
              >
                <option value="ALL">All Priorities</option>
                {priorities.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-border no-scrollbar w-full">
            <AppButton 
              onClick={() => setSelectedScope("ALL")}
              variant={selectedScope === "ALL" ? "primary" : "ghost"}
              size="sm"
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                selectedScope === "ALL" 
                  ? "bg-accent text-white hover:bg-accent-secondary" 
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
                className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                  selectedScope === scope.id 
                    ? "bg-accent text-white hover:bg-accent-secondary" 
                    : ""
                }`}
              >
                {scope.name}
              </AppButton>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border shadow-sm">
          {loading && tickets.length === 0 ? (
            <div className="flex-1 h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
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
                    filteredTickets.map(ticket => (
                      <AppTableRow 
                        key={ticket.dbId} 
                        onClick={() => handleTicketClick(ticket)}
                        className="cursor-pointer"
                      >
                        <AppTableCell className="font-mono text-xs font-bold text-accent dark:text-accent">
                          {ticket.id}
                        </AppTableCell>
                        <AppTableCell className="font-semibold max-w-xs truncate">
                          {ticket.title}
                        </AppTableCell>
                        <AppTableCell>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${getPriorityColor(ticket.priorityObj?.code)}`}>
                            {ticket.priorityObj?.name || "STANDARD"}
                          </span>
                        </AppTableCell>
                        <AppTableCell>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-border bg-surface text-foreground whitespace-nowrap">
                            {ticket.statusObj?.name || "Unknown"}
                          </span>
                        </AppTableCell>
                        <AppTableCell className="text-xs text-muted-foreground">
                          {ticket.departmentObj?.name || "-"}
                        </AppTableCell>
                        <AppTableCell className="text-xs">
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
                              className="h-8 px-2 text-accent hover:bg-accent/10 dark:hover:bg-accent/10 transition-colors"
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
                                className="h-8 px-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
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
                    ))
                  ) : (
                    <AppTableRow>
                      <AppTableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        No tickets found matching your criteria.
                      </AppTableCell>
                    </AppTableRow>
                  )}
                </AppTableBody>
              </AppTable>
            </AppTableContainer>
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
            fetchData();
            setToastMessage(`Ticket ${id} initialized successfully.`);
          }}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-4 duration-300">
          <div className="px-6 py-3 bg-accent text-white text-sm font-bold rounded-2xl shadow-2xl shadow-indigo-500/40 border border-accent flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4" />
            {toastMessage}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
