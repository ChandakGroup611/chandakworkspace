"use client";

import React, { useState, useEffect } from "react";
import { 
  Clock, User, Video, ShieldAlert, CheckCircle2, MessageSquare, 
  History, Calendar, Users, Edit3, Save, Printer, HelpCircle, 
  ChevronRight, ArrowRight, Loader2, Play 
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { fetchAssignees } from "@/lib/actions/users";
import { 
  fetchTicketComments, 
  addTicketRemark, 
  fetchTicketAuditLogs, 
  updateTicketDetails, 
  generateTeamsMeetingLink 
} from "@/lib/actions/tickets";

interface TicketWorkspaceConsoleProps {
  ticket: any;
  onUpdate: () => void;
  departments: any[];
  priorities: any[];
  states: any[];
  categories: any[];
  subcategories: any[];
  issueTypes: any[];
}

export function TicketWorkspaceConsole({
  ticket,
  onUpdate,
  departments,
  priorities,
  states,
  categories,
  subcategories,
  issueTypes
}: TicketWorkspaceConsoleProps) {
  const { theme } = useTheme();
  const isLightMode = theme === "executive-light";

  // Active Assignees
  const [assigneesList, setAssigneesList] = useState<any[]>([]);

  // Remarks & Audits
  const [comments, setComments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [newRemark, setNewRemark] = useState("");
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [loadingAudits, setLoadingAudits] = useState(false);

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
  const [showTeamsInfo, setShowTeamsInfo] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);

  // Load assignees, comments, audits
  useEffect(() => {
    async function loadInitialData() {
      if (!ticket?.dbId) return;
      
      // Load active assignees
      const activeAssignees = await fetchAssignees();
      setAssigneesList(activeAssignees);

      // Load comments & audits
      setLoadingRemarks(true);
      const commentsData = await fetchTicketComments(ticket.dbId);
      setComments(commentsData);
      setLoadingRemarks(false);

      setLoadingAudits(true);
      const auditsData = await fetchTicketAuditLogs(ticket.dbId);
      setAuditLogs(auditsData);
      setLoadingAudits(false);
    }
    
    // Reset edit fields on ticket switch
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
      // 1. Resolve active status
      const statusCode = ticket.statusObj?.code || "";
      if (statusCode === "ST_RESOLVED" || statusCode === "ST_CLOSED") {
        setSlaStatus("MET");
        setSlaTimeRemaining("SLA MET");
        setSlaPercent(100);
        return;
      }

      // 2. Resolve SLA Limit in Milliseconds
      const priorityCode = ticket.priorityObj?.code || ticket.priorityObj?.name || "STANDARD";
      let slaHours = 24; // Default standard
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

        // Format time remaining
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

  // Update Field Handler
  const handleFieldUpdate = async (fields: {
    title?: string;
    description?: string;
    status_id?: string;
    assignee_id?: string | null;
    department_id?: string;
    priority_id?: string;
    custom_fields?: any;
  }) => {
    if (!ticket?.dbId) return;
    try {
      await updateTicketDetails(ticket.dbId, fields);
      onUpdate();

      // Reload audits to reflect live changes
      const auditsData = await fetchTicketAuditLogs(ticket.dbId);
      setAuditLogs(auditsData);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  // Save Title/Description
  const saveTitleDesc = async () => {
    setSavingDetails(true);
    try {
      await handleFieldUpdate({ title, description });
      setIsEditingDetails(false);
    } finally {
      setSavingDetails(false);
    }
  };

  // Cascading Category Change
  const handleCategoryChange = async (catId: string) => {
    setSelectedCatId(catId);
    setSelectedSubcatId(""); // Reset subcategory

    const updatedCustomFields = {
      ...(ticket?.custom_fields || {}),
      category_id: catId || null,
      subcategory_id: null
    };

    await handleFieldUpdate({ custom_fields: updatedCustomFields });
  };

  // Cascading Subcategory Change
  const handleSubcategoryChange = async (subcatId: string) => {
    setSelectedSubcatId(subcatId);

    const updatedCustomFields = {
      ...(ticket?.custom_fields || {}),
      subcategory_id: subcatId || null
    };

    await handleFieldUpdate({ custom_fields: updatedCustomFields });
  };

  // Submit Remark
  const submitRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemark.trim() || !ticket?.dbId) return;

    setLoadingRemarks(true);
    try {
      await addTicketRemark(ticket.dbId, newRemark);
      setNewRemark("");
      
      // Reload remarks
      const commentsData = await fetchTicketComments(ticket.dbId);
      setComments(commentsData);
    } catch (err: any) {
      alert(`Failed to add remark: ${err.message}`);
    } finally {
      setLoadingRemarks(false);
    }
  };

  // Teams Meeting Creator
  const generateTeamsMeeting = async () => {
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

  // Filter Subcategories based on Category Cascade
  const filteredSubcategories = subcategories.filter(
    (sc) => sc.category_id === selectedCatId
  );

  // Priority and SLA colors resolver
  const getPriorityColor = () => {
    const pCode = ticket.priorityObj?.code || ticket.priorityObj?.name || "";
    if (pCode.includes("CRITICAL") || pCode === "P1") return "text-red-500 bg-red-500/10 border-red-500/20";
    if (pCode.includes("HIGH") || pCode === "P2") return "text-orange-500 bg-orange-500/10 border-orange-500/20";
    if (pCode.includes("MEDIUM") || pCode === "P3") return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    return "text-green-500 bg-green-500/10 border-green-500/20";
  };

  const getSlaBadgeStyles = () => {
    if (slaStatus === "MET") return "bg-green-500/10 text-green-500 border-green-500/20";
    if (slaStatus === "BREACHED") return "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse";
    return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  };

  const getSlaProgressColor = () => {
    if (slaStatus === "MET") return "bg-green-500";
    if (slaStatus === "BREACHED") return "bg-red-500";
    if (slaPercent < 25) return "bg-red-500 animate-pulse";
    if (slaPercent < 50) return "bg-orange-500";
    return "bg-indigo-600";
  };

  if (!ticket) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-8 text-center transition-colors duration-300 ${
        isLightMode ? "bg-gray-50 text-gray-500" : "bg-[#090f1e]/40 text-gray-400"
      }`}>
        <MessageSquare className="h-12 w-12 mb-4 text-indigo-500/40" />
        <p className="text-sm font-bold tracking-tight mb-1">Operational Workspace Console</p>
        <p className="text-xs opacity-75 max-w-sm leading-relaxed">
          Select an active ticket from the operations stream on the left to inspect its details, assign agents, sync Teams calls, and audit lifecycle events.
        </p>
      </div>
    );
  }

  // Details Metadata formatting
  const formattedCreatedTime = ticket.created_at
    ? new Date(ticket.created_at).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short"
      })
    : "Date Unknown";

  const teamsMeetingInfo = ticket.custom_fields?.teams_meeting;

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-all duration-300 ${
      isLightMode ? "bg-gray-50/50 text-gray-900" : "bg-[#090f1e]/60 text-gray-100"
    }`}>
      {/* ── CONSOLE HEADER CONTROLS ── */}
      <header className={`flex flex-wrap items-center justify-between gap-4 p-4 border-b transition-colors duration-300 ${
        isLightMode ? "bg-white border-gray-200" : "bg-[#0f172a]/70 border-white/5"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 text-xs font-bold rounded-lg border ${getPriorityColor()}`}>
            {ticket.priorityObj?.name || "STANDARD"}
          </div>
          <h2 className="text-base font-semibold tracking-tight">
            {ticket.id}
          </h2>
          <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border ${getSlaBadgeStyles()}`}>
            {slaTimeRemaining || "Calculating SLA..."}
          </span>
        </div>

        {/* Console Actions */}
        <div className="flex items-center gap-2">
          {/* Teams Creator Trigger */}
          {teamsMeetingInfo ? (
            <a 
              href={teamsMeetingInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 h-9 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all"
            >
              <Video className="h-4 w-4" />
              <span>Join Teams Meeting</span>
            </a>
          ) : (
            <button 
              onClick={generateTeamsMeeting}
              disabled={isGeneratingTeams}
              className={`flex items-center gap-1.5 px-3 h-9 text-xs font-semibold rounded-lg border transition-all ${
                isLightMode 
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100" 
                  : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
              }`}
            >
              {isGeneratingTeams ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Video className="h-4 w-4" />
              )}
              <span>Create Teams Meeting</span>
            </button>
          )}

          {/* Teams API Setup Informer */}
          <button 
            onClick={() => setShowTeamsInfo(!showTeamsInfo)}
            className={`p-2 rounded-lg border hover:bg-gray-500/10 transition-colors ${
              isLightMode ? "border-gray-200 text-gray-500" : "border-white/5 text-gray-400"
            }`}
            title="Microsoft Teams API Integration Settings"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {/* Printable Report Exporter */}
          <button 
            onClick={() => setShowPrintReport(true)}
            className={`flex items-center gap-1.5 px-3 h-9 text-xs font-semibold rounded-lg border transition-all ${
              isLightMode 
                ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50" 
                : "bg-white/5 border-white/10 text-white hover:bg-white/10"
            }`}
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Audit Report</span>
          </button>
        </div>
      </header>

      {/* SLA Timer Progress Bar */}
      {slaStatus === "ACTIVE" && (
        <div className="w-full h-1 bg-gray-500/15 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${getSlaProgressColor()}`}
            style={{ width: `${slaPercent}%` }}
          />
        </div>
      )}

      {/* ── MAIN WORKSPACE AREA (TWO-COLUMN DASHBOARD) ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* LEFT COLUMN: EDITABLE DETAILS, CLASSIFICATION, REMARKS LOG */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-6 md:border-r border-white/5">
          
          {/* Metadata Card: Generator Info */}
          <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 transition-all duration-300 ${
            isLightMode ? "bg-white border-gray-200" : "bg-[#0f172a]/30 border-white/5"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${isLightMode ? "bg-gray-100" : "bg-white/5"}`}>
                <User className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <p className={`text-[10px] uppercase font-bold tracking-wider ${isLightMode ? "text-gray-400" : "text-gray-600"}`}>
                  Ticket Generator
                </p>
                <h4 className="text-sm font-semibold">
                  {ticket.creator?.full_name || "Self / System User"}
                </h4>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-gray-500" />
                <span className={isLightMode ? "text-gray-600" : "text-gray-400"}>
                  {ticket.creator?.department?.name || "Operations Swarm"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                <span className={isLightMode ? "text-gray-600" : "text-gray-400"}>
                  {formattedCreatedTime}
                </span>
              </div>
            </div>
          </div>

          {/* Teams Integration API Information Banner */}
          {showTeamsInfo && (
            <div className={`p-4 rounded-xl border relative animate-in slide-in-from-top-4 duration-300 ${
              isLightMode ? "bg-indigo-50/50 border-indigo-200/50 text-indigo-900" : "bg-indigo-500/5 border-indigo-500/10 text-indigo-100"
            }`}>
              <button 
                onClick={() => setShowTeamsInfo(false)}
                className="absolute top-3 right-3 text-xs opacity-50 hover:opacity-100 font-bold"
              >
                ✕ Close
              </button>
              <h4 className="text-sm font-bold flex items-center gap-1.5 mb-2">
                <Video className="h-4 w-4 text-indigo-500" />
                Microsoft Teams API Setup Blueprint
              </h4>
              <p className="text-xs opacity-80 leading-relaxed mb-3">
                This environment is currently using secure simulated Teams links. To link your corporate Azure MS Graph Client API:
              </p>
              <ol className="text-xs space-y-2 opacity-90 pl-4 list-decimal leading-relaxed">
                <li>Register an application in Azure Entra ID naming it <code className="px-1.5 py-0.5 rounded bg-gray-500/10">ADIOS Connector</code>.</li>
                <li>Assign Microsoft Graph API <strong className="text-indigo-500">Application Permission</strong> of <code className="px-1.5 py-0.5 rounded bg-gray-500/10">OnlineMeetings.ReadWrite.All</code>.</li>
                <li>Configure the <code className="px-1.5 py-0.5 rounded bg-gray-500/10">AZURE_TENANT_ID</code>, <code className="px-1.5 py-0.5 rounded bg-gray-500/10">AZURE_CLIENT_ID</code>, and client secret values in your background runtime variables.</li>
                <li>Our backend module <code className="px-1 py-0.5 bg-gray-500/10 rounded">generateTeamsMeetingLink</code> in <code className="px-1 py-0.5 bg-gray-500/10 rounded">lib/actions/tickets.ts</code> is pre-wired to execute these live requests instantly when credentials are seeded!</li>
              </ol>
            </div>
          )}

          {/* Details Card (Inline Editable Subject & Description) */}
          <div className={`p-5 rounded-xl border transition-all duration-300 ${
            isLightMode ? "bg-white border-gray-200" : "bg-[#0f172a]/30 border-white/5"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Incident Details
              </span>
              {!isEditingDetails ? (
                <button 
                  onClick={() => setIsEditingDetails(true)}
                  className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 font-semibold"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Modify</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={saveTitleDesc}
                    disabled={savingDetails}
                    className="flex items-center gap-1 text-xs text-green-500 hover:text-green-600 font-bold"
                  >
                    {savingDetails ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>Save</span>
                  </button>
                  <button 
                    onClick={() => {
                      setTitle(ticket.title || "");
                      setDescription(ticket.description || "");
                      setIsEditingDetails(false);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-600 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {isEditingDetails ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Subject</label>
                  <input 
                    type="text"
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      isLightMode 
                        ? "bg-white border-gray-200 text-gray-900" 
                        : "bg-white/5 border-white/10 text-white"
                    }`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Description</label>
                  <textarea 
                    rows={4}
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y ${
                      isLightMode 
                        ? "bg-white border-gray-200 text-gray-900" 
                        : "bg-white/5 border-white/10 text-white"
                    }`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-bold tracking-tight">
                  {ticket.title}
                </h3>
                <p className={`text-sm leading-relaxed whitespace-pre-line ${
                  isLightMode ? "text-gray-600" : "text-gray-300"
                }`}>
                  {ticket.description || "No description provided."}
                </p>
              </div>
            )}
          </div>

          {/* Cascading Classifications Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category selection */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Category (Scope Linked)
              </label>
              <select 
                value={selectedCatId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={`w-full h-10 px-3 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isLightMode 
                    ? "bg-white border-gray-200 text-gray-900" 
                    : "bg-[#1e293b]/70 border-white/5 text-white"
                }`}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Subcategory selection (Cascaded) */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Subcategory
              </label>
              <select 
                value={selectedSubcatId}
                onChange={(e) => handleSubcategoryChange(e.target.value)}
                disabled={!selectedCatId}
                className={`w-full h-10 px-3 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-40 transition-all ${
                  isLightMode 
                    ? "bg-white border-gray-200 text-gray-900" 
                    : "bg-[#1e293b]/70 border-white/5 text-white"
                }`}
              >
                <option value="">
                  {!selectedCatId ? "Select Category First" : "Select Subcategory"}
                </option>
                {filteredSubcategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── REMARKS LOG & INPUT TIMELINE ── */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              <span>Remarks & Collaboration Log</span>
            </h3>

            {/* Comments List */}
            {loadingRemarks ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : comments.length === 0 ? (
              <div className={`p-4 text-center text-xs rounded-xl border border-dashed ${
                isLightMode ? "border-gray-200 text-gray-500" : "border-white/5 text-gray-600"
              }`}>
                No remarks added yet. Type your update below to generate a new remark.
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div 
                    key={comment.id} 
                    className={`p-3 rounded-xl border flex gap-3 transition-all duration-300 ${
                      isLightMode ? "bg-white border-gray-100 shadow-sm" : "bg-[#0f172a]/20 border-white/5"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {comment.author?.profile_photo ? (
                        <img 
                          src={comment.author.profile_photo} 
                          alt={comment.author.full_name} 
                          className="h-8 w-8 rounded-full object-cover border border-white/10"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                          {comment.author?.full_name?.charAt(0).toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold">
                          {comment.author?.full_name || "System Staff"}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className={`text-xs leading-relaxed ${
                        isLightMode ? "text-gray-600" : "text-gray-300"
                      }`}>
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Remark input */}
            <form onSubmit={submitRemark} className="flex gap-2">
              <input 
                type="text"
                placeholder="Add standard remark / update comments..."
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
                className={`flex-1 h-10 px-3 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                  isLightMode 
                    ? "bg-white border-gray-200 text-gray-900" 
                    : "bg-[#1e293b]/70 border-white/5 text-white"
                }`}
              />
              <button 
                type="submit"
                disabled={!newRemark.trim() || loadingRemarks}
                className="px-4 h-10 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-none transition-all flex items-center gap-1.5"
              >
                {loadingRemarks && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Add Remark</span>
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: WORKFLOW CONTROLS, ACTIVE ASSIGNEES, EVENT TIMELINE */}
        <div className={`w-full md:w-80 flex flex-col overflow-y-auto p-4 space-y-6 transition-colors duration-300 ${
          isLightMode ? "bg-gray-50/50 border-t border-gray-200 md:border-t-0" : "bg-[#090f1e]/30 border-t border-white/5 md:border-t-0"
        }`}>
          
          {/* Status Select Card */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Operational Status
            </label>
            <select 
              value={ticket.status_id}
              onChange={(e) => handleFieldUpdate({ status_id: e.target.value })}
              className={`w-full h-11 px-3 border rounded-xl text-xs font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                isLightMode 
                  ? "bg-white border-gray-200 text-gray-900" 
                  : "bg-[#1e293b]/80 border-white/5 text-white"
              }`}
            >
              {states.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Priority Select Card */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Priority Ranking (Triggers SLA)
            </label>
            <select 
              value={ticket.priority_id}
              onChange={(e) => handleFieldUpdate({ priority_id: e.target.value })}
              className={`w-full h-11 px-3 border rounded-xl text-xs font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                isLightMode 
                  ? "bg-white border-gray-200 text-gray-900" 
                  : "bg-[#1e293b]/80 border-white/5 text-white"
              }`}
            >
              {priorities.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Support Team (Department) Select Card */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Support Team (Department)
            </label>
            <select 
              value={ticket.department_id || ""}
              onChange={(e) => handleFieldUpdate({ department_id: e.target.value })}
              className={`w-full h-11 px-3 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                isLightMode 
                  ? "bg-white border-gray-200 text-gray-900" 
                  : "bg-[#1e293b]/80 border-white/5 text-white"
              }`}
            >
              <option value="">Unassigned Team</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Assignee Select Card */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Assigned Staff (Assignee)
            </label>
            <select 
              value={ticket.assignee_id || ""}
              onChange={(e) => handleFieldUpdate({ assignee_id: e.target.value || null })}
              className={`w-full h-11 px-3 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                isLightMode 
                  ? "bg-white border-gray-200 text-gray-900" 
                  : "bg-[#1e293b]/80 border-white/5 text-white"
              }`}
            >
              <option value="">Unassigned Operations Swarm</option>
              {assigneesList.map((usr) => (
                <option key={usr.id} value={usr.id}>
                  {usr.full_name} ({usr.department?.name || "General"})
                </option>
              ))}
            </select>
          </div>

          {/* SLA Targets Cards based on Priority selection */}
          <div className={`p-4 rounded-xl border text-xs space-y-2 transition-all ${
            isLightMode ? "bg-white border-gray-200" : "bg-[#0f172a]/30 border-white/5"
          }`}>
            <h4 className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mb-1">
              Active SLA Metrics
            </h4>
            <div className="flex justify-between items-center">
              <span className="opacity-70">Priority Tier:</span>
              <span className="font-semibold">{ticket.priorityObj?.name || "STANDARD"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-70">Target SLA Limit:</span>
              <span className="font-semibold">
                {(() => {
                  const pCode = ticket.priorityObj?.code || ticket.priorityObj?.name || "STANDARD";
                  if (pCode.includes("CRITICAL") || pCode === "P1") return "1 Hour Resolution";
                  if (pCode.includes("HIGH") || pCode === "P2") return "4 Hours Resolution";
                  if (pCode.includes("MEDIUM") || pCode === "P3") return "24 Hours Resolution";
                  return "48 Hours Resolution";
                })()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-70">Current Performance:</span>
              <span className={`font-bold uppercase ${
                slaStatus === "MET" ? "text-green-500" : slaStatus === "BREACHED" ? "text-red-500 animate-pulse" : "text-yellow-500"
              }`}>
                {slaStatus === "MET" ? "SLA Met" : slaStatus === "BREACHED" ? "SLA Breached" : "Pending Sync"}
              </span>
            </div>
          </div>

          {/* ── LIVE AUDIT TRAIL TIMELINE ── */}
          <div className="space-y-4 flex-1 flex flex-col min-h-[200px]">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <History className="h-4 w-4" />
              <span>Audit Trail Timeline</span>
            </h3>

            {loadingAudits ? (
              <div className="flex items-center justify-center p-4 flex-1">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className={`p-4 text-center text-xs rounded-xl border border-dashed flex-1 flex items-center justify-center ${
                isLightMode ? "border-gray-200 text-gray-500" : "border-white/5 text-gray-600"
              }`}>
                No audits logged yet.
              </div>
            ) : (
              <div className="relative border-l border-white/5 pl-4 ml-2 space-y-4 flex-1 max-h-[300px] overflow-y-auto no-scrollbar">
                {auditLogs.map((log) => {
                  // Clean messages resolver
                  let logDesc = "";
                  if (log.operation === "CREATE") logDesc = "Ticket created.";
                  else if (log.operation === "DELETE") logDesc = "Ticket deleted.";
                  else {
                    const before = log.before_values || {};
                    const after = log.after_values || {};
                    if (before.status_id !== after.status_id) {
                      logDesc = "Transitioned status.";
                    } else if (before.assignee_id !== after.assignee_id) {
                      logDesc = after.assignee_id ? "Assigned staff member." : "Unassigned staff.";
                    } else if (before.department_id !== after.department_id) {
                      logDesc = "Assigned support team.";
                    } else {
                      logDesc = "Ticket details updated.";
                    }
                  }

                  return (
                    <div key={log.id} className="relative text-xs">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] top-0.5 h-2 w-2 rounded-full bg-indigo-500" />
                      <div className="mb-0.5">
                        <strong className="text-gray-400 font-semibold mr-1">
                          {log.actor?.full_name || "Operator"}
                        </strong>
                        <span className={isLightMode ? "text-gray-600" : "text-gray-300"}>
                          {logDesc}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 block">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── 5. EMBEDDED PRINTABLE AUDIT REPORT DIALOG (MODAL) ── */}
      {showPrintReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border animate-in zoom-in-95 duration-200 ${
            isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-[#0f172a] border-white/10 text-white"
          }`}>
            {/* Modal Controls */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20">
              <h3 className="font-bold flex items-center gap-1.5 text-sm">
                <Printer className="h-4 w-4 text-indigo-500" />
                Preview Executive Audit Report
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print / PDF</span>
                </button>
                <button 
                  onClick={() => setShowPrintReport(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Frame */}
            <div id="printable-audit-trail" className="flex-1 overflow-y-auto p-8 space-y-8 bg-white text-black text-left">
              {/* Report Header */}
              <div className="border-b-2 border-gray-900 pb-6 flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 uppercase">
                    Incident Audit Report
                  </h1>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">
                    ADIOS Operations Platform
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-700">{ticket.id}</span>
                  <p className="text-xs text-gray-400 mt-0.5">Generated: {new Date().toLocaleString()}</p>
                </div>
              </div>

              {/* Core Details Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Subject</span>
                  <span className="font-bold text-sm text-gray-800">{ticket.title}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Operational Status</span>
                  <span className="font-bold text-sm text-indigo-600">{ticket.statusObj?.name || "OPEN"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Priority Tier</span>
                  <span className="font-bold text-gray-800">{ticket.priorityObj?.name || "STANDARD"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Support Team</span>
                  <span className="font-semibold text-gray-800">{ticket.departmentObj?.name || "Unassigned Team"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ticket Generator</span>
                  <span className="font-semibold text-gray-800">{ticket.creator?.full_name || "Self / System User"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Generator Department</span>
                  <span className="font-semibold text-gray-800">{ticket.creator?.department?.name || "Operations"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Created On</span>
                  <span className="font-semibold text-gray-800">{formattedCreatedTime}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Assignee</span>
                  <span className="font-bold text-gray-800">{ticket.assignee?.full_name || "Unassigned Swarm"}</span>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-2 border-t border-gray-100 pt-6">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Incident Description</span>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {ticket.description || "No description provided."}
                </p>
              </div>

              {/* Remarks History */}
              <div className="space-y-4 border-t border-gray-100 pt-6">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Remarks & Work Log History
                </h3>
                {comments.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No remarks recorded on this incident log.</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((c) => (
                      <div key={c.id} className="text-xs border-b border-gray-100 pb-3">
                        <div className="flex justify-between items-center mb-1">
                          <strong className="text-gray-800">{c.author?.full_name || "Operator"}</strong>
                          <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-600">{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Immutable Audit Log History */}
              <div className="space-y-4 border-t border-gray-100 pt-6">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  System Audit Trail & State Transitions
                </h3>
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No system audit records logged.</p>
                ) : (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-900 text-[10px] font-bold text-gray-400 uppercase">
                        <th className="py-2">Timestamp</th>
                        <th className="py-2">Authorized Actor</th>
                        <th className="py-2">Action / Transition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => {
                        let desc = "";
                        if (log.operation === "CREATE") desc = "INCIDENT RECORD CREATED";
                        else if (log.operation === "DELETE") desc = "RECORD MARKED DELETED";
                        else {
                          const before = log.before_values || {};
                          const after = log.after_values || {};
                          if (before.status_id !== after.status_id) desc = "STATUS TRANSITIONED";
                          else if (before.assignee_id !== after.assignee_id) desc = "ASSIGNEE RE-ROUTED";
                          else desc = "METADATA FIELDS RE-SAVED";
                        }

                        return (
                          <tr key={log.id} className="border-b border-gray-100 text-gray-600">
                            <td className="py-2.5 font-medium">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="py-2.5 font-bold text-gray-800">{log.actor?.full_name || "System"}</td>
                            <td className="py-2.5 tracking-wider font-semibold text-indigo-600 uppercase text-[10px]">{desc}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Report Footer */}
              <div className="border-t border-gray-200 pt-6 text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                End of Incident Report • Confidentially Protected by ADIOS Security Shield
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for printable reports */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-audit-trail, #printable-audit-trail * {
            visibility: visible;
          }
          #printable-audit-trail {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
        }
      `}</style>

    </div>
  );
}
