"use client";

import React, { useState, useEffect } from "react";
import { 
  Clock, User, Video, CheckCircle2, MessageSquare, 
  History, Calendar, Users, Edit3, Save, Printer, HelpCircle, 
  ChevronRight, ChevronUp, ChevronDown, Loader2, Paperclip, Workflow,
  ShieldCheck, AlertTriangle, Send
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { fetchAssignees } from "@/lib/actions/users";
import { 
  fetchTicketComments, 
  addTicketRemark, 
  fetchTicketAuditLogs, 
  updateTicketDetails, 
  generateTeamsMeetingLink 
} from "@/lib/actions/tickets";
import { EnterpriseUploader } from "@/components/ui/EnterpriseUploader";

interface TicketWorkspaceConsoleProps {
  ticket: any;
  onUpdate: () => void;
  departments: any[];
  priorities: any[];
  states: any[];
  categories: any[];
  subcategories: any[];
  issueTypes: any[];
  currentUserId: string | null;
}

export function TicketWorkspaceConsole({
  ticket,
  onUpdate,
  departments,
  priorities,
  states,
  categories,
  subcategories,
  issueTypes,
  currentUserId
}: TicketWorkspaceConsoleProps) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);
  const { hasPermission, roleCode } = usePermissions();

  const [assigneesList, setAssigneesList] = useState<any[]>([]);

  // Remarks & Audits Pagination States
  const [comments, setComments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [newRemark, setNewRemark] = useState("");
  
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [loadingAudits, setLoadingAudits] = useState(false);
  
  const [showRemarks, setShowRemarks] = useState(true);
  const [showAudits, setShowAudits] = useState(false);
  const [remarksOffset, setRemarksOffset] = useState(0);
  const [auditsOffset, setAuditsOffset] = useState(0);
  const [hasMoreRemarks, setHasMoreRemarks] = useState(true);
  const [hasMoreAudits, setHasMoreAudits] = useState(true);

  // Edit Mode States
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [title, setTitle] = useState(ticket?.title || "");
  const [description, setDescription] = useState(ticket?.description || "");
  const [savingDetails, setSavingDetails] = useState(false);

  // Cascade category state
  const [selectedCatId, setSelectedCatId] = useState(ticket?.custom_fields?.category_id || "");
  const [selectedSubcatId, setSelectedSubcatId] = useState(ticket?.custom_fields?.subcategory_id || "");

  // SLA State
  const [slaTimeRemaining, setSlaTimeRemaining] = useState("");
  const [slaStatus, setSlaStatus] = useState<"MET" | "BREACHED" | "ACTIVE">("ACTIVE");
  const [slaPercent, setSlaPercent] = useState(100);

  // Load state and action loading
  const [isGeneratingTeams, setIsGeneratingTeams] = useState(false);

  // Allow any user with access to the console to edit fields (TICKETS_UPDATE checked by server)
  const isAssignee = currentUserId === ticket?.assignee_id;
  const isSuperAdmin = roleCode === "SUPER_ADMIN";
  const canEditFields = true; // Relaxed restriction: Allow all members to edit
  const canAddRemarks = true; // Everyone who can view the ticket can add a remark

  useEffect(() => {
    async function loadInitialData() {
      if (!ticket?.dbId) return;
      
      const activeAssignees = await fetchAssignees();
      setAssigneesList(activeAssignees);
      
      setComments([]);
      setAuditLogs([]);
      setRemarksOffset(0);
      setAuditsOffset(0);
      setHasMoreRemarks(true);
      setHasMoreAudits(true);
      
      // Auto-load audits so we can extract Assignee History
      loadMoreAudits();
    }
    
    setTitle(ticket?.title || "");
    setDescription(ticket?.description || "");
    setSelectedCatId(ticket?.custom_fields?.category_id || "");
    setSelectedSubcatId(ticket?.custom_fields?.subcategory_id || "");
    setIsEditingDetails(false);

    loadInitialData();
  }, [ticket]);

  // SLA Calculation
  useEffect(() => {
    if (!ticket?.created_at) return;

    const interval = setInterval(() => {
      const statusCode = ticket.statusObj?.code || "";
      if (statusCode === "ST_RESOLVED" || statusCode === "ST_CLOSED") {
        setSlaStatus("MET");
        setSlaTimeRemaining("SLA MET");
        setSlaPercent(100);
        return;
      }

      const priorityCode = ticket.priorityObj?.code || ticket.priorityObj?.name || "STANDARD";
      let slaHours = 24;
      if (priorityCode.includes("CRITICAL") || priorityCode === "P1") slaHours = 1;
      else if (priorityCode.includes("HIGH") || priorityCode === "P2") slaHours = 4;
      else if (priorityCode.includes("MEDIUM") || priorityCode === "P3") slaHours = 24;
      else if (priorityCode.includes("LOW") || priorityCode === "P4") slaHours = 48;

      const createdTime = new Date(ticket.created_at).getTime();
      const targetTime = createdTime + (slaHours * 60 * 60 * 1000);
      const currentTime = Date.now();
      const diffMs = targetTime - currentTime;

      if (diffMs <= 0) {
        setSlaStatus("BREACHED");
        setSlaTimeRemaining("SLA BREACHED");
        setSlaPercent(0);
      } else {
        setSlaStatus("ACTIVE");
        const totalDuration = slaHours * 60 * 60 * 1000;
        const percent = Math.max(0, Math.min(100, (diffMs / totalDuration) * 100));
        setSlaPercent(percent);

        const diffHrs = Math.floor(diffMs / (60 * 60 * 1000));
        const diffMins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
        if (diffHrs > 0) {
          setSlaTimeRemaining(`${diffHrs}h ${diffMins}m remaining`);
        } else {
          setSlaTimeRemaining(`${diffMins}m remaining`);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ticket, ticket?.priorityObj]);

  const handleFieldUpdate = async (fields: any) => {
    if (!ticket?.dbId) return;
    if (!canEditFields) {
      alert("Permission Denied: Only the Assignee can modify ticket attributes.");
      return;
    }
    
    try {
      await updateTicketDetails(ticket.dbId, fields);
      onUpdate();

      if (showAudits) {
        setAuditsOffset(0);
        const auditsData = await fetchTicketAuditLogs(ticket.dbId, 20, 0);
        setAuditLogs(auditsData);
        setHasMoreAudits(auditsData.length === 20);
      }
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const saveTitleDesc = async () => {
    setSavingDetails(true);
    try {
      await handleFieldUpdate({ title, description });
      setIsEditingDetails(false);
    } finally {
      setSavingDetails(false);
    }
  };

  const submitRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemark.trim() || !ticket?.dbId) return;

    setLoadingRemarks(true);
    try {
      await addTicketRemark(ticket.dbId, newRemark);
      setNewRemark("");
      
      setRemarksOffset(0);
      const commentsData = await fetchTicketComments(ticket.dbId, 20, 0);
      setComments(commentsData);
      setHasMoreRemarks(commentsData.length === 20);
    } catch (err: any) {
      alert(`Failed to add remark: ${err.message}`);
    } finally {
      setLoadingRemarks(false);
    }
  };

  const loadMoreRemarks = async () => {
    if (!ticket?.dbId) return;
    setLoadingRemarks(true);
    try {
      const data = await fetchTicketComments(ticket.dbId, 20, remarksOffset);
      if (data.length < 20) setHasMoreRemarks(false);
      setComments(prev => [...prev, ...data]);
      setRemarksOffset(prev => prev + 20);
    } finally {
      setLoadingRemarks(false);
    }
  };

  const loadMoreAudits = async () => {
    if (!ticket?.dbId) return;
    setLoadingAudits(true);
    try {
      const data = await fetchTicketAuditLogs(ticket.dbId, 20, auditsOffset);
      if (data.length < 20) setHasMoreAudits(false);
      setAuditLogs(prev => [...prev, ...data]);
      setAuditsOffset(prev => prev + 20);
    } finally {
      setLoadingAudits(false);
    }
  };

  useEffect(() => {
    if (showRemarks && comments.length === 0 && hasMoreRemarks) {
      loadMoreRemarks();
    }
  }, [showRemarks]);

  const generateTeamsMeeting = async () => {
    if (!canEditFields) return;
    setIsGeneratingTeams(true);
    try {
      await generateTeamsMeetingLink(ticket.dbId);
      onUpdate();
    } catch (err: any) {
      alert(`Teams generation failed: ${err.message}`);
    } finally {
      setIsGeneratingTeams(false);
    }
  };

  if (!ticket) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-8 text-center transition-colors duration-300 ${isLightMode ? "bg-gray-50 text-gray-500" : "bg-[#0A0A0A]/40 text-gray-400"}`}>
        <Workflow className="h-12 w-12 mb-4 text-indigo-500/40" />
        <p className="text-sm font-bold tracking-tight mb-1">Operational Workspace Console</p>
        <p className="text-xs opacity-75 max-w-sm leading-relaxed">
          Select an active ticket from the operations stream on the left to inspect details.
        </p>
      </div>
    );
  }

  const getPriorityColor = () => {
    const pCode = ticket.priorityObj?.code || ticket.priorityObj?.name || "";
    if (pCode.includes("CRITICAL") || pCode === "P1") return "text-red-500 bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]";
    if (pCode.includes("HIGH") || pCode === "P2") return "text-orange-500 bg-orange-500/10 border-orange-500/30";
    if (pCode.includes("MEDIUM") || pCode === "P3") return "text-blue-500 bg-blue-500/10 border-blue-500/30";
    return "text-green-500 bg-green-500/10 border-green-500/30";
  };

  // Extract Assignee History from Audit Logs
  const assigneeHistory = auditLogs
    .filter(log => log.action === "UPDATE" && log.after_state?.assignee_id && log.before_state?.assignee_id !== log.after_state?.assignee_id)
    .map(log => {
      const user = assigneesList.find(a => a.id === log.after_state.assignee_id);
      return {
        date: log.created_at,
        name: user?.full_name || "Unknown User"
      };
    });

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 ${
      isLightMode ? "bg-gray-50/50 text-gray-900" : "bg-black text-gray-100"
    }`}>
      {/* ── BENTO HEADER ── */}
      <header className={`flex items-center justify-between p-5 border-b backdrop-blur-xl z-10 ${
        isLightMode ? "bg-white/80 border-gray-200" : "bg-white/5 border-white/5"
      }`}>
        <div className="flex items-center gap-4">
          <div className={`px-4 py-1.5 text-xs font-bold rounded-lg border uppercase tracking-wider ${getPriorityColor()}`}>
            {ticket.priorityObj?.name || "STANDARD"}
          </div>
          <h2 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {ticket.id}
          </h2>
        </div>

        {!canEditFields && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
            <ShieldCheck className="h-4 w-4" />
            READ-ONLY MODE (NON-ASSIGNEE)
          </div>
        )}
      </header>

      {/* ── DETAILED PAGE LAYOUT ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col lg:flex-row max-w-[1600px] mx-auto min-h-full">
          
          {/* LEFT: Main Content Area */}
          <div className={`flex-1 p-6 lg:p-10 lg:pr-12 ${isLightMode ? "bg-white" : "bg-[#0A0A0A]"}`}>
            
            {/* Title & Description Section */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 pb-2 w-full">
                  Incident Details
                </h3>
              </div>

              {isEditingDetails ? (
                <div className="space-y-4 animate-in fade-in">
                  <input 
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className={`w-full border rounded-xl p-4 text-lg font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all ${isLightMode ? "bg-gray-50 border-gray-200 text-gray-900" : "bg-white/5 border-white/10 text-white"}`}
                  />
                  <textarea 
                    rows={6}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className={`w-full border rounded-xl p-4 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-y ${isLightMode ? "bg-gray-50 border-gray-200 text-gray-900" : "bg-white/5 border-white/10 text-white"}`}
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={saveTitleDesc}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Save className="h-4 w-4" /> {savingDetails ? "Saving..." : "Save Details"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 group">
                  <div className="flex justify-between items-start gap-4">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
                      {ticket.title}
                    </h1>
                    {canEditFields && (
                      <button 
                        onClick={() => setIsEditingDetails(true)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all"
                        title="Edit Details"
                      >
                        <Edit3 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {ticket.description || "No description provided."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Attachments Section */}
            <div className="mb-10">
              <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 pb-2 mb-6 flex items-center gap-2">
                <Paperclip className="h-4 w-4" /> Evidence & Files
              </h3>
              <div className={`p-4 rounded-xl border ${isLightMode ? "bg-gray-50/50 border-gray-200" : "bg-white/[0.02] border-white/5"}`}>
                <EnterpriseUploader 
                  moduleType="ticket" 
                  recordId={ticket.dbId} 
                  isLightMode={isLightMode} 
                  onUploadComplete={() => {}}
                />
              </div>
            </div>

            {/* Collaboration Timeline Section */}
            <div>
              <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 pb-2 mb-6 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Collaboration Timeline
              </h3>
              
              <div className={`rounded-2xl border flex flex-col h-[600px] shadow-sm ${
                isLightMode ? "bg-white border-gray-200" : "bg-[#0f0f0f] border-white/10"
              }`}>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col-reverse">
                  {/* Reversed for chat-like behavior */}
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4">
                      <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md">
                        {comment.author?.full_name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className={`flex-1 p-4 rounded-2xl rounded-tl-sm ${
                        isLightMode ? "bg-gray-100 text-gray-800" : "bg-white/5 text-gray-300"
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold">{comment.author?.full_name || "System"}</span>
                          <span className="text-xs text-gray-500 font-medium">{new Date(comment.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  
                  {hasMoreRemarks && (
                    <button onClick={loadMoreRemarks} className="text-xs text-indigo-500 font-bold self-center py-4 hover:underline">
                      {loadingRemarks ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load Older Comments"}
                    </button>
                  )}
                  
                  {comments.length === 0 && !loadingRemarks && (
                    <div className="text-center text-sm text-gray-500 py-10 flex flex-col items-center gap-2">
                      <MessageSquare className="h-8 w-8 opacity-20" />
                      <p>No remarks yet. Be the first to collaborate.</p>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={submitRemark} className={`p-4 border-t ${isLightMode ? "bg-gray-50 border-gray-200" : "bg-black/40 border-white/10"} rounded-b-2xl`}>
                  <div className="relative flex items-center">
                    <input 
                      type="text"
                      value={newRemark}
                      onChange={(e) => setNewRemark(e.target.value)}
                      placeholder="Type your operational remark here..."
                      className={`w-full border rounded-full pl-6 pr-14 py-4 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow shadow-inner ${
                        isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-[#141414] border-white/20 text-white"
                      }`}
                    />
                    <button 
                      type="submit"
                      disabled={!newRemark.trim() || loadingRemarks}
                      className="absolute right-2 h-10 w-10 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white disabled:opacity-50 transition-transform hover:scale-105 active:scale-95 shadow-md"
                    >
                      {loadingRemarks ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 -ml-0.5" />}
                    </button>
                  </div>
                </form>
              </div>
            </div>
            
          </div>

          {/* RIGHT: Metadata Sidebar Area */}
          <div className={`w-full lg:w-[400px] shrink-0 border-t lg:border-t-0 lg:border-l p-6 lg:p-8 space-y-10 ${
            isLightMode ? "bg-gray-50 border-gray-200" : "bg-[#141414] border-white/10"
          }`}>
            
            {/* SLA Status Widget */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Service Level Agreement
              </h4>
              <div className={`p-5 rounded-xl border relative overflow-hidden ${
                isLightMode ? "bg-white border-gray-200 shadow-sm" : "bg-[#1f1f1f] border-white/10 shadow-xl"
              }`}>
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100 dark:bg-white/5">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      slaStatus === "MET" ? "bg-green-500" : 
                      slaStatus === "BREACHED" ? "bg-red-500 animate-pulse" : 
                      "bg-indigo-500"
                    }`}
                    style={{ width: `${slaPercent}%` }}
                  />
                </div>
                
                <div className="mt-2 text-center">
                  <div className={`text-3xl font-black tracking-tight mb-1 ${
                    slaStatus === "BREACHED" ? "text-red-500" : 
                    slaStatus === "MET" ? "text-green-500" : 
                    isLightMode ? "text-gray-900" : "text-white"
                  }`}>
                    {slaTimeRemaining || "Calculating..."}
                  </div>
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Target Resolution</div>
                </div>
              </div>
            </div>

            {/* Routing & Assignment */}
            <div className="space-y-5">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2">
                <Users className="h-4 w-4" /> Routing & Assignment
              </h4>
              
              <div>
                <label className="text-[11px] uppercase font-bold text-gray-500 block mb-1.5">Current Assignee</label>
                <select 
                  value={ticket.assignee_id || ""}
                  onChange={(e) => handleFieldUpdate({ assignee_id: e.target.value })}
                  disabled={!canEditFields}
                  className={`w-full border rounded-lg p-3 text-sm font-medium outline-none disabled:opacity-60 transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                    isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-black/40 border-white/20 text-white"
                  }`}
                >
                  <option value="">Unassigned</option>
                  {assigneesList.map(a => (
                    <option key={a.id} value={a.id}>{a.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-gray-500 block mb-1.5">Workflow Status</label>
                <select 
                  value={ticket.status_id}
                  onChange={(e) => handleFieldUpdate({ status_id: e.target.value })}
                  disabled={!canEditFields}
                  className={`w-full border rounded-lg p-3 text-sm font-medium outline-none disabled:opacity-60 transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                    isLightMode ? "bg-white border-gray-300 text-gray-900" : "bg-black/40 border-white/20 text-white"
                  }`}
                >
                  {states.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignee History Timeline */}
            {assigneeHistory.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-2">
                  <History className="h-4 w-4" /> Assignment Trail
                </h4>
                <div className="relative pl-3 border-l border-gray-300 dark:border-white/20 space-y-6">
                  {assigneeHistory.map((hist, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[17px] top-1.5 h-3 w-3 rounded-full bg-white dark:bg-black border-2 border-indigo-500" />
                      <div className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1">{hist.name}</div>
                      <div className="text-[11px] font-medium text-gray-500">{new Date(hist.date).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
