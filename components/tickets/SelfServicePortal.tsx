"use client";

import React, { useState, useEffect } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Plus, Search, Loader2, MessageSquare, Clock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchTicketDashboardData } from "@/lib/actions/tickets";
import { TicketCreationWizard } from "@/components/tickets/TicketCreationWizard";
import { AppTable, AppTableBody, AppTableCell, AppTableContainer, AppTableHead, AppTableHeader, AppTableRow } from "@/components/ui/AppTable";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";

export function SelfServicePortal() {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await fetchTicketDashboardData({ searchQuery: searchQuery || undefined });
      
      const finalTicketData = data.tickets || [];
      const activeStates = data.states || [];
      const activePrios = data.priorities || [];

      const mappedTickets = finalTicketData.map((t: any) => ({
        ...t,
        dbId: t.id,
        id: t.code || `INC-${t.id.slice(0, 8)}`,
        priorityObj: activePrios.find((p: any) => p.id === t.priority_id),
        statusObj: activeStates.find((s: any) => s.id === t.status_id),
      }));

      setTickets(mappedTickets);
    } catch (err) {
      console.error("Failed to load your tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(fetchData, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const getStatusColor = (statusName: string) => {
    const lower = statusName?.toLowerCase() || '';
    if (lower.includes('resolv') || lower.includes('clos')) return "bg-success/10 text-success border-emerald-500/20";
    if (lower.includes('progress') || lower.includes('doing')) return "bg-theme-btn-primary/10 text-theme-icon border-theme-btn-primary/20";
    return "bg-gray-500/10 text-subtle border-gray-500/20";
  };

  return (
    <PageContainer strict={true}>
      <PageHeader
        title="My IT Support"
        icon={<MessageSquare className="h-6 w-6 text-theme-icon" />}
        actions={
          <AppButton 
            variant="primary" 
            size="sm" 
            onClick={() => setShowWizard(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            className="bg-theme-btn-primary hover:opacity-90 text-theme-btn-primary-text font-bold"
          >
            New Request
          </AppButton>
        }
      />
      <div className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full gap-6">
        
        <div className="theme-card-structural dark:bg-[#1a1c23] p-6 rounded-2xl shadow-sm border-border dark:border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-lg font-bold texttext-2xl font-bold text-foreground">How can we help you today?</h2>
            <p className="text-sm text-muted ">Track your existing requests or submit a new one.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input 
              type="text"
              placeholder="Search your tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 theme-card-structural dark:/20 dark: rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-btn-primary"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 theme-card-structural dark:bg-[#1a1c23] rounded-2xl shadow-sm border-border dark:border-border overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border dark:border-border">
            <h3 className="font-bold text-foreground ">Recent Requests</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading && tickets.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-theme-icon" />
              </div>
            ) : tickets.length > 0 ? (
              <AppTableContainer>
                <AppTable>
                  <AppTableHeader>
                    <AppTableRow>
                      <AppTableHead>Request ID</AppTableHead>
                      <AppTableHead>Subject</AppTableHead>
                      <AppTableHead>Status</AppTableHead>
                      <AppTableHead>Submitted</AppTableHead>
                      <AppTableHead className="text-right">Action</AppTableHead>
                    </AppTableRow>
                  </AppTableHeader>
                  <AppTableBody>
                    {tickets.map(ticket => (
                      <AppTableRow key={ticket.dbId} onClick={() => router.push(`/tickets/${ticket.dbId}`)} className="cursor-pointer group hover:bg-surface dark:hover:bg-surface/5">
                        <AppTableCell className="font-mono text-xs font-bold text-theme-icon dark:text-theme-icon">
                          {ticket.id}
                        </AppTableCell>
                        <AppTableCell className="font-semibold text-sm max-w-xs truncate">
                          {ticket.title}
                        </AppTableCell>
                        <AppTableCell>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getStatusColor(ticket.statusObj?.name)}`}>
                            {ticket.statusObj?.name || "Unknown"}
                          </span>
                        </AppTableCell>
                        <AppTableCell className="text-xs text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </AppTableCell>
                        <AppTableCell className="text-right">
                          <AppButton variant="ghost" size="sm" className="h-8 w-8 p-0 group-hover:opacity-90/10 dark:group-hover:opacity-90/20 text-theme-icon">
                            <ArrowRight className="h-4 w-4" />
                          </AppButton>
                        </AppTableCell>
                      </AppTableRow>
                    ))}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted gap-3">
                <MessageSquare className="h-8 w-8 opacity-20" />
                <span className="text-sm">You haven't submitted any requests yet.</span>
                <AppButton variant="outline" size="sm" onClick={() => setShowWizard(true)}>Create One Now</AppButton>
              </div>
            )}
          </div>
        </div>
      </div>

      {showWizard && (
        <TicketCreationWizard 
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            setShowWizard(false);
            fetchData();
          }}
        />
      )}
    </PageContainer>
  );
}
