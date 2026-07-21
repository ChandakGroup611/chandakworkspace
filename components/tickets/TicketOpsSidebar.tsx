"use client";

import React, { useState, useEffect } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { 
  Clock, 
  ShieldAlert, 
  UserPlus, 
  Eye, 
  Workflow, 
  CheckCircle2, 
  Pause,
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface TicketOpsSidebarProps {
  ticket: any;
  onAction: (action: string) => void;
}

export function TicketOpsSidebar({ ticket, onAction }: TicketOpsSidebarProps) {
  const [timeLeft, setTimeLeft] = useState(240); // Initial minutes from priority
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);
  
  useEffect(() => {
    if (ticket?.priorityObj?.sla_target_minutes) {
      setTimeLeft(ticket.priorityObj.sla_target_minutes);
    }
  }, [ticket]);

  if (!ticket) return <div className={`w-80 border-l theme-card-structural`} />;

  const slaPercentage = Math.max(0, Math.min(100, (timeLeft / (ticket.priorityObj?.sla_target_minutes || 240)) * 100));
  const isStable = slaPercentage > 30;

  return (
    <div className={`w-80 flex flex-col h-full border-l overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 transition-colors duration-300 ${ "theme-card-structural " }`}>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        
        {/* SLA Engine Block */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">SLA Performance</h3>
            <AppBadge variant={isStable ? "success" : "warning"} className="text-[0.65rem] py-0">STABLE</AppBadge>
          </div>
          <div className={`p-5 border rounded-2xl space-y-4 ${
            "bg-elevated/50 border-border"
          }`}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className={`text-2xl font-bold tabular-nums ${"text-foreground"}`}>{timeLeft}m</span>
                <p className="text-xs text-gray-500 font-medium">Until Resolution Breach</p>
              </div>
              <div className={`p-3 rounded-xl bg-accent/10`}>
                <Clock className={`h-5 w-5 text-accent`} />
              </div>
            </div>
            <div className="space-y-2">
              <div className={`h-1.5 w-full rounded-full overflow-hidden bg-gray-200`}>
                <div 
                  className={`h-full transition-all duration-1000 ${isStable ? "bg-accent" : "bg-amber-500"}`}
                  style={{ width: `${slaPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[0.65rem] text-gray-500 font-bold uppercase tracking-tighter">
                <span>0m</span>
                <span>{ticket.priorityObj?.sla_target_minutes || 240}m Target</span>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Actions */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Workflow Actions</h3>
          <div className="grid grid-cols-1 gap-2">
            <AppButton 
              className={`w-full justify-start text-xs py-5 border ${
                "bg-accent/10 border-accent/30 text-accent hover:bg-accent/10"
              }`}
              onClick={() => onAction("ASSIGN")}
            >
              <UserPlus className="h-4 w-4 mr-3" /> Assign to Me
            </AppButton>
            <AppButton 
              variant="secondary"
              className={`w-full justify-start text-xs py-5 border ${
                "bg-white border-border text-muted hover:bg-elevated/50 shadow-sm"
              }`}
              onClick={() => onAction("RESOLVE")}
            >
              <CheckCircle2 className="h-4 w-4 mr-3 text-emerald-500" /> Mark as Resolved
            </AppButton>
            <div className="grid grid-cols-2 gap-2">
              <AppButton 
                variant="ghost" 
                className={`text-xs h-10 border bg-elevated/50 border-border text-muted`}
                onClick={() => onAction("HOLD")}
              >
                <Pause className="h-3 w-3 mr-2" /> Put on Hold
              </AppButton>
              <AppButton 
                variant="ghost" 
                className={`text-xs h-10 border bg-elevated/50 border-border text-muted`}
                onClick={() => onAction("ESCALATE")}
              >
                <AlertTriangle className="h-3 w-3 mr-2" /> Escalate
              </AppButton>
            </div>
            <AppButton 
              variant="ghost" 
              className={`w-full justify-start text-red-500/80 hover:text-red-600 hover:bg-red-50 text-xs h-10 mt-2 border ${
                "border-red-100"
              }`}
              onClick={() => {
                if(confirm("Confirm permanent removal from active operations?")) {
                  onAction("DELETE");
                }
              }}
            >
              <AlertTriangle className="h-3 w-3 mr-2" /> Purge Ticket Record
            </AppButton>
          </div>
        </section>

        {/* Watchers Registry */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Watchers</h3>
            <span className="text-xs text-accent font-bold cursor-pointer">Manage</span>
          </div>
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white bg-accent ${
                "border-white"
              }`}>
                JD
              </div>
            ))}
            <AppButton variant="secondary" className={`h-8 w-8 rounded-full border-2 border-dashed flex items-center justify-center transition-colors ${
              "border-border bg-elevated/50 text-gray-400 hover:bg-elevated/50"
            }`}>
              <UserPlus className="h-3 w-3" />
            </AppButton>
          </div>
        </section>

        {/* Attachment Zone */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Quick Attachments</h3>
          <div className={`p-4 border border-dashed rounded-2xl flex flex-col items-center justify-center text-center space-y-2 py-8 transition-colors cursor-pointer group ${
            "border-border bg-elevated/50/50 hover:bg-elevated/50/50"
          }`}>
            <div className={`p-2 rounded-lg bg-white group-hover:bg-accent/10`}>
              <Eye className={`h-4 w-4 text-gray-400 group-hover:text-accent`} />
            </div>
            <p className="text-[0.7rem] text-gray-500">Drop files to link</p>
          </div>
        </section>
      </div>

      {/* Sticky Bottom Actions */}
      <div className={`p-4 border-t flex items-center justify-between ${
        "bg-elevated/50 border-border"
      }`}>
        <AppButton variant="secondary" className={`p-2 rounded-lg transition-colors hover:bg-gray-200 text-gray-400`}>
          <Workflow className="h-4 w-4" />
        </AppButton>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Governance ID: 9910-E</span>
      </div>
    </div>
  );
}

