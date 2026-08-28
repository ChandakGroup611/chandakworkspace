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
import SafeHtml from "@/components/ui/SafeHtml";

interface TicketInspectorProps {
  ticket: any;
  onRefresh: () => void;
}

export function TicketInspector({ ticket, onRefresh }: TicketInspectorProps) {
  const [activeTab, setActiveTab] = useState<"DETAILS" | "COLLAB" | "TIMELINE">("DETAILS");
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"].includes(theme);

  if (!ticket) {
    return (
      <div className={`h-full flex flex-col items-center justify-center text-center p-8 space-y-4 ${
        "bg-elevated/50"
      }`}>
        <div className={`p-4 rounded-3xl bg-elevated`}>
          <Activity className={`h-10 w-10 text-muted`} />
        </div>
        <div className="space-y-1">
          <h3 className={`text-2xl font-bold text-foreground"}`}>Select a Ticket to Inspect</h3>
          <p className="text-sm text-muted max-w-xs">Select an operational record from the sidebar to view full diagnostic data and collaboration history.</p>
        </div>
      </div>
    );
  }

  const priority = ticket.priorityObj;
  const status = ticket.statusObj;
  const dept = ticket.departmentObj;

  return (
    <div className={`h-full flex flex-col animate-in fade-in duration-500 transition-colors duration-300 ${
      "bg-surface"
    }`}>
      {/* Header Banner */}
      <div className={`p-8 border-b space-y-6 theme-card-structural`}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
                "text-theme-icon bg-theme-btn-primary/10"
              }`}>
                {ticket.id}
              </span>
              <div className={`h-4 w-px bg-elevated`} />
              <AppBadge variant={status?.code === "ST_OPEN" ? "info" : "success"} className="rounded-full">
                {status?.name || "Active"}
              </AppBadge>
            </div>
            <h2 className={`text-2xl font-bold text-foreground"}`}>{ticket.title}</h2>
          </div>
        </div>

        {/* Bento Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 border rounded-2xl space-y-2 bg-elevated border-border`}>
            <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-widest">
              <ShieldCheck className="h-3 w-3" /> Priority
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                priority?.code === "PRIO_CRIT_P1" ? "bg-danger" : ("bg-theme-btn-primary")
              }`} />
              <span className={`text-sm font-semibold ${"text-foreground"}`}>{priority?.name || "Medium"}</span>
            </div>
          </div>

          <div className={`p-4 border rounded-2xl space-y-2 bg-elevated border-border`}>
            <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-widest">
              <Building className="h-3 w-3" /> Department
            </div>
            <span className={`text-sm font-semibold truncate block ${"text-foreground"}`}>{dept?.name || "General"}</span>
          </div>

          <div className={`p-4 border rounded-2xl space-y-2 bg-elevated border-border`}>
            <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-widest">
              <User className="h-3 w-3" /> Assignee
            </div>
            <span className={`text-sm font-semibold truncate block ${"text-foreground"}`}>{ticket.assignedTo || "Unassigned"}</span>
          </div>

          <div className={`p-4 border rounded-2xl space-y-2 bg-elevated border-border`}>
            <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-widest">
              <Clock className="h-3 w-3" /> Created
            </div>
            <span className={`text-sm font-semibold ${"text-foreground"}`}>
              {new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={`px-8 border-b flex items-center gap-8 theme-card-structural`}>
        {(["DETAILS", "COLLAB", "TIMELINE"] as const).map((tab) => (
          <AppButton 
            variant={activeTab === tab ? "primary" : "ghost"}
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`theme-tab-standard uppercase tracking-widest ${
              activeTab === tab 
                ? "shadow-theme-btn-primary/20 shadow-md scale-[1.02]" 
                : "text-muted hover:text-foreground border border-transparent hover:border-border/60"
            }`}
          >
            {tab === "COLLAB" ? "Collaboration" : tab === "DETAILS" ? "Technical Data" : "Audit Trail"}
          </AppButton>
        ))}
      </div>

      {/* Dynamic Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        {activeTab === "DETAILS" && (
          <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-muted uppercase tracking-widest">Subject Overview</h3>
              <div className={`p-6 border rounded-2xl bg-elevated border-border`}>
                <div className="leading-relaxed text-muted font-medium">
                  <SafeHtml html={ticket.description || "No description provided."} />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-muted uppercase tracking-widest">Classification</h3>
                <div className="p-6 theme-card-structural /[0.02] border-border rounded-2xl space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">Category</span>
                    <span className={`font-medium ${"text-foreground"}`}>{ticket.categoryObj?.name || "Unclassified"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">Sub-Category</span>
                    <span className={`font-medium ${"text-foreground"}`}>{ticket.subcategoryObj?.name || "Unclassified"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">Issue Type</span>
                    <span className={`font-medium ${"text-foreground"}`}>{ticket.issueTypeObj?.name || "General"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-muted uppercase tracking-widest">Attachments</h3>
                <div className="p-6 theme-card-structural /[0.02] border-border rounded-2xl flex flex-col items-center justify-center text-center space-y-3 min-h-[140px]">
                  <div className="p-3 bg-surface/5 rounded-full">
                    <Paperclip className="h-5 w-5 text-subtle" />
                  </div>
                  <p className="text-xs text-subtle">No diagnostic files attached</p>
                  <AppButton variant="ghost" size="sm" className="text-xs text-theme-icon hover:text-indigo-300 hover:bg-surface/5">
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

