"use client";

import React, { useState } from 'react';
import { useTheme } from "@/components/theme/ThemeProvider";
import { AppButton } from "@/components/ui/AppButton";

export function RequirementQueue({ requirements }: { requirements: any[] }) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
  const [filter, setFilter] = useState('ALL');

  const filtered = filter === 'ALL' 
    ? requirements 
    : requirements.filter(r => r.current_stage === filter || r.approval_status === filter);

  return (
    <div className={`flex flex-col h-full p-6 bg-gray-50 text-foreground`}>
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight text-foreground`}>Requirement Queue</h1>
          <p className={`text-sm mt-1 text-muted`}>Manage, analyze, and approve enterprise requirements</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['ALL', 'Requirement Registration', 'Planning', 'Pending', 'Approved', 'Rejected'].map(f => (
            <AppButton 
              key={f}
              onClick={() => setFilter(f)}
              variant={filter === f ? 'primary' : 'outline'}
              size="sm"
              className="rounded-xl text-xs font-bold"
            >
              {f.replace('_', ' ')}
            </AppButton>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(req => (
          <div key={req.id} className={`rounded-2xl p-5 transition-all group cursor-pointer border ${
            "bg-surface border-border hover:border-accent/30 shadow-[var(--shadow-ambient)]"
          }`}>
            <div className="flex justify-between items-start mb-3">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                "bg-accent/10 text-accent"
              }`}>
                {req.code || req.department?.name || 'REQ'}
              </span>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  req.approval_status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                  req.approval_status === 'Rejected' ? 'bg-red-500/10 text-red-500' :
                  'bg-amber-500/10 text-amber-500'
                }`}>
                  {req.approval_status || 'Draft'}
                </span>
                <span className={`text-[9px] font-bold uppercase ${
                  req.tat_status === 'Overdue' ? 'text-red-500' : "text-gray-400"
                }`}>
                  {req.tat_status || 'On Time'}
                </span>
              </div>
            </div>
            
            <h3 className={`font-semibold text-lg leading-tight mb-2 transition-colors line-clamp-2 ${
              "text-foreground group-hover:text-accent"
            }`}>
              {req.title}
            </h3>
            
            <p className={`text-xs line-clamp-2 mb-4 text-muted`}>
              {req.objective || req.functional_scope || 'No objective provided.'}
            </p>

            {/* Implementation Progress Bar */}
            <div className="mb-4">
              <div className={`flex justify-between text-[10px] font-bold uppercase mb-1 text-muted`}>
                <span>{req.current_stage || 'Unknown Stage'}</span>
                <span>{req.completion_percentage || 0}%</span>
              </div>
              <div className={`h-1.5 w-full rounded-full overflow-hidden bg-gray-100`}>
                <div 
                  className="h-full bg-accent transition-all duration-500" 
                  style={{ width: `${req.completion_percentage || 0}%` }}
                />
              </div>
            </div>

            <div className={`flex items-center justify-between pt-4 border-t border-border`}>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  "bg-gray-100 border border-border text-muted"
                }`}>
                  {req.owner?.full_name?.charAt(0) || req.analyst?.full_name?.charAt(0) || '?'}
                </div>
                <span className={`text-[10px] font-medium text-muted`}>
                  {req.owner?.full_name || req.analyst?.full_name || 'Unassigned'}
                </span>
              </div>
              <span className={`text-[10px] font-bold uppercase text-gray-400`}>
                {new Date(req.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
        
        {filtered.length === 0 && (
          <div className={`col-span-full py-12 text-center border border-dashed rounded-2xl text-sm ${
            "text-gray-400 border-border bg-white"
          }`}>
            No requirements found in this view.
          </div>
        )}
      </div>
    </div>
  );
}
