"use client";

import React, { useState } from 'react';

export function RequirementQueue({ requirements }: { requirements: any[] }) {
  const [filter, setFilter] = useState('ALL');

  const filtered = filter === 'ALL' 
    ? requirements 
    : requirements.filter(r => r.status?.status_name === filter);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0b] text-gray-200 p-6">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Requirement Queue</h1>
          <p className="text-sm text-gray-500 mt-1">Manage, analyze, and approve enterprise requirements</p>
        </div>
        <div className="flex gap-2">
          {['ALL', 'NEW', 'UNDER_REVIEW', 'ANALYSIS', 'UAT'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-900/50 text-gray-400 hover:text-white'}`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(req => (
          <div key={req.id} className="bg-gray-900/40 border border-white/10 rounded-2xl p-5 hover:border-indigo-500/50 transition-colors group cursor-pointer">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-900/20 px-2 py-1 rounded-md">
                {req.department?.name || 'Cross-Functional'}
              </span>
              <span className="text-xs font-bold text-gray-500" style={{ color: req.status?.status_color }}>
                {req.status?.status_name || 'UNKNOWN'}
              </span>
            </div>
            
            <h3 className="font-semibold text-gray-100 text-lg leading-tight mb-2 group-hover:text-white transition-colors line-clamp-2">
              {req.title}
            </h3>
            
            <p className="text-xs text-gray-500 line-clamp-2 mb-4">
              {req.business_justification}
            </p>

            {/* Implementation Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase mb-1">
                <span>Implementation</span>
                <span>{req.completion_percentage}%</span>
              </div>
              <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500" 
                  style={{ width: `${req.completion_percentage}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-300">
                  {req.analyst?.full_name?.charAt(0) || '?'}
                </div>
                <span className="text-xs text-gray-400">{req.analyst?.full_name || 'Unassigned'}</span>
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase">
                {new Date(req.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
        
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
            No requirements found in this view.
          </div>
        )}
      </div>
    </div>
  );
}
