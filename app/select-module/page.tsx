"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Check,
  Star,
  Loader2,
  ShieldCheck
} from "lucide-react";
import type { UserModulesResult } from "@/lib/actions/module-switcher";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { AppButton } from "@/components/ui/AppButton";

const FALLBACK_MODULES_DATA: UserModulesResult = {
  modules: [
    {
      id: "3c0d7f6f-36a9-4a0c-acb1-c6f48f1dfbbd",
      code: "TASK_WORKFLOW",
      name: "Task & Workspace Management",
      description: "Core Operations, Workspace, Tasks, Ticketing & AMC Governance",
      icon: "FolderKanban",
      route_path: "/workspaces/tasks",
      display_order: 1,
      is_active: true,
      is_default: true,
    },
    {
      id: "d49152e5-a054-494c-9281-61d487f3b8ed",
      code: "VEHICLE_DESK",
      name: "Vehicle Management Desk",
      description: "Fleet Master, Driver Rosters, Trip Sheets & Maintenance Logistics",
      icon: "Car",
      route_path: "/vehicle/dashboard",
      display_order: 2,
      is_active: true,
      is_default: false,
    },
    {
      id: "b550adf5-0f8d-4b7f-9088-fd40336e38d1",
      code: "DESIGN_TRACKING",
      name: "Design & Drawing Tracking",
      description: "Architectural Drawings, CAD/BIM Revision Control & Approvals",
      icon: "Compass",
      route_path: "/design/dashboard",
      display_order: 3,
      is_active: true,
      is_default: false,
    },
  ],
  defaultModule: null,
  hasExplicitDefault: false,
  activeModuleCode: "TASK_WORKFLOW",
  isAdmin: false,
};

