"use client";

import React, { useState, useEffect } from "react";
import './dashboard.css'; // The extracted and scoped CSS

import MetricsRow from "./panels/MetricsRow";
import HealthGrid from "./panels/HealthGrid";
import ChartsRow from "./panels/ChartsRow";
import SprintKanbanBoard from "./panels/SprintKanbanBoard";
import RecentTicketsTable from "./panels/RecentTicketsTable";
import ActivityFeed from "./panels/ActivityFeed";
import UpcomingDeadlines from "./panels/UpcomingDeadlines";
import TeamPerformance from "./panels/TeamPerformance";

interface DashboardCommandCenterProps {
  metrics?: any[];
  dbError?: string | null;
}

export default function DashboardCommandCenter({ metrics = [], dbError }: DashboardCommandCenterProps) {
  const [mounted, setMounted] = useState(false);
  const [globalScope, setGlobalScope] = useState<string>("All");
  const [globalUser, setGlobalUser] = useState<string>("All");
  const [globalStatus, setGlobalStatus] = useState<string>("All");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ padding: '2rem', color: '#8b91a8', fontFamily: 'monospace' }}>Loading Exact Match Dashboard...</div>;
  }

  // Get unique users for the dropdown
  const uniqueUsers = Array.from(new Set(metrics.filter(m => m.user && m.user !== 'System').map(m => String(m.user))));

  // Filter metrics based on global filters
  const filteredMetrics = metrics.filter(m => {
    const scopeMatch = globalScope === "All" || m.module === globalScope;
    const userMatch = globalUser === "All" || String(m.user) === globalUser;
    
    let statusMatch = true;
    if (globalStatus !== "All") {
      const sLower = String(m.status).toLowerCase();
      if (globalStatus === "Active" && !sLower.includes('resolv') && !sLower.includes('done')) statusMatch = true;
      else if (globalStatus === "Resolved" && (sLower.includes('resolv') || sLower.includes('done'))) statusMatch = true;
      else if (globalStatus === "Escalated" && (sLower.includes('escalat') || sLower.includes('block'))) statusMatch = true;
      else if (globalStatus === "Review" && sLower.includes('review')) statusMatch = true;
      else statusMatch = false;
    }

    return scopeMatch && userMatch && statusMatch;
  });

  return (
    <div className="dash-theme">
      <main className="main" style={{ width: '100%', minHeight: '100vh' }}>
        
        {/* TOPBAR */}
        <div className="topbar">
          <div>
            <div className="topbar-title">Overview Dashboard</div>
            <div className="topbar-sub">Live System Metrics</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={globalScope}
              onChange={(e) => setGlobalScope(e.target.value)}
              className="tb-btn"
              style={{ paddingRight: '24px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Scopes</option>
              <option value="Tickets">Tickets</option>
              <option value="Tasks">Tasks</option>
              <option value="Requirements">Requirements</option>
              <option value="Workspaces">Workspaces</option>
            </select>

            <select
              value={globalStatus}
              onChange={(e) => setGlobalStatus(e.target.value)}
              className="tb-btn"
              style={{ paddingRight: '24px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Resolved">Resolved</option>
              <option value="Escalated">Escalated</option>
              <option value="Review">Review</option>
            </select>

            <select
              value={globalUser}
              onChange={(e) => setGlobalUser(e.target.value)}
              className="tb-btn"
              style={{ paddingRight: '24px', outline: 'none', cursor: 'pointer', maxWidth: '150px' }}
            >
              <option value="All">All Users</option>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <button className="tb-btn"><i className="ti ti-share" aria-hidden="true"></i> Export</button>
          <button className="tb-btn primary"><i className="ti ti-plus" aria-hidden="true"></i> New Ticket</button>
        </div>

        <div className="content">
          
          {dbError && (
            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(255,95,126,0.1)', color: 'var(--red)', border: '0.5px solid rgba(255,95,126,0.3)', borderRadius: '8px', fontSize: '12px' }}>
              Data Sync Warning: {dbError}
            </div>
          )}

          <MetricsRow metrics={filteredMetrics} />
          
          <HealthGrid metrics={filteredMetrics} />
          
          <ChartsRow metrics={filteredMetrics} />
          
          <SprintKanbanBoard metrics={filteredMetrics} />

          <div className="grid-3">
            <RecentTicketsTable metrics={filteredMetrics} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <ActivityFeed metrics={filteredMetrics} />
              <UpcomingDeadlines metrics={filteredMetrics} />
            </div>
          </div>

          <TeamPerformance metrics={filteredMetrics} />

          {/* FOOTER */}
          <div style={{ marginTop: '20px', padding: '14px 0', borderTop: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>TaskForge Internal</div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Live Data Sync</div>
            <div style={{ flex: 1 }}></div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Active Items: <span style={{ color: 'var(--amber)', fontWeight: 500 }}>{metrics.length}</span></div>
          </div>

        </div>
      </main>
    </div>
  );
}
