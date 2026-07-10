"use client";

import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, ActivitySquare, Clock, Send, Loader2, StickyNote } from "lucide-react";
import { fetchTicketAuditLogs } from "@/lib/actions/tickets";
import { AppButton } from "@/components/ui/AppButton";
import TicketRealtimeChat from "./TicketRealtimeChat";

const escapeHTML = (str: string) => {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
};

export function TicketRightPanel({ ticketId, dbId }: { ticketId: string, dbId: string }) {
  const [activeTab, setActiveTab] = useState("chat");
  const panelRef = useRef<HTMLDivElement>(null);

  // Audit States
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [hasMoreAudits, setHasMoreAudits] = useState(true);
  const [auditsOffset, setAuditsOffset] = useState(0);

  useEffect(() => {
    loadAudits(0);
  }, [dbId]);

  const loadAudits = async (offset: number) => {
    if (!dbId) return;
    setLoadingAudits(true);
    try {
      const data = await fetchTicketAuditLogs(dbId, 20, offset);
      if (offset === 0) setAuditLogs(data);
      else setAuditLogs(prev => [...prev, ...data]);
      setHasMoreAudits(data.length === 20);
      setAuditsOffset(offset + 20);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudits(false);
    }
  };



  return (
    <div className="h-full min-h-0" ref={panelRef}>
      <div className="h-full min-h-0 flex flex-col rounded-3xl border border-border bg-surface p-4 shadow-sm transition-all duration-300">
        <Tabs defaultValue="chat" onValueChange={setActiveTab} value={activeTab} className="flex flex-col h-full min-h-0">
          <TabsList className="w-full grid grid-cols-2 shrink-0 gap-2 bg-transparent p-0 h-auto">
            <TabsTrigger 
              value="chat" 
              className="py-2.5 text-xs font-bold gap-1.5 px-2 rounded-xl border border-border bg-background hover:bg-surface data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:border-accent data-[state=active]:shadow-md transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger 
              value="audit" 
              className="py-2.5 text-xs font-bold gap-1.5 px-2 rounded-xl border border-border bg-background hover:bg-surface data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:border-accent data-[state=active]:shadow-md transition-all"
            >
              <ActivitySquare className="h-4 w-4" />
              Audit
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="mt-4 flex-1 min-h-0 flex flex-col">
            <TicketRealtimeChat ticketId={dbId} />
          </TabsContent>
          
          <TabsContent value="audit" className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
            <div className="relative pl-3 border-l border-border space-y-6">
              {auditLogs.map((log) => {
                const isStatusChange = log.changed_fields?.includes("status_id");
                const isAssigneeChange = log.changed_fields?.includes("assignee_id");
                
                return (
                  <div key={log.id} className="relative">
                    <div className={`absolute -left-4 w-2 h-2 rounded-full border-2 border-background top-1.5 ${
                      isStatusChange ? "bg-accent" : isAssigneeChange ? "bg-accent" : "bg-gray-400"
                    }`} />
                    <div className="bg-background border border-border p-3 rounded-xl shadow-sm text-[11px]">
                      <div className="font-semibold text-foreground flex items-center justify-between mb-1">
                        <span>{log.actor?.full_name || "System"} updated ticket</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {log.changed_fields?.map((field: string) => (
                          <div key={field}>
                            Changed <span className="font-mono text-[10px] bg-surface px-1 py-0.5 rounded border border-border">{field}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              {hasMoreAudits && (
                <div className="flex justify-center pt-2">
                  <AppButton variant="outline" size="sm" onClick={() => loadAudits(auditsOffset)} isLoading={loadingAudits}>
                    Load More
                  </AppButton>
                </div>
              )}
              {auditLogs.length === 0 && !loadingAudits && (
                <div className="text-center text-xs text-muted-foreground py-10">No audit logs found.</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
