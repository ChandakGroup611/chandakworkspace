"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { 
  FolderKanban, 
  Car, 
  Compass, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  ChevronDown, 
  Loader2
} from "lucide-react";
import { getUserAllowedModules, setActiveModule, UserModulesResult } from "@/lib/actions/module-switcher";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { AppButton } from "@/components/ui/AppButton";

export default function SelectModulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<UserModulesResult | null>(null);
  const [selectedModuleCode, setSelectedModuleCode] = useState<string>("TASK_WORKFLOW");
  const [rememberDefault, setRememberDefault] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadModules() {
      try {
        setLoading(true);
        const res = await getUserAllowedModules();

        if (!res.modules || res.modules.length === 0) {
          // Fallback if not logged in or no modules
          router.replace("/login");
          return;
        }

        setData(res);
        const initialChoice = res.activeModuleCode || res.defaultModule?.code || res.modules[0].code;
        setSelectedModuleCode(initialChoice);
      } catch (err: any) {
        console.error("Error loading user modules:", err);
        setErrorMsg("Unable to retrieve module permissions. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadModules();
  }, [router, nextParam]);

  const handleEnterWorkspace = async (overrideModuleCode?: string) => {
    const targetCode = overrideModuleCode || selectedModuleCode;
    if (!targetCode) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const res = await setActiveModule(targetCode, rememberDefault);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to switch workspace module");
        setSubmitting(false);
        return;
      }

      // If a specific deep link exists and belongs to the chosen module, honor it
      let destination = res.redirectUrl;
      if (nextParam) {
        if (targetCode === "TASK_WORKFLOW" && !nextParam.startsWith("/vehicle") && !nextParam.startsWith("/design")) {
          destination = nextParam;
        } else if (targetCode === "VEHICLE_DESK" && nextParam.startsWith("/vehicle")) {
          destination = nextParam;
        } else if (targetCode === "DESIGN_TRACKING" && nextParam.startsWith("/design")) {
          destination = nextParam;
        }
      }

      window.location.href = destination;
    } catch (err: any) {
      console.error("Error activating module:", err);
      setErrorMsg(err.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  const getModuleMeta = (code: string) => {
    switch (code) {
      case "VEHICLE_DESK":
        return {
          icon: Car,
          gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
          badgeBg: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
          accentColor: "#F59E0B",
          badge: "Fleet & Logistics",
          launchLabel: "Enter Vehicle Module",
          features: [
            "Fleet Master & Vehicle Inventory",
            "Driver Roster & Traveler Allocations",
            "Daily Trip Sheets & Digital Odometer",
            "Maintenance, Job Cards & Parts Inventory"
          ]
        };
      case "TASK_WORKFLOW":
        return {
          icon: FolderKanban,
          gradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
          badgeBg: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
          accentColor: "#3B82F6",
          badge: "Core Operations",
          launchLabel: "Enter Workspace Module",
          features: [
            "Workspace & Task Hierarchy Management",
            "Executive Task Tracker & Sprints",
            "Helpdesk Ticketing & Operations",
            "Requirement Lifecycle & Approvals",
            "AMC & Software Governance"
          ]
        };
      case "DESIGN_TRACKING":
        return {
          icon: Compass,
          gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
          badgeBg: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
          accentColor: "#10B981",
          badge: "Drawings & Engineering",
          launchLabel: "Enter Design Tracking",
          features: [
            "Architectural & Structural Drawing Registers",
            "Consultant Review & Multi-Tier Approvals",
            "CAD/BIM Revision Control & Diff Tracking",
            "Site Execution & GFC Handover Releases"
          ]
        };
      default:
        return {
          icon: Layers,
          gradient: "from-purple-500/10 via-pink-500/5 to-transparent",
          badgeBg: "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30",
          accentColor: "#8B5CF6",
          badge: "Workspace",
          launchLabel: "Enter Module",
          features: ["Workspace Modules", "Custom Controls"]
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
        <ChandakLoader />
        <p className="mt-4 text-sm text-muted tracking-wider uppercase font-medium animate-pulse">
          Resolving Workspace Entitlements...
        </p>
      </div>
    );
  }

  const selectedMeta = getModuleMeta(selectedModuleCode);

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col relative overflow-hidden select-none font-sans transition-colors duration-200">
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full blur-[140px] opacity-15 dark:opacity-25 transition-all duration-700"
          style={{ backgroundColor: selectedMeta.accentColor }}
        />
        <div className="absolute top-[40%] -right-[15%] w-[45vw] h-[45vw] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[160px] opacity-20 dark:opacity-30" />
        <div className="absolute -bottom-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-indigo-500/10 dark:bg-indigo-700/10 blur-[150px] opacity-15 dark:opacity-20" />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '32px 32px' 
          }} 
        />
      </div>

      {/* Header Bar */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-border backdrop-blur-md bg-surface/80 dark:bg-surface/50 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-auto flex items-center">
            <Image 
              src="/Chandak_Group_Official_Logo.png" 
              alt="Chandak Group" 
              width={160}
              height={36}
              className="h-8 md:h-9 w-auto object-contain dark:brightness-0 dark:invert"
              priority
            />
          </div>
          <div className="h-5 w-[1px] bg-border hidden sm:block" />
          <span className="text-xs tracking-[0.25em] uppercase font-bold text-muted hidden sm:inline-block">
            Workspace Portal
          </span>
        </div>

        {data?.userFullName && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border text-xs text-foreground shadow-2xs">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold">{data.userFullName}</span>
            {data.isAdmin && (
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                ADMIN
              </span>
            )}
          </div>
        )}
      </header>

      {/* Main Selection Area */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 flex flex-col justify-center">

        {/* Quick Dropdown Selector for Fast Selection */}
        <div className="max-w-md mx-auto w-full mb-8">
          <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
            Select Active Module
          </label>
          <div className="relative">
            <select
              value={selectedModuleCode}
              onChange={(e) => setSelectedModuleCode(e.target.value)}
              className="w-full appearance-none bg-surface hover:bg-elevated text-foreground border border-border rounded-xl px-4 py-3 pr-10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/30 focus:border-theme-btn-primary transition-all cursor-pointer shadow-xs"
            >
              {data?.modules.map((m) => (
                <option key={m.id} value={m.code} className="bg-surface text-foreground py-2 font-medium">
                  {m.name} {m.is_default ? "★ (Default)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
          </div>
        </div>

        {/* Interactive Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mb-8">
          {(data?.modules || [])
            .slice()
            .sort((a, b) => {
              const order: Record<string, number> = { VEHICLE_DESK: 1, TASK_WORKFLOW: 2, DESIGN_TRACKING: 3 };
              return (order[a.code] || 99) - (order[b.code] || 99);
            })
            .map((module) => {
              const meta = getModuleMeta(module.code);
              const Icon = meta.icon;
              const isSelected = selectedModuleCode === module.code;

              return (
                <div
                  key={module.id}
                  onClick={() => setSelectedModuleCode(module.code)}
                  onDoubleClick={() => handleEnterWorkspace(module.code)}
                  className={`group relative rounded-2xl p-6 cursor-pointer transition-all duration-300 flex flex-col justify-between border ${
                    isSelected
                      ? "bg-surface border-theme-btn-primary shadow-lg ring-2 ring-theme-btn-primary/20 scale-[1.02]"
                      : "bg-surface/80 dark:bg-surface/40 hover:bg-surface border-border hover:border-theme-btn-primary/40 shadow-xs hover:shadow-md hover:scale-[1.01]"
                  }`}
                >
                  {/* Highlight Glow Background */}
                  <div 
                    className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br ${meta.gradient}`} 
                  />

                  {/* Card Header */}
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div 
                        className={`h-12 w-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-xs ${
                          isSelected ? "bg-theme-btn-primary text-white" : "bg-muted/10 text-foreground"
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeBg}`}>
                          {meta.badge}
                        </span>
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center border transition-all ${
                          isSelected 
                            ? "border-theme-btn-primary bg-theme-btn-primary text-white shadow-xs" 
                            : "border-border bg-transparent text-transparent"
                        }`}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-1.5 group-hover:text-theme-btn-primary transition-colors">
                      {module.name}
                    </h3>
                    <p className="text-xs text-muted line-clamp-2 mb-4 leading-relaxed">
                      {module.description || "Operational suite for enterprise workflows."}
                    </p>

                    {/* Feature Highlights */}
                    <div className="space-y-1.5 border-t border-border pt-3 mb-4">
                      {meta.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-subtle">
                          <span className="h-1.5 w-1.5 rounded-full bg-theme-btn-primary/50 mt-1.5 shrink-0" />
                          <span className="leading-snug">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer Button */}
                  <div className="relative z-10 pt-2">
                    <AppButton
                      type="button"
                      variant={isSelected ? "primary" : "secondary"}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEnterWorkspace(module.code);
                      }}
                      disabled={submitting}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold tracking-wide uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white shadow-sm"
                          : "bg-surface hover:bg-elevated text-foreground border border-border"
                      }`}
                    >
                      <span>{meta.launchLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </AppButton>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Global Controls & Preferences */}
        <div className="relative z-10 max-w-md mx-auto w-full space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs text-center font-medium">
              {errorMsg}
            </div>
          )}

          <label className="flex items-center justify-center gap-2.5 text-xs text-muted cursor-pointer hover:text-foreground transition-colors">
            <input
              type="checkbox"
              checked={rememberDefault}
              onChange={(e) => setRememberDefault(e.target.checked)}
              className="rounded border-border bg-surface text-theme-btn-primary focus:ring-theme-btn-primary h-4 w-4 cursor-pointer"
            />
            <span>Remember my choice as default for future logins</span>
          </label>

          <AppButton
            type="button"
            variant="primary"
            onClick={() => handleEnterWorkspace()}
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-xl bg-theme-btn-primary hover:bg-theme-btn-primary-secondary text-white text-sm font-bold tracking-wide shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Entering Workspace...</span>
              </>
            ) : (
              <>
                <span>{selectedMeta.launchLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </AppButton>
        </div>
      </main>

      {/* Clean Modern Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-[11px] text-muted border-t border-border bg-surface/50">
        © {new Date().getFullYear()} Chandak Group. Enterprise Workspace Architecture. All rights reserved.
      </footer>
    </div>
  );
}
