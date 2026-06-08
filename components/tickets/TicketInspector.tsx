"use client";

import React, { useState } from "react";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { 
  Activity, 
  MessageSquare, 
  Calendar, 
  FileText, 
  Clock, 
  User, 
  ChevronRight, 
  Maximize2,
  Paperclip,
  ShieldCheck,
  Building
} from "lucide-react";
import { TicketActivityStream } from "@/components/tickets/TicketActivityStream";
import { TicketChat } from "@/components/tickets/TicketChat";
import { useTheme } from "@/components/theme/ThemeProvider";

interface TicketInspectorProps {
  ticket: any;
  onRefresh: () => void;
}

export function TicketInspector({ ticket, onRefresh }: TicketInspectorProps) {
  const [activeTab, setActiveTab] = useState<"DETAILS" | "COLLAB" | "TIMELINE">("DETAILS");
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);

  if (!ticket) {
    return (
      <div className={`h-full flex flex-col items-center justify-center text-center p-8 space-y-4 ${
        isLightMode ? "bg-gray-50/50" : "bg-transparent"
      }`}>
        <div className={`p-4 rounded-3xl ${isLightMode ? "bg-gray-100" : "bg-white/5"}`}>
          <Activity className={`h-10 w-10 ${isLightMode ? "text-gray-400" : "text-gray-700"}`} />
        </div>
        <div className="space-y-1">
          <h3 className={`text-xl font-bold ${isLightMode ? "text-gray-900" : "text-white"}`}>Select a Ticket to Inspect</h3>
          <p className="text-sm text-gray-500 max-w-xs">Select an operational record from the sidebar to view full diagnostic data and collaboration history.</p>
        </div>
      </div>
    );
  }

  const priority = ticket.priorityObj;
  const status = ticket.statusObj;
  const dept = ticket.departmentObj;

  return (
    <div className={`h-full flex flex-col animate-in fade-in duration-500 transition-colors duration-300 ${
      isLightMode ? "bg-white" : "bg-[#070913]"
    }`}>
      {/* Header Banner */}
      <div className={`p-8 border-b space-y-6 ${isLightMode ? "border-gray-100 bg-white" : "border-white/5 bg-transparent"}`}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
                isLightMode ? "text-indigo-600 bg-indigo-50" : "text-indigo-400 bg-indigo-500/10"
              }`}>
                {ticket.id}
              </span>
              <div className={`h-4 w-px ${isLightMode ? "bg-gray-200" : "bg-white/10"}`} />
              <AppBadge variant={status?.code === "ST_OPEN" ? "info" : "success"} className="rounded-full">
                {status?.name || "Active"}
              </AppBadge>
            </div>
            <h2 className={`text-2xl font-bold tracking-tight ${isLightMode ? "text-gray-900" : "text-white"}`}>{ticket.title}</h2>
          </div>
        </div>

        {/* Bento Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 border rounded-2xl space-y-2 ${isLightMode ? "bg-gray-50 border-gray-100" : "bg-white/[0.02] border-white/5"}`}>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
              <ShieldCheck className="h-3 w-3" /> Priority
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                priority?.code === "PRIO_CRIT_P1" ? "bg-red-500" : (isLightMode ? "bg-indigo-600" : "bg-indigo-500")
              }`} />
              <span className={`text-sm font-semibold ${isLightMode ? "text-gray-900" : "text-white"}`}>{priority?.name || "Medium"}</span>
            </div>
          </div>

          <div className={`p-4 border rounded-2xl space-y-2 ${isLightMode ? "bg-gray-50 border-gray-100" : "bg-white/[0.02] border-white/5"}`}>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
              <Building className="h-3 w-3" /> Department
            </div>
            <span className={`text-sm font-semibold truncate block ${isLightMode ? "text-gray-900" : "text-white"}`}>{dept?.name || "General"}</span>
          </div>

          <div className={`p-4 border rounded-2xl space-y-2 ${isLightMode ? "bg-gray-50 border-gray-100" : "bg-white/[0.02] border-white/5"}`}>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
              <User className="h-3 w-3" /> Assignee
            </div>
            <span className={`text-sm font-semibold truncate block ${isLightMode ? "text-gray-900" : "text-white"}`}>{ticket.assignedTo || "Unassigned"}</span>
          </div>

          <div className={`p-4 border rounded-2xl space-y-2 ${isLightMode ? "bg-gray-50 border-gray-100" : "bg-white/[0.02] border-white/5"}`}>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
              <Clock className="h-3 w-3" /> Created
            </div>
            <span className={`text-sm font-semibold ${isLightMode ? "text-gray-900" : "text-white"}`}>
              {new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={`px-8 border-b flex items-center gap-8 ${isLightMode ? "border-gray-100 bg-white" : "border-white/5 bg-transparent"}`}>
        {(["DETAILS", "COLLAB", "TIMELINE"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-4 text-[0.8rem] font-bold uppercase tracking-widest transition-all relative ${
              activeTab === tab 
                ? (isLightMode ? "text-indigo-600" : "text-white") 
                : "text-gray-500 hover:text-gray-400"
            }`}
          >
            {tab === "COLLAB" ? "Collaboration" : tab === "DETAILS" ? "Technical Data" : "Audit Trail"}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
        ))}
      </div>

      {/* Dynamic Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        {activeTab === "DETAILS" && (
          <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Subject Overview</h3>
              <div className={`p-6 border rounded-2xl ${isLightMode ? "bg-gray-50 border-gray-100" : "bg-white/[0.03] border-white/5"}`}>
                <p className={`leading-relaxed whitespace-pre-wrap ${isLightMode ? "text-gray-700 font-medium" : "text-gray-300"}`}>{ticket.description}</p>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Classification</h3>
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Category</span>
                    <span className={`font-medium ${isLightMode ? "text-gray-900" : "text-white"}`}>{ticket.categoryObj?.name || "Unclassified"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Sub-Category</span>
                    <span className={`font-medium ${isLightMode ? "text-gray-900" : "text-white"}`}>{ticket.subcategoryObj?.name || "Unclassified"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Issue Type</span>
                    <span className={`font-medium ${isLightMode ? "text-gray-900" : "text-white"}`}>{ticket.issueTypeObj?.name || "General"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Attachments</h3>
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 min-h-[140px]">
                  <div className="p-3 bg-white/5 rounded-full">
                    <Paperclip className="h-5 w-5 text-gray-600" />
                  </div>
                  <p className="text-xs text-gray-600">No diagnostic files attached</p>
                  <AppButton variant="ghost" size="sm" className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-white/5">
                    Upload File
                  </AppButton>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "COLLAB" && (
          <div className="h-full animate-in fade-in duration-300">
            <TicketChat ticket={ticket} />
          </div>
        )}

        {activeTab === "TIMELINE" && (
          <div className="h-full animate-in fade-in duration-300">
            <TicketActivityStream ticket={ticket} />
          </div>
        )}
      </div>
    </div>
  );
}
