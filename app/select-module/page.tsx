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
  Star, 
  Sparkles,
  ShieldCheck,
  Building2,
  ChevronDown,
  Loader2
} from "lucide-react";
import { getUserAllowedModules, setActiveModule, UserModulesResult, ModuleInfo } from "@/lib/actions/module-switcher";
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
          gradient: "from-amber-600/25 via-orange-600/15 to-transparent",
          badgeBg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
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
          gradient: "from-blue-600/25 via-indigo-600/15 to-transparent",
          badgeBg: "bg-blue-500/15 text-blue-300 border-blue-500/30",
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
          gradient: "from-emerald-600/25 via-teal-600/15 to-transparent",
          badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
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
          gradient: "from-purple-600/20 via-pink-600/10 to-transparent",
          badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
          accentColor: "#8B5CF6",
          badge: "Workspace",
          launchLabel: "Enter Module",
          features: ["Workspace Modules", "Custom Controls"]
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#070A12] text-white">
        <ChandakLoader />
        <p className="mt-4 text-sm text-white/60 tracking-wider uppercase font-medium animate-pulse">
          Resolving Workspace Entitlements...
        </p>
      </div>
    );
  }

  const selectedMeta = getModuleMeta(selectedModuleCode);

  return (
    <div className="min-h-screen w-full bg-[#070A12] text-white flex flex-col relative overflow-hidden select-none font-sans">
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full blur-[140px] opacity-25 transition-all duration-700"
          style={{ backgroundColor: selectedMeta.accentColor }}
        />
        <div className="absolute top-[40%] -right-[15%] w-[45vw] h-[45vw] rounded-full bg-blue-600/15 blur-[160px] opacity-30" />
        <div className="absolute -bottom-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-indigo-700/10 blur-[150px] opacity-20" />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
            backgroundSize: '32px 32px' 
          }} 
        />
      </div>

      {/* Header Bar */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between border-b border-white/[0.08] backdrop-blur-md bg-[#070A12]/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-auto flex items-center">
            <Image 
              src="/Chandak_Group_Official_Logo.png" 
              alt="Chandak Group" 
              width={160}
              height={36}
              className="h-9 w-auto brightness-0 invert object-contain"
              priority
            />
          </div>
          <div className="h-5 w-[1px] bg-white/20 hidden sm:block" />
          <span className="text-xs tracking-[0.25em] uppercase font-bold text-white/70 hidden sm:inline-block">
            Workspace Portal
          </span>
        </div>

        {data?.userFullName && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs text-white/80">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-medium text-white">{data.userFullName}</span>
            {data.isAdmin && (
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                ADMIN
              </span>
            )}
          </div>
        )}
      </header>

      {/* Main Selection Area */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 flex flex-col justify-center">
        {/* Title & Guidance */}
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs text-white/80 mb-3 shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Multi-Module Workspace Access</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
            Under which module do you want to enter?
          </h1>
          <p className="text-sm sm:text-base text-white/60">
            Select the module you want to enter for this session. You can switch between modules at any time from the sidebar.
          </p>
        </div>

        {/* Quick Dropdown Selector for Fast Selection */}
        <div className="max-w-md mx-auto w-full mb-8">
          <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
            Select Active Module
          </label>
          <div className="relative">
            <select
              value={selectedModuleCode}
              onChange={(e) => setSelectedModuleCode(e.target.value)}
              className="w-full appearance-none bg-white/[0.06] hover:bg-white/[0.09] text-white border border-white/[0.15] rounded-xl px-4 py-3.5 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer shadow-lg backdrop-blur-md"
            >
              {data?.modules.map((m) => (
                <option key={m.id} value={m.code} className="bg-[#0D1220] text-white py-2">
                  {m.name} {m.is_default ? "★ (Default)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
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
                  className={`group relative rounded-2xl p-6 cursor-pointer transition-all duration-300 flex flex-col justify-between border backdrop-blur-xl ${
                    isSelected
                      ? "bg-white/[0.08] border-white/30 shadow-[0_0_35px_rgba(59,130,246,0.25)] scale-[1.02]"
                      : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20 hover:scale-[1.01]"
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
                        className={`h-12 w-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-lg ${
                          isSelected ? "bg-white text-[#070A12]" : "bg-white/10 text-white"
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.badgeBg}`}>
                          {meta.badge}
                        </span>
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center border transition-all ${
                          isSelected 
                            ? "border-blue-400 bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.6)]" 
                            : "border-white/20 bg-transparent text-transparent"
                        }`}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-blue-300 transition-colors">
                      {module.name}
                    </h3>
                    <p className="text-xs text-white/60 line-clamp-2 mb-4 leading-relaxed">
                      {module.description || "Operational suite for enterprise workflows."}
                    </p>

                    {/* Feature Highlights */}
                    <div className="space-y-1.5 border-t border-white/[0.08] pt-3 mb-4">
                      {meta.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-white/70">
                          <span className="h-1.5 w-1.5 rounded-full bg-white/40 mt-1.5 shrink-0" />
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
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold tracking-wide uppercase flex items-center justify-center gap-2 transition-all ${
                        isSelected
                          ? "bg-white text-[#070A12] hover:bg-white/95 shadow-lg shadow-white/10"
                          : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white border-white/10"
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
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
              {errorMsg}
            </div>
          )}

          <label className="flex items-center justify-center gap-2.5 text-xs text-white/70 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={rememberDefault}
              onChange={(e) => setRememberDefault(e.target.checked)}
              className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-400 h-4 w-4"
            />
            <span>Remember my choice as default for future logins</span>
          </label>

          <AppButton
            type="button"
            variant="primary"
            onClick={() => handleEnterWorkspace()}
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold tracking-wide shadow-xl shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
      <footer className="relative z-10 w-full py-4 text-center text-[11px] text-white/40 border-t border-white/[0.06] backdrop-blur-sm bg-[#070A12]/40">
        © {new Date().getFullYear()} Chandak Group. Enterprise Workspace Architecture. All rights reserved.
      </footer>
    </div>
  );
}