export default function SelectModulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<UserModulesResult>(FALLBACK_MODULES_DATA);
  const [selectedModuleCode, setSelectedModuleCode] = useState<string>("TASK_WORKFLOW");
  const [rememberDefault, setRememberDefault] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadModules() {
      try {
        setErrorMsg(null);
        const res = await fetch("/api/modules", { cache: "no-store" });
        if (res.ok) {
          const modulesData: UserModulesResult = await res.json();
          if (isMounted && modulesData.modules && modulesData.modules.length > 0) {
            setData(modulesData);
            const initialChoice = modulesData.activeModuleCode || modulesData.defaultModule?.code || modulesData.modules[0]?.code || "TASK_WORKFLOW";
            setSelectedModuleCode(initialChoice);
            if (modulesData.hasExplicitDefault && modulesData.defaultModule) {
              setRememberDefault(true);
            }
          }
        }
      } catch (err: any) {
        console.warn("Module load note (using resilient fallback):", err);
      }
    }

    loadModules();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close custom dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleEnterWorkspace = async (overrideModuleCode?: string) => {
    const targetCode = overrideModuleCode || selectedModuleCode;
    if (!targetCode) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleCode: targetCode, setAsDefault: rememberDefault })
      });

      const result = await res.json().catch(() => ({}));

      let destination = result?.redirectUrl;
      if (!destination) {
        const fallbackRoutes: Record<string, string> = {
          TASK_WORKFLOW: "/workspaces/tasks",
          VEHICLE_DESK: "/vehicle/dashboard",
          DESIGN_TRACKING: "/design/dashboard"
        };
        destination = fallbackRoutes[targetCode] || "/workspaces/tasks";
      }

      if (nextParam && nextParam !== "/" && !nextParam.includes("/login")) {
        if (targetCode === "TASK_WORKFLOW" && !nextParam.startsWith("/vehicle") && !nextParam.startsWith("/design")) {
          destination = nextParam;
        } else if (targetCode === "VEHICLE_DESK" && nextParam.startsWith("/vehicle")) {
          destination = nextParam;
        } else if (targetCode === "DESIGN_TRACKING" && nextParam.startsWith("/design")) {
          destination = nextParam;
        }
      }

      document.cookie = `active_module=${targetCode}; path=/; max-age=2592000; SameSite=Lax`;
      window.location.href = destination;
    } catch (err: any) {
      console.error("Error activating module:", err);
      const fallbackRoutes: Record<string, string> = {
        TASK_WORKFLOW: "/workspaces/tasks",
        VEHICLE_DESK: "/vehicle/dashboard",
        DESIGN_TRACKING: "/design/dashboard"
      };
      document.cookie = `active_module=${targetCode}; path=/; max-age=2592000; SameSite=Lax`;
      window.location.href = fallbackRoutes[targetCode] || "/workspaces/tasks";
    }
  };

  const getModuleMeta = (code: string) => {
    switch (code) {
      case "VEHICLE_DESK":
        return {
          icon: Car,
          gradient: "from-amber-500/15 via-orange-500/5 to-transparent",
          badgeBg: "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-500/30",
          accentColor: "#F59E0B",
          badge: "Fleet & Logistics",
          launchLabel: "Enter Vehicle Desk",
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
          gradient: "from-blue-500/15 via-indigo-500/5 to-transparent",
          badgeBg: "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-500/30",
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
          gradient: "from-emerald-500/15 via-teal-500/5 to-transparent",
          badgeBg: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/30",
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
          gradient: "from-purple-500/15 via-pink-500/5 to-transparent",
          badgeBg: "bg-purple-100 dark:bg-surface text-purple-800 dark:text-purple-200 border-border dark:border-border",
          accentColor: "#8B5CF6",
          badge: "Workspace",
          launchLabel: "Enter Module",
          features: ["Workspace Modules", "Custom Controls"]
        };
    }
  };

  const selectedModuleObj = data?.modules.find(m => m.code === selectedModuleCode) || data.modules[0];
  const selectedMeta = getModuleMeta(selectedModuleCode);

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col relative select-none font-sans">

      {/* Header Bar */}
      <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-border backdrop-blur-md bg-surface/90 dark:bg-surface/60 shadow-xs">
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

        {data?.userFullName ? (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border text-xs text-foreground shadow-2xs">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold">{data.userFullName}</span>
            {data.isAdmin && (
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                ADMIN
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Select Workspace</span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 flex flex-col justify-center">

        <div className="text-center max-w-xl mx-auto mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
            Select Active Workspace Module
          </h1>
          <p className="text-sm text-muted">
            Choose the workspace module you would like to enter for this session.
          </p>
        </div>

        {/* Custom Bulletproof Interactive Selector Dropdown */}
        <div className="max-w-md mx-auto w-full mb-8" ref={dropdownRef}>
          <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
            Quick Selector Dropdown
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between bg-surface hover:bg-elevated text-foreground border border-border rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/30 focus:border-theme-btn-primary transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="truncate">{selectedModuleObj?.name || "Select Module"}</span>
                {selectedModuleObj?.is_default && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25 shrink-0">
                    ★ Default
                  </span>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-muted transition-transform duration-200 shrink-0 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-surface border border-border shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="space-y-1">
                  {data?.modules.map((m) => {
                    const isSelected = selectedModuleCode === m.code;
                    const meta = getModuleMeta(m.code);
                    const Icon = meta.icon;

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedModuleCode(m.code);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-left text-sm font-medium transition-colors cursor-pointer ${
                          isSelected 
                            ? "bg-theme-btn-primary/10 text-theme-btn-primary font-bold border border-theme-btn-primary/20" 
                            : "text-foreground hover:bg-elevated"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{m.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {m.is_default && (
                            <span className="text-[10px] text-amber-500 font-bold">★ Default</span>
                          )}
                          {isSelected && <Check className="h-4 w-4 text-theme-btn-primary" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mb-8">
          {(data?.modules || [])
            .slice()
            .sort((a, b) => {
              const order: Record<string, number> = { TASK_WORKFLOW: 1, VEHICLE_DESK: 2, DESIGN_TRACKING: 3 };
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
                      ? "bg-surface border-theme-btn-primary shadow-xl ring-2 ring-theme-btn-primary/30 scale-[1.02]"
                      : "bg-surface/80 dark:bg-surface/40 hover:bg-surface border-border hover:border-theme-btn-primary/50 shadow-xs hover:shadow-lg hover:scale-[1.01]"
                  }`}
                >
                  {/* Glow Background */}
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
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${meta.badgeBg}`}>
                          {meta.badge}
                        </span>
                        {module.is_default && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25">
                            ★ Default
                          </span>
                        )}
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center border transition-all ${
                          isSelected 
                            ? "border-theme-btn-primary bg-theme-btn-primary text-white shadow-xs" 
                            : "border-border bg-transparent text-transparent"
                        }`}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-theme-btn-primary transition-colors">
                      {module.name}
                    </h3>
                    <p className="text-xs text-muted mb-4 leading-relaxed line-clamp-2">
                      {module.description}
                    </p>
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

          <label className="flex items-center justify-center gap-2.5 text-xs text-foreground cursor-pointer hover:text-foreground/80 transition-colors p-2 rounded-xl bg-surface/50 border border-border/50">
            <input
              type="checkbox"
              checked={rememberDefault}
              onChange={(e) => setRememberDefault(e.target.checked)}
              className="rounded border-border bg-surface text-theme-btn-primary focus:ring-theme-btn-primary h-4 w-4 cursor-pointer"
            />
            <span className="font-medium">Remember my choice as default for future logins</span>
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

      {/* Modern Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-[11px] text-muted border-t border-border bg-surface/50">
        © {new Date().getFullYear()} Chandak Group. Enterprise Workspace Architecture. All rights reserved.
      </footer>
    </div>
  );
}

