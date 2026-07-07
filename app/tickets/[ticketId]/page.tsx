"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { TicketWorkspaceConsole } from "@/components/tickets/TicketWorkspaceConsole";
import { fetchTicketDashboardData } from "@/lib/actions/tickets";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TicketDetailsPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const router = useRouter();
  const { ticketId } = use(params);
  const { userId, loading: permissionsLoading } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [ticketData, setTicketData] = useState<any>(null);
  
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
      const data = await fetchTicketDashboardData();

      setDepartments(data.departments || []);
      setPriorities(data.priorities || []);
      setStates(data.states || []);
      setCategories(data.categories || []);
      setSubcategories(data.subcategories || []);
      setIssueTypes(data.issueTypes || []);

      const foundTicket = (data.tickets || []).find((t: any) => t.id === ticketId || t.dbId === ticketId);
      
      if (foundTicket) {
        const custom = foundTicket.custom_fields || {};
        const mappedTicket = {
          ...foundTicket,
          dbId: foundTicket.id,
          id: foundTicket.code || `INC-${foundTicket.id.slice(0, 8)}`,
          priorityObj: (data.priorities || []).find((p: any) => p.id === foundTicket.priority_id),
          statusObj: (data.states || []).find((s: any) => s.id === foundTicket.status_id),
          departmentObj: (data.departments || []).find((d: any) => d.id === foundTicket.department_id),
          categoryObj: (data.categories || []).find((c: any) => c.id === custom.category_id),
          subcategoryObj: (data.subcategories || []).find((sc: any) => sc.id === custom.subcategory_id),
          issueTypeObj: (data.issueTypes || []).find((it: any) => it.id === custom.issue_type_id),
          assignedTo: foundTicket.assignee?.full_name || "Unassigned Operations Swarm",
          createdAt: foundTicket.created_at
        };
        setTicketData(mappedTicket);
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

  if (loading || permissionsLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
          Loading Ticket Data...
        </span>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-4">
        <h2 className="text-xl font-bold">Ticket Not Found</h2>
        <button onClick={() => router.push("/tickets")} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">
          Return to Tickets
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground space-y-4 pt-2">
      <div className="px-6 flex flex-wrap items-center gap-4">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ticket List
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
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
  );
}
