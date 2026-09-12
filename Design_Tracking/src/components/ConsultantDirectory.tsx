"use client";

import React from "react";
import { ConsultantPartner } from "../types";
import { Users, Mail, Phone, Building, Star, Clock } from "lucide-react";

interface ConsultantDirectoryProps {
  consultants: ConsultantPartner[];
}

export const ConsultantDirectory: React.FC<ConsultantDirectoryProps> = ({
  consultants
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="p-4 rounded-2xl border border-border bg-slate-50/60 dark:bg-slate-900/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            <span>Empanelled Design Consultants & Engineering Partners</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Architecture, structural engineering, MEP clash coordinators, and landscape firms
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {consultants.map((c) => (
          <div key={c.id} className="p-5 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-foreground">{c.name}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    {c.category}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span>Lead Contact:</span>
                  <strong className="text-foreground">{c.leadContact}</strong>
                </div>
              </div>

              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span>{c.rating}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{c.email}</span>
              </a>
              <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{c.phone}</span>
              </a>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Submitted Drawings:</span>
                <span className="font-mono font-bold text-foreground text-sm">{c.totalDrawingsSubmitted} Sheets</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Average TAT:</span>
                <span className="font-mono font-bold text-foreground text-sm flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>{c.averageTatDays} days</span>
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                Active Project Assignments:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {c.activeProjects.map((proj, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-foreground border border-border">
                    {proj}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
