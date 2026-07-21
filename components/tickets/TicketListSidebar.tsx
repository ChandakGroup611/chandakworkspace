"use client";

import React from "react";
import { Search, Filter, Clock, User, AlertCircle, Hash, Eye, Edit2, Trash2 } from "lucide-react";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { useTheme } from "@/components/theme/ThemeProvider";

interface TicketListSidebarProps {
  tickets: any[];
  selectedTicketId: string | null;
  onSelect: (ticket: any) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDept: string;
  onDeptChange: (dept: string) => void;
  departments: any[];
}

export function TicketListSidebar({
  tickets,
  selectedTicketId,
  onSelect,
  searchQuery,
  onSearchChange,
  selectedDept,
  onDeptChange,
  departments
}: TicketListSidebarProps) {
  const { theme } = useTheme();
  const isLightMode = ["light-neumorphic", "glassmorphism", "pure-white"].includes(theme);

  return (
    <div className={`flex flex-col h-full overflow-hidden border-r transition-colors duration-300 ${ "theme-card-structural " }`}>
      {/* Filters Area */}
      <div className={`p-4 space-y-4 border-b ${
        "border-border bg-elevated/50/30"
      }`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input 
            type="text"
            placeholder="Search tickets..."
            className={`w-full h-10 pl-10 pr-4 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/50 ${
              "bg-white border-border text-foreground placeholder:text-gray-400"
            }`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <AppButton 
            onClick={() => onDeptChange("ALL")}
            variant={selectedDept === "ALL" ? "primary" : "ghost"}
            size="sm"
            className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
              selectedDept === "ALL" 
                ? "bg-accent text-white hover:bg-accent-secondary" 
                : ""
            }`}
          >
            All Departments
          </AppButton>
          {departments.map(dept => (
            <AppButton 
              key={dept.id}
              onClick={() => onDeptChange(dept.id)}
              variant={selectedDept === dept.id ? "primary" : "ghost"}
              size="sm"
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                selectedDept === dept.id 
                  ? "bg-accent text-white hover:bg-accent-secondary" 
                  : ""
              }`}
            >
              {dept.name}
            </AppButton>
          ))}
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
            <div className="p-3 bg-white/5 rounded-full">
              <Hash className="h-6 w-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">No tickets found</p>
          </div>
        ) : (
          tickets.map(ticket => {
            const isSelected = selectedTicketId === ticket.dbId || selectedTicketId === ticket.id;
            const priority = ticket.priorityObj;
            
            return (
              <div
                key={ticket.dbId || ticket.id}
                onClick={() => onSelect(ticket)}
                className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group border cursor-pointer ${
                  isSelected 
                    ? ("bg-accent/10 border-accent/30 shadow-sm")
                    : ("hover:bg-elevated/50 border-transparent")
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-xs font-mono font-bold uppercase tracking-wider text-accent`}>
                    {ticket.id}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className={`h-1.5 w-1.5 rounded-full ${
                      priority?.code === "PRIO_CRIT_P1" ? "bg-red-500" : 
                      priority?.code === "PRIO_HIGH_P2" ? "bg-amber-500" : "bg-accent"
                    }`} />
                    <span className="text-xs text-gray-500 font-medium">
                      {priority?.name || "P3"}
                    </span>
                  </div>
                </div>

                <h4 className={`text-sm font-semibold mb-2 line-clamp-1 transition-colors ${
                  isSelected 
                    ? ("text-accent-secondary") 
                    : ("text-foreground group-hover:text-accent")
                }`}>
                  {ticket.title}
                </h4>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate max-w-[80px]">{ticket.assignedTo || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-3 flex flex-col gap-3 animate-in fade-in slide-in-from-left-2">
                    <div className="flex items-center gap-2">
                      <AppBadge variant={ticket.statusObj?.code === "ST_OPEN" ? "info" : "success"} className="text-[0.65rem] py-0 px-1.5">
                        {ticket.statusObj?.name || "Active"}
                      </AppBadge>
                      <span className="text-[0.65rem] text-indigo-300 font-medium bg-indigo-400/10 px-1.5 rounded">
                        SLA: STABLE
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AppButton variant="ghost" size="sm" className="h-7 w-7 p-0 rounded bg-accent/10 text-accent hover:bg-accent/20" title="View" onClick={(e) => e.stopPropagation()}>
                        <Eye className="h-3.5 w-3.5" />
                      </AppButton>
                      <AppButton variant="ghost" size="sm" className="h-7 w-7 p-0 rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" title="Update" onClick={(e) => e.stopPropagation()}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </AppButton>
                      <AppButton variant="ghost" size="sm" className="h-7 w-7 p-0 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20" title="Delete" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </AppButton>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Stats Summary */}
      <div className={`p-4 border-t transition-colors duration-300 ${
        "border-border bg-elevated/50/30"
      } flex items-center justify-between`}>
        <span className="text-xs text-gray-500 font-medium">{tickets.length} Incidents Found</span>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-gray-500">Realtime Sync Active</span>
        </div>
      </div>
    </div>
  );
}

