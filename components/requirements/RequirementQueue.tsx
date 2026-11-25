"use client";

import React, { useState } from 'react';
import { useTheme } from "@/components/theme/ThemeProvider";
import { AppButton } from "@/components/ui/AppButton";
import { formatDate } from "@/components/ui/data";

export function RequirementQueue({ requirements }: { requirements: any[] }) {
  const { isLight: isLightMode } = useTheme();
  const [filter, setFilter] = useState('ALL');

  const filtered = filter === 'ALL' 
    ? requirements 
    : requirements.filter(r => r.current_stage === filter || r.approval_status === filter);

  return (
    <div className={`flex flex-col h-full p-6 bg-surface text-foreground`}>
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading `}>Requirement queue</h1>
          
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
          <div key={req.id} className={`rounded-2xl p-5 transition-all group cursor-pointer ${ "theme-card-structural hover:border-theme-btn-primary/30 shadow-sm" }`}>
            <div className="flex justify-between items-start mb-3">
              <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${
                "bg-accent-soft text-theme-icon"
              }`}>
                {req.code || req.department?.name || 'REQ'}
              </span>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  req.approval_status === 'Approved' ? 'bg-success-soft text-success-text' :
                  req.approval_status === 'Rejected' ? 'bg-danger-soft text-danger-text' :
                  'bg-warning-soft text-warning-text'
                }`}>
                  {req.approval_status || 'Draft'}
                </span>
                <span className={`text-[11px] font-bold ${
                  req.tat_status === 'Overdue' ? 'text-danger-text' : "text-muted"
                }`}>
                  {req.tat_status || 'On Time'}
                </span>
              </div>
            </div>
            
            <h3 className={`font-semibold text-lg leading-tight mb-2 transition-colors line-clamp-2 ${
              "text-foreground group-hover:text-theme-icon"
            }`}>
              {req.title}
            </h3>
            
            <p className={`text-xs line-clamp-2 mb-4 text-muted`}>
              {req.objective || req.functional_scope || 'No objective provided.'}
            </p>

            {/* Implementation Progress Bar */}
            <div className="mb-4">
              <div className={`flex justify-between text-[11px] font-bold mb-1 text-muted`}>
                <span>{req.current_stage || 'Unknown Stage'}</span>
                <span>{req.completion_percentage || 0}%</span>
              </div>
              <div className={`h-1.5 w-full rounded-full overflow-hidden bg-surface`}>
                <div 
                  className="h-full bg-theme-btn-primary transition-all duration-500" 
                  style={{ width: `${req.completion_percentage || 0}%` }}
                />
              </div>
            </div>

            <div className={`flex items-center justify-between pt-4 border-t border-border`}>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${ "theme-card-structural text-muted" }`}>
                  {req.owner?.full_name?.charAt(0) || req.analyst?.full_name?.charAt(0) || '?'}
                </div>
                <span className={`text-[11px] font-medium text-muted`}>
                  {req.owner?.full_name || req.analyst?.full_name || 'Unassigned'}
                </span>
              </div>
              <span className={`text-[11px] font-bold text-muted`}>
                {formatDate(req.created_at)}
              </span>
            </div>
          </div>
        ))}
        
        {filtered.length === 0 && (
          <div className={`col-span-full py-12 text-center rounded-lg text-sm ${ "text-muted theme-card-structural " }`}>
            No requirements found in this view.
          </div>
        )}
      </div>
    </div>
  );
}

