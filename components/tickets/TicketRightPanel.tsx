"use client";

import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, ActivitySquare, Clock, Send, Loader2 } from "lucide-react";
import { fetchTicketComments, addTicketRemark, fetchTicketAuditLogs } from "@/lib/actions/tickets";
import { AppButton } from "@/components/ui/AppButton";

export function TicketRightPanel({ ticketId, dbId }: { ticketId: string, dbId: string }) {
  const [activeTab, setActiveTab] = useState("chat");
  const panelRef = useRef<HTMLDivElement>(null);

  // Chat States
  const [comments, setComments] = useState<any[]>([]);
  const [newRemark, setNewRemark] = useState("");
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [hasMoreRemarks, setHasMoreRemarks] = useState(true);
  const [remarksOffset, setRemarksOffset] = useState(0);

  // Audit States
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [hasMoreAudits, setHasMoreAudits] = useState(true);
  const [auditsOffset, setAuditsOffset] = useState(0);

  useEffect(() => {
    loadRemarks(0);
    loadAudits(0);
  }, [dbId]);

  const loadRemarks = async (offset: number) => {
    if (!dbId) return;
    setLoadingRemarks(true);
    try {
      const data = await fetchTicketComments(dbId, 20, offset);
      if (offset === 0) setComments(data);
      else setComments(prev => [...prev, ...data]);
      setHasMoreRemarks(data.length === 20);
      setRemarksOffset(offset + 20);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRemarks(false);
    }
  };

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

  const submitRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemark.trim() || !dbId) return;
    setLoadingRemarks(true);
    try {
      await addTicketRemark(dbId, newRemark);
      setNewRemark("");
      loadRemarks(0);
    } catch (err: any) {
      alert("Failed to send remark: " + err.message);
    } finally {
      setLoadingRemarks(false);
    }
  };

  return (
    <div className="h-full min-h-0" ref={panelRef}>
      <div className="h-full min-h-0 flex flex-col rounded-3xl border border-border bg-surface p-4 shadow-sm transition-all duration-300">
        <Tabs defaultValue="chat" onValueChange={setActiveTab} value={activeTab} className="flex flex-col h-full min-h-0">
          <TabsList className="w-full grid grid-cols-2 shrink-0 gap-2 bg-transparent p-0 h-auto">
            <TabsTrigger 
              value="chat" 
              className="py-2.5 text-xs font-bold gap-1.5 px-2 rounded-xl border border-border bg-background hover:bg-surface data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600 data-[state=active]:shadow-md transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger 
              value="audit" 
              className="py-2.5 text-xs font-bold gap-1.5 px-2 rounded-xl border border-border bg-background hover:bg-surface data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:border-purple-600 data-[state=active]:shadow-md transition-all"
            >
              <ActivitySquare className="h-4 w-4" />
              Audit
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="mt-4 flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-6 flex flex-col-reverse pr-2">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md">
                    {comment.author?.full_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 p-3 rounded-2xl rounded-tl-sm bg-background border border-border text-foreground">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold">{comment.author?.full_name || "System"}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{new Date(comment.created_at).toLocaleString()}</span>
                    </div>
                    <p 
                      className="text-[13px] leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: comment.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-[11px] font-mono">$1</code>')
                      }}
                    />
                  </div>
                </div>
              ))}
              
              {hasMoreRemarks && (
                <div className="flex justify-center py-4">
                  <AppButton variant="outline" size="sm" onClick={() => loadRemarks(remarksOffset)} isLoading={loadingRemarks}>
                    Load Older
                  </AppButton>
                </div>
              )}
              
              {comments.length === 0 && !loadingRemarks && (
                <div className="text-center text-xs text-muted-foreground py-10 flex flex-col items-center gap-2">
                  <MessageCircle className="h-6 w-6 opacity-20" />
                  <p>No remarks yet. Be the first to collaborate.</p>
                </div>
              )}
            </div>
            
            <form onSubmit={submitRemark} className="mt-4 pt-4 border-t border-border shrink-0">
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  placeholder="Type remark..."
                  className="w-full border rounded-full pl-4 pr-12 py-2.5 text-xs bg-background border-border text-foreground focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow shadow-inner"
                />
                <button 
                  type="submit"
                  disabled={!newRemark.trim() || loadingRemarks}
                  className="absolute right-1.5 h-7 w-7 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white disabled:opacity-50 transition-transform hover:scale-105 active:scale-95 shadow-md"
                >
                  {loadingRemarks ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 -ml-0.5" />}
                </button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="audit" className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
            <div className="relative pl-3 border-l border-border space-y-6">
              {auditLogs.map((log) => {
                const isStatusChange = log.changed_fields?.includes("status_id");
                const isAssigneeChange = log.changed_fields?.includes("assignee_id");
                
                return (
                  <div key={log.id} className="relative">
                    <div className={`absolute -left-4 w-2 h-2 rounded-full border-2 border-background top-1.5 ${
                      isStatusChange ? "bg-purple-500" : isAssigneeChange ? "bg-blue-500" : "bg-gray-400"
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
