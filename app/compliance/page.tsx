"use client";

import React, { useState } from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { 
  AppTableContainer, 
  AppTable, 
  AppTableHeader, 
  AppTableBody, 
  AppTableRow, 
  AppTableHead, 
  AppTableCell 
} from "@/components/ui/AppTable";
import { AppSkeleton, AppTableSkeleton, AppCardSkeleton } from "@/components/ui/AppSkeleton";
import { 
  ShieldCheck, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Activity, 
  Sliders, 
  Layers, 
  RefreshCw,
  Compass,
  Archive
} from "lucide-react";
import DataRetentionClient from "./DataRetentionClient";

export default function CompliancePage() {
  const [activeMainTab, setActiveMainTab] = useState<"accessibility" | "retention">("accessibility");
  const [isSimulatingLoad, setIsSimulatingLoad] = useState(false);

  const triggerSimulatedLoad = () => {
    setIsSimulatingLoad(true);
    setTimeout(() => {
      setIsSimulatingLoad(false);
    }, 2500);
  };

  const a11yMetrics = [
    { check: "WCAG AA Core Contrast Ratio", score: "7.1:1 Passing", target: ">= 4.5:1", state: "success" },
    { check: "Keyboard Tab-Index Navigation Focus Visibility", score: "Ring enabled (2px blue)", target: "Visible outline", state: "success" },
    { check: "Screen-Reader Aria-Label Descriptor Attributes", score: "100% Bound Coverage", target: "Mandatory tags", state: "success" },
    { check: "Motion System Bouncing Restrictions", score: "Zero bounce enforced", target: "Subtle sweeps only", state: "success" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-400 w-full">
      {/* Compliance Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Governance & Accessibility Hub</h1>
            <AppBadge variant="success">WCAG AA Verified</AppBadge>
          </div>
          <p className="text-xs text-gray-400">
            Authoritative audit tracking core contrast tokens, screen-reader markup integrity, and tactile motion response curves.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeMainTab === "accessibility" && (
            <AppButton 
              variant="secondary" 
              size="sm" 
              onClick={triggerSimulatedLoad}
              isLoading={isSimulatingLoad}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Audit Skeletons
            </AppButton>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveMainTab("accessibility")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeMainTab === "accessibility" 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Accessibility & WCAG
        </button>
        <button
          onClick={() => setActiveMainTab("retention")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeMainTab === "retention" 
              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Archive className="h-4 w-4" />
          Data Retention & Trash
        </button>
      </div>

      {/* Main Orchestration Rows */}
      {activeMainTab === "accessibility" ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Left Span 2: WCAG Accessibility Compliance Metrics Matrix */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <AppCard className="flex-1 flex flex-col justify-between">
            <AppCardHeader className="flex flex-row items-center justify-between pb-3 border-b border-white/5">
              <div className="space-y-0.5">
                <AppCardTitle className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Accessibility Audit Parameters</span>
                </AppCardTitle>
                <p className="text-[0.8rem] text-gray-400">Continuous runtime check monitoring design variables.</p>
              </div>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold uppercase border border-emerald-500/20">
                Score: 100/100
              </span>
            </AppCardHeader>

            <div className="p-4 flex-1">
              <AppTableContainer>
                <AppTable>
                  <AppTableHeader>
                    <tr>
                      <AppTableHead>Verification Vector</AppTableHead>
                      <AppTableHead>Observed Metric</AppTableHead>
                      <AppTableHead className="text-right">Compliance Target</AppTableHead>
                    </tr>
                  </AppTableHeader>
                  <AppTableBody>
                    {a11yMetrics.map((item, idx) => (
                      <AppTableRow key={idx}>
                        <AppTableCell className="font-semibold text-gray-200">{item.check}</AppTableCell>
                        <AppTableCell className="text-emerald-400 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>{item.score}</span>
                        </AppTableCell>
                        <AppTableCell className="text-right font-mono text-gray-400 text-[0.8rem]">{item.target}</AppTableCell>
                      </AppTableRow>
                    ))}
                  </AppTableBody>
                </AppTable>
              </AppTableContainer>
            </div>

            <div className="p-4 bg-white/[0.01] border-t border-white/5 text-[0.8rem] text-gray-500 flex items-center justify-between">
              <span>Automated WCAG parsing engine active</span>
              <span className="text-blue-400 hover:underline cursor-pointer">Export signed audit logs</span>
            </div>
          </AppCard>

          {/* Skeletons Lifecycle Live Simulator (Phase 7 WOW Demo) */}
          <AppCard className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="space-y-0.5">
                <h3 className="text-xs font-semibold text-gray-300 tracking-wider uppercase flex items-center gap-2">
                  <Sliders className="h-3.5 w-3.5 text-blue-400" />
                  <span>Phase 7 Motion System Skeletons Simulator</span>
                </h3>
                <p className="text-[0.8rem] text-gray-500">Trigger test blocks to view controlled zero-bounce shimmer curves.</p>
              </div>
              <AppButton variant="outline" size="sm" onClick={triggerSimulatedLoad} className="h-8 text-[0.8rem]">
                {isSimulatingLoad ? "Simulating..." : "Trigger Shimmer"}
              </AppButton>
            </div>

            {/* Layout representation mapping */}
            <div className="space-y-4 pt-1">
              {isSimulatingLoad ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <AppCardSkeleton />
                    <AppCardSkeleton />
                  </div>
                  <AppTableSkeleton rows={3} />
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center space-y-2">
                  <div className="p-3 rounded-full bg-white/5 text-gray-400">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </div>
                  <p className="text-xs text-white font-medium">Skeletons inactive. Backend pipeline ready.</p>
                  <p className="text-[0.8rem] text-gray-500 max-w-md">
                    Click "Trigger Shimmer" to observe subtle, smooth-fading loading placeholders adhering strictly to enterprise transition rules.
                  </p>
                </div>
              )}
            </div>
          </AppCard>
        </div>

        {/* Right Span 1: Authoritative Enterprise Policies Overview */}
        <div className="space-y-6">
          <AppCard className="p-5 space-y-4">
            <div className="border-b border-white/5 pb-2">
              <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase flex items-center gap-2">
                <Compass className="h-3.5 w-3.5 text-indigo-400" />
                <span>Motion Restrictions</span>
              </span>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-gray-300 font-sans">
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Allowed Directives</span>
                <p className="text-gray-400 text-[0.8rem]">Subtle opacity cross-fades, CSS variables transition bindings, micro-lifts.</p>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 space-y-1">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">Forbidden Directives</span>
                <p className="text-gray-400 text-[0.8rem]">Flashy spring layout bounce jumps, gaming physics effects, jarring saturation flips.</p>
              </div>
            </div>
          </AppCard>

          <AppCard className="p-5 space-y-3 border-blue-500/10 bg-gradient-to-b from-blue-950/10 to-transparent">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
              Global Platform Sign-Off
            </span>
            <p className="text-xs text-gray-400 leading-relaxed">
              All routes configured under <code className="text-white">src/styles/themes/</code> satisfy continuous UI evaluation metrics automatically.
            </p>
            <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-white/5">
              <span>Version: <strong className="text-gray-300">v4.0 Final</strong></span>
              <span className="text-emerald-400 font-bold">APPROVED</span>
            </div>
          </AppCard>
        </div>
      </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <DataRetentionClient />
        </div>
      )}
    </div>
  );
}
