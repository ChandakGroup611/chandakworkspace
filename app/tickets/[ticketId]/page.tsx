"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { TicketWorkspaceConsole } from "@/components/tickets/TicketWorkspaceConsole";
import { TicketRightPanel } from "@/components/tickets/TicketRightPanel";
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
      const data = await fetchTicketDashboardData();

      setDepartments(data.departments || []);
      setPriorities(data.priorities || []);
      setStates(data.states || []);
      setCategories(data.categories || []);
      setSubcategories(data.subcategories || []);
      setIssueTypes(data.issueTypes || []);

      const foundTicket: any = (data.tickets as any[] || []).find((t: any) => t.id === ticketId || t.dbId === ticketId);
      
      if (foundTicket && typeof foundTicket === 'object') {
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
      alert("Failed to save: " + err.message);
    }
  };

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
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr] items-stretch">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            {/* Top row: Tags and Button */}
            <div className="flex items-start justify-between gap-4 w-full">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <p className="text-[11px] font-mono tracking-wider text-purple-700 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded font-bold">
                  {ticketData.id}
                </p>
                <p className="text-[11px] tracking-wider text-muted-foreground px-2 py-0.5 border border-border rounded font-bold bg-background">
                  DEPARTMENT: {ticketData.departmentObj?.name || "Unassigned"}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-200 shrink-0">
                <ArrowLeft className="h-4 w-4" /> {/* Or some other icon */}
                Full ticket page
              </div>
            </div>

            {/* Content row: Title, description, etc. */}
            <div className="min-w-0 w-full mt-1">
              <div className="mt-3 w-full">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    Subject
                  </span>
                  {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-600">
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setIsEditing(false);
                        setEditTitle(ticketData.title || "");
                        setEditDescription(ticketData.description || "");
                      }} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-600">
                        Cancel
                      </button>
                      <button onClick={handleSaveDetails} className="text-[10px] font-bold uppercase tracking-widest text-green-500 hover:text-green-600">
                        Save
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 min-w-0 w-full">
                  {!isEditing ? (
                    <h1 className="text-lg font-bold text-purple-700 dark:text-purple-400 break-words whitespace-normal w-full">{ticketData.title}</h1>
                  ) : (
                    <input 
                      className="text-lg font-bold w-full border border-indigo-500/30 rounded px-2 py-1 bg-background"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  )}
                </div>
              </div>
              
              <div className="mt-6 w-full">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  Description
                </span>
                {!isEditing ? (
                  <div 
                    className="text-[13px] sm:text-sm text-foreground w-full max-w-full leading-relaxed prose prose-sm dark:prose-invert bg-background/50 p-4 rounded-xl border border-border shadow-sm"
                    dangerouslySetInnerHTML={{ __html: ticketData.description || "No description provided." }} 
                  />
                ) : (
                  <textarea 
                    className="w-full text-[13px] sm:text-sm border border-indigo-500/30 rounded-xl p-4 bg-background min-h-[120px] resize-y"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                )}
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-border pt-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Creator</span>
                <p className="text-xs font-semibold text-foreground mt-0.5">{ticketData.creator?.full_name || "Unknown"}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Created At</span>
                <p className="text-xs font-semibold text-foreground mt-0.5">{new Date(ticketData.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Status</span>
                <p className="text-xs font-semibold text-foreground mt-0.5">
                  <span className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 dark:bg-purple-400/10 dark:text-purple-400 dark:ring-purple-400/20">
                    {ticketData.statusObj?.name || "Open"}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Updated</span>
                <p className="text-xs font-semibold text-foreground mt-0.5">{ticketData.updated_at ? new Date(ticketData.updated_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "Never"}</p>
              </div>
            </div>
          </div>
          
          <div className="relative w-full h-full xl:h-auto">
            <div className="xl:absolute xl:inset-0 w-full h-full">
              <TicketRightPanel ticketId={ticketData.id} dbId={ticketData.dbId} />
            </div>
          </div>
        </div>

        <div className="w-full mt-6">
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
