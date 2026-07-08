"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { AlertCircle, CheckCircle2, Clock, Ticket } from "lucide-react";

interface Metrics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  breachedSla: number;
  workloadData: { name: string; tickets: number }[];
  volumeData: { date: string; count: number }[];
}

export function TicketsDashboard({ metrics }: { metrics: Metrics }) {
  if (!metrics) {
    return <div className="p-8 text-center text-muted-foreground">No metrics available.</div>;
  }

  const {
    totalTickets,
    openTickets,
    resolvedTickets,
    breachedSla,
    workloadData,
    volumeData,
  } = metrics;

  const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
          <Ticket className="w-8 h-8 text-blue-500 mb-3" />
          <div className="text-3xl font-black text-foreground">{totalTickets}</div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Total Tickets</div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors" />
          <Clock className="w-8 h-8 text-purple-500 mb-3" />
          <div className="text-3xl font-black text-foreground">{openTickets}</div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Open Tickets</div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-3" />
          <div className="text-3xl font-black text-foreground">{resolvedTickets}</div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Resolved ({resolutionRate}%)</div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
          <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
          <div className="text-3xl font-black text-red-500">{breachedSla}</div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">SLA Breaches</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Volume Trends */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">7-Day Ticket Volume</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e1e24", border: "1px solid #333", borderRadius: "8px" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#60a5fa" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Agent Workload */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">Top Agent Workload (Open)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ backgroundColor: "#1e1e24", border: "1px solid #333", borderRadius: "8px" }}
                />
                <Bar dataKey="tickets" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
