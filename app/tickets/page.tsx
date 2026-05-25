"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { TicketListSidebar } from "@/components/tickets/TicketListSidebar";
import { TicketWorkspaceConsole } from "@/components/tickets/TicketWorkspaceConsole";
import { TicketCreationWizard } from "@/components/tickets/TicketCreationWizard";
import { AppButton } from "@/components/ui/AppButton";
import { Plus, RefreshCw, CheckCircle2, Database, Loader2 } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { fetchTicketDashboardData } from "@/lib/actions/tickets";

export default function TicketsPage() {
  const supabase = createClient();
  const { theme } = useTheme();
  const isLightMode = theme === "executive-light";
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  
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
  const [showWizard, setShowWizard] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

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
      const data = await fetchTicketDashboardData();

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
      
      const mappedTickets = (finalTicketData || []).map(t => {
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

      // Preserve currently selected ticket or default to the first one in list
      if (mappedTickets.length > 0) {
        if (selectedTicket) {
          const updated = mappedTickets.find(t => t.dbId === selectedTicket.dbId);
          setSelectedTicket(updated || mappedTickets[0]);
        } else {
          setSelectedTicket(mappedTickets[0]);
        }
      } else {
        setSelectedTicket(null);
      }
    } catch (err) {
      console.error("Critical recovery during ticket hydration:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Global realtime listener for new tickets, updates or deletions
    const channel = supabase
      .channel("tickets_global")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter tickets by scope selection (INFRA, ERP, OTHERS) and search queries
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      (t.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.id || "").toLowerCase().includes(searchQuery.toLowerCase());
      
    // Matches ticket custom_fields flow_scope ID or code
    const scopeIdOrCode = t.custom_fields?.flow_scope?.id || t.custom_fields?.flow_scope?.code || "";
    const matchesScope = 
      selectedScope === "ALL" || 
      scopeIdOrCode === selectedScope || 
      t.custom_fields?.flow_scope?.id === selectedScope ||
      t.custom_fields?.flow_scope?.code === selectedScope;
      
    return matchesSearch && matchesScope;
  });

  if (!mounted || permissionsLoading) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 ${
        isLightMode ? "bg-gray-50 text-gray-900" : "bg-[#070913] text-white"
      }`}>
        <div className="animate-spin h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full shadow-lg shadow-indigo-500/20" />
        <span className="text-xs font-bold uppercase tracking-widest animate-pulse text-gray-500">
          Verifying Capabilities...
        </span>
      </div>
    );
  }

  if (!hasPermission("TICKETS_VIEW")) {
    return (
      <div className={`h-screen flex flex-col items-center justify-center space-y-4 transition-colors duration-300 ${
        isLightMode ? "bg-gray-50 text-gray-900" : "bg-[#070913] text-white"
      }`}>
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <Database className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-xs text-gray-500">You do not have capabilities to view Operations Tickets.</p>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden font-sans transition-colors duration-300 ${
      isLightMode ? "bg-gray-50 text-gray-900" : "bg-[#070913] text-white"
    }`}>
      {/* Premium Command Header */}
      <header className={`h-20 shrink-0 px-8 flex items-center justify-between border-b backdrop-blur-md z-50 transition-all duration-300 ${
        isLightMode ? "border-gray-200 bg-white/80" : "border-white/5 bg-[#070913]/80"
      }`}>
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className={`text-xl font-bold tracking-tight ${
              isLightMode ? "text-gray-900" : "bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent"
            }`}>
              Operations Control Center
            </h1>
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isLightMode ? "text-gray-500" : "text-gray-500"}`}>Live Node: ADIOS-ENTERPRISE-01</span>
            </div>
          </div>
          <div className={`h-8 w-px ${isLightMode ? "bg-gray-200" : "bg-white/10"}`} />
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-600 font-bold uppercase">Active Tickets</span>
              <span className="text-sm font-semibold">{tickets.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-600 font-bold uppercase">SLA Stability</span>
              <span className="text-sm font-semibold text-emerald-400">98.4%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AppButton 
            variant="ghost" 
            size="sm" 
            onClick={() => window.open("/masters?scope=ERP_SOFTWARE", "_blank")}
            className={`hidden md:flex ${isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
          >
            <Database className="h-4 w-4 mr-2" />
            Registry
          </AppButton>
          <AppButton 
            variant="ghost" 
            size="sm" 
            onClick={() => fetchData()}
            className={isLightMode ? "text-gray-600 hover:bg-gray-100" : "text-gray-500 hover:text-white hover:bg-white/5"}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Sync
          </AppButton>
          {hasPermission("TICKETS_CREATE") && (
            <AppButton 
              variant="primary" 
              size="sm" 
              onClick={() => setShowWizard(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 px-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Initialize Ticket
            </AppButton>
          )}
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <main className="flex-1 flex overflow-hidden mt-2 px-6 pb-4 gap-4">
        {/* Left Column: Scope filtering sidebar */}
        <div className={`w-[380px] shrink-0 border-r ${isLightMode ? "border-gray-200" : "border-white/5"}`}>
          <TicketListSidebar 
            tickets={filteredTickets}
            selectedTicketId={selectedTicket?.dbId || selectedTicket?.id}
            onSelect={setSelectedTicket}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedDept={selectedScope}
            onDeptChange={setSelectedScope}
            departments={scopesList} // Pass scopes list in place of departments
          />
        </div>

        {/* Right/Center Column: Consolidated Ticket Workspace Console */}
        <div className="flex-1 min-w-0 bg-transparent flex flex-col">
          {loading && tickets.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className={`flex-1 border rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${
              isLightMode ? "bg-white border-gray-200" : "bg-[#090f1e]/40 border-white/5"
            }`}>
              <TicketWorkspaceConsole 
                ticket={selectedTicket}
                onUpdate={fetchData}
                departments={departments}
                priorities={priorities}
                states={states}
                categories={categories}
                subcategories={subcategories}
                issueTypes={issueTypes}
              />
            </div>
          )}
        </div>
      </main>

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
          <div className="px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-2xl shadow-indigo-500/40 border border-indigo-400 flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4" />
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
