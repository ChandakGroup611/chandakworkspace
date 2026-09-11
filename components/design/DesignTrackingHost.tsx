"use client";

import React, { useState } from "react";
import { 
  Compass, 
  Layers, 
  FileCheck2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Download, 
  Filter, 
  Search, 
  Building, 
  Calendar, 
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  FileText
} from "lucide-react";

interface DrawingItem {
  id: string;
  code: string;
  title: string;
  discipline: "Architectural" | "Structural" | "MEP" | "Landscape" | "Interior";
  project: string;
  revision: string;
  status: "Under Review" | "Approved (GFC)" | "Revision Requested" | "Site Handed Over";
  consultant: string;
  submittedDate: string;
  approvedDate?: string;
  fileSize: string;
}

const mockDrawings: DrawingItem[] = [
  {
    id: "drw-01",
    code: "CK-CHD-ARC-L04-001",
    title: "Tower 1 Typical Floor 4-18 Architectural Layout Plan",
    discipline: "Architectural",
    project: "Chandak Stella",
    revision: "R3",
    status: "Approved (GFC)",
    consultant: "Morphogenesis Architects",
    submittedDate: "2026-08-28",
    approvedDate: "2026-09-04",
    fileSize: "14.2 MB"
  },
  {
    id: "drw-02",
    code: "CK-CHD-STR-FDN-012",
    title: "Raft Foundation Reinforcement Detail & Column Starter Schedule",
    discipline: "Structural",
    project: "Chandak Highscape City",
    revision: "R2",
    status: "Under Review",
    consultant: "JW Consultants LLP",
    submittedDate: "2026-09-02",
    fileSize: "28.6 MB"
  },
  {
    id: "drw-03",
    code: "CK-CHD-MEP-HVAC-004",
    title: "Basement 2 Mechanical Ventilation & Ducting Route Plan",
    discipline: "MEP",
    project: "Chandak GreenAir",
    revision: "R1",
    status: "Revision Requested",
    consultant: "Enersave MEP Consultants",
    submittedDate: "2026-08-15",
    fileSize: "18.9 MB"
  },
  {
    id: "drw-04",
    code: "CK-CHD-LND-POD-007",
    title: "Podium Garden Landscape Grading, Water Feature & Paving Detail",
    discipline: "Landscape",
    project: "Chandak 34 Park Estate",
    revision: "R4",
    status: "Site Handed Over",
    consultant: "Site Concepts Landscape",
    submittedDate: "2026-07-20",
    approvedDate: "2026-08-10",
    fileSize: "32.1 MB"
  },
  {
    id: "drw-05",
    code: "CK-CHD-ARC-FAC-008",
    title: "Curtain Wall Glazing & ACP Cladding Sectional Details",
    discipline: "Architectural",
    project: "Chandak Stella",
    revision: "R2",
    status: "Approved (GFC)",
    consultant: "Morphogenesis Architects",
    submittedDate: "2026-09-01",
    approvedDate: "2026-09-08",
    fileSize: "21.5 MB"
  }
];

export default function DesignTrackingHost() {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("ALL");

  const filtered = mockDrawings.filter(item => {
    if (activeFilter === "GFC" && item.status !== "Approved (GFC)") return false;
    if (activeFilter === "REVIEW" && item.status !== "Under Review") return false;
    if (activeFilter === "REVISION" && item.status !== "Revision Requested") return false;
    if (activeFilter === "HANDOVER" && item.status !== "Site Handed Over") return false;

    if (disciplineFilter !== "ALL" && item.discipline !== disciplineFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.project.toLowerCase().includes(q) ||
        item.consultant.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: DrawingItem["status"]) => {
    switch (status) {
      case "Approved (GFC)":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Under Review":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Revision Requested":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "Site Handed Over":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-900/30 via-slate-900/40 to-slate-900/20 border border-emerald-500/20 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Design & Engineering Tracking
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted">
              Architectural drawings, CAD revisions, consultant approvals, and site GFC releases.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Drawing Sheet</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Total Drawing Register</span>
            <FileText className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">148</span>
            <span className="text-[11px] text-emerald-400 font-semibold">+6 this month</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Pending Approvals</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400">12</span>
            <span className="text-[11px] text-muted">Avg TAT: 3.2 days</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>GFC Released</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">94</span>
            <span className="text-[11px] text-emerald-400 font-semibold">63.5% Rate</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Site Handovers</span>
            <Building className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-400">42</span>
            <span className="text-[11px] text-muted">4 Sites Active</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-border overflow-x-auto">
          {[
            { id: "ALL", label: "All Sheets" },
            { id: "REVIEW", label: "Under Review" },
            { id: "GFC", label: "Approved (GFC)" },
            { id: "REVISION", label: "Revisions" },
            { id: "HANDOVER", label: "Site Handover" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeFilter === tab.id
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              placeholder="Search code, title, consultant..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <select
            value={disciplineFilter}
            onChange={e => setDisciplineFilter(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-xl bg-surface border border-border text-foreground focus:outline-none"
          >
            <option value="ALL">All Disciplines</option>
            <option value="Architectural">Architectural</option>
            <option value="Structural">Structural</option>
            <option value="MEP">MEP</option>
            <option value="Landscape">Landscape</option>
          </select>
        </div>
      </div>

      {/* Drawing Register Table */}
      <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-hover/50 text-muted uppercase font-bold text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="py-3 px-4">Drawing Code & Title</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Discipline</th>
                <th className="py-3 px-4">Rev</th>
                <th className="py-3 px-4">Consultant</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-surface-hover/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-[11px] font-bold text-accent">
                        {item.code}
                      </span>
                      <span className="font-semibold text-foreground text-xs line-clamp-1 mt-0.5">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-muted">{item.fileSize}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-foreground">
                    {item.project}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 border border-border text-foreground/80">
                      {item.discipline}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-foreground">
                    {item.revision}
                  </td>
                  <td className="py-3 px-4 text-muted">
                    {item.consultant}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted font-mono">
                    {item.submittedDate}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        title="Download Drawing File"
                        className="p-1.5 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="View Revision Diff"
                        className="p-1.5 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
