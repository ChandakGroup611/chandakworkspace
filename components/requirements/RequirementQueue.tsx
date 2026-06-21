"use client";

import React, { useState } from 'react';
import { useTheme } from "@/components/theme/ThemeProvider";

export function RequirementQueue({ requirements }: { requirements: any[] }) {
  const { theme } = useTheme();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme);
  const [filter, setFilter] = useState('ALL');

  const filtered = filter === 'ALL' 
    ? requirements 
    : requirements.filter(r => r.current_stage === filter || r.approval_status === filter);

  return (
    <div className={`flex flex-col h-full p-6 ${isLightMode ? "bg-gray-50 text-gray-900" : "bg-[#0a0a0b] text-gray-200"}`}>
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isLightMode ? "text-gray-900" : "text-white"}`}>Requirement Queue</h1>
          <p className={`text-sm mt-1 ${isLightMode ? "text-gray-500" : "text-gray-500"}`}>Manage, analyze, and approve enterprise requirements</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['ALL', 'Requirement Registration', 'Planning', 'Pending', 'Approved', 'Rejected'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
                filter === f 
                  ? 'bg-indigo-600 text-white' 
                  : isLightMode ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50' : 'bg-gray-900/50 text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(req => (
          <div key={req.id} className={`rounded-2xl p-5 transition-all group cursor-pointer border ${
            isLightMode ? "bg-white border-gray-200 hover:border-indigo-300 shadow-sm" : "bg-gray-900/40 border-white/10 hover:border-indigo-500/50"
          }`}>
            <div className="flex justify-between items-start mb-3">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                isLightMode ? "bg-indigo-50 text-indigo-700" : "bg-indigo-900/20 text-indigo-400"
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
                  req.tat_status === 'Overdue' ? 'text-red-500' : isLightMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {req.tat_status || 'On Time'}
                </span>
              </div>
            </div>
            
            <h3 className={`font-semibold text-lg leading-tight mb-2 transition-colors line-clamp-2 ${
              isLightMode ? "text-gray-900 group-hover:text-indigo-600" : "text-gray-100 group-hover:text-white"
            }`}>
              {req.title}
            </h3>
            
            <p className={`text-xs line-clamp-2 mb-4 ${isLightMode ? "text-gray-500" : "text-gray-500"}`}>
              {req.objective || req.functional_scope || 'No objective provided.'}
            </p>

            {/* Implementation Progress Bar */}
            <div className="mb-4">
              <div className={`flex justify-between text-[10px] font-bold uppercase mb-1 ${isLightMode ? "text-gray-500" : "text-gray-400"}`}>
                <span>{req.current_stage || 'Unknown Stage'}</span>
                <span>{req.completion_percentage || 0}%</span>
              </div>
              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLightMode ? "bg-gray-100" : "bg-black"}`}>
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500" 
                  style={{ width: `${req.completion_percentage || 0}%` }}
                />
              </div>
            </div>

            <div className={`flex items-center justify-between pt-4 border-t ${isLightMode ? "border-gray-100" : "border-white/5"}`}>
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isLightMode ? "bg-gray-100 border border-gray-200 text-gray-600" : "bg-gray-800 border border-gray-700 text-gray-300"
                }`}>
                  {req.owner?.full_name?.charAt(0) || req.analyst?.full_name?.charAt(0) || '?'}
                </div>
                <span className={`text-[10px] font-medium ${isLightMode ? "text-gray-600" : "text-gray-400"}`}>
                  {req.owner?.full_name || req.analyst?.full_name || 'Unassigned'}
                </span>
              </div>
              <span className={`text-[10px] font-bold uppercase ${isLightMode ? "text-gray-400" : "text-gray-500"}`}>
                {new Date(req.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
        
        {filtered.length === 0 && (
          <div className={`col-span-full py-12 text-center border border-dashed rounded-2xl text-sm ${
            isLightMode ? "text-gray-400 border-gray-200 bg-white" : "text-gray-500 border-white/10"
          }`}>
            No requirements found in this view.
          </div>
        )}
      </div>
    </div>
  );
}
