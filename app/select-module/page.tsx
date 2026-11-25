"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { 
  FolderKanban, 
  Car, 
  Compass, 
  Layers, 
  LineChart, 
  ArrowRight, 
  CheckCircle2, 
  ChevronDown, 
  Check,
  Star,
  Loader2,
  ShieldCheck,
  Video,
  Wallet
} from "lucide-react";
import type { UserModulesResult } from "@/lib/actions/module-switcher";
import { getUserAllowedModules } from "@/lib/actions/module-switcher";
import ChandakLoader from "@/components/ui/ChandakLoader";
import { AppButton } from "@/components/ui/AppButton";
import { Lock } from "lucide-react";
import { MODULE_CHOSEN_COOKIE, MODULE_HOME, moduleOfPath, isDeepLink, markModuleChosen } from "@/lib/module-gate";

const INITIAL_MODULES_DATA: UserModulesResult = {
  modules: [],
  defaultModule: null,
  hasExplicitDefault: false,
  activeModuleCode: "",
  isAdmin: false,
};

export default function SelectModulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  // ?choose=1 = opened on purpose from "Manage modules": always show the choices
  const forceChoose = searchParams.get("choose") === "1";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<UserModulesResult>(INITIAL_MODULES_DATA);
  const [selectedModuleCode, setSelectedModuleCode] = useState<string>("");
  const [rememberDefault, setRememberDefault] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autoOpening = useRef(false);

  const loadModules = async () => {
    try {
      setErrorMsg(null);
      setLoading(true);
      let modulesData: UserModulesResult | null = null;

      // 1. Try fetching from /api/modules with up to 3 attempts
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch("/api/modules", { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            if (json && Array.isArray(json.modules) && json.modules.length > 0) {
              modulesData = json;
              break;
            }
          }
        } catch (fetchErr) {
          console.warn(`[select-module] Attempt ${attempt + 1} fetch error:`, fetchErr);
        }
        if (attempt < 2) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }

      // 2. If API route failed, fallback to Server Action getUserAllowedModules directly
      if (!modulesData || !modulesData.modules || modulesData.modules.length === 0) {
        try {
          const saData = await getUserAllowedModules();
          if (saData && Array.isArray(saData.modules) && saData.modules.length > 0) {
            modulesData = saData;
          }
        } catch (saErr) {
          console.warn("[select-module] Server action fallback error:", saErr);
        }
      }

      // 3. Absolute resilience: guarantee TASK_WORKFLOW fallback
      if (!modulesData || !modulesData.modules || modulesData.modules.length === 0) {
        modulesData = {
          modules: [
            {
              id: "mod-task",
              code: "TASK_WORKFLOW",
              name: "Task & Workspace Management",
              description: "Core Operations, Workspace, Tasks & Ticketing",
              icon: "FolderKanban",
              route_path: "/",
              display_order: 1,
              is_active: true,
              is_default: true,
            }
          ],
          defaultModule: null,
          hasExplicitDefault: false,
          activeModuleCode: "TASK_WORKFLOW",
          isAdmin: false,
        };
      }

      const mods = modulesData.modules || [];
      const targetMod = nextParam ? moduleOfPath(nextParam) : null;
      const nextModule = targetMod && mods.some((m) => m.code === targetMod) ? targetMod : null;
      const alreadyChosen = typeof document !== "undefined" && new RegExp(`(?:^|; )${MODULE_CHOSEN_COOKIE}=1`).test(document.cookie);

      // Auto-open if single module or explicit default
      if (!forceChoose && !alreadyChosen && (mods.length === 1 || (modulesData.hasExplicitDefault && modulesData.defaultModule))) {
        const code = mods.length === 1 ? mods[0].code : (nextModule || modulesData.defaultModule!.code);
        autoOpening.current = true;
        handleEnterWorkspace(code, true);
        return;
      }

      setData(modulesData);
      if (modulesData.modules && modulesData.modules.length > 0) {
        const initialChoice = nextModule || modulesData.defaultModule?.code || modulesData.modules[0]?.code;
        setSelectedModuleCode(initialChoice);
        if (modulesData.hasExplicitDefault && modulesData.defaultModule) {
          setRememberDefault(true);
        }
      }
    } catch (err: any) {
      console.warn("Module load error:", err);
    } finally {
      if (!autoOpening.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
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

  const handleEnterWorkspace = async (overrideModuleCode?: string, auto = false) => {
    const targetCode = overrideModuleCode || selectedModuleCode;
    if (!targetCode) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleCode: targetCode, setAsDefault: auto ? false : rememberDefault })
      });

      const result = await res.json().catch(() => ({}));

      let destination = result?.redirectUrl;
      if (!destination || (targetCode !== "TASK_WORKFLOW" && destination === "/")) {
        const fallbackRoutes: Record<string, string> = {
          TASK_WORKFLOW: "/",
          VEHICLE_DESK: "/vehicle",
          DESIGN_TRACKING: "/design/matrix",
          DASHBOARDS: "/dashboards",
          CHANDAK_MEET: "/meet",
          ORG_BUDGET: "/budget",
        };
        destination = fallbackRoutes[targetCode] || "/";
      }

      if (nextParam && nextParam !== "/" && !nextParam.includes("/login")) {
        if (targetCode === "TASK_WORKFLOW" && !nextParam.startsWith("/vehicle") && !nextParam.startsWith("/design") && !nextParam.startsWith("/dashboards") && !nextParam.startsWith("/meet") && !nextParam.startsWith("/budget")) {
          destination = nextParam;
        } else if (targetCode === "VEHICLE_DESK" && nextParam.startsWith("/vehicle")) {
          destination = nextParam;
        } else if (targetCode === "DESIGN_TRACKING" && nextParam.startsWith("/design")) {
          destination = nextParam;
        } else if (targetCode === "DASHBOARDS" && nextParam.startsWith("/dashboards")) {
          destination = nextParam;
        } else if (targetCode === "CHANDAK_MEET" && nextParam.startsWith("/meet")) {
          destination = nextParam;
        } else if (targetCode === "ORG_BUDGET" && nextParam.startsWith("/budget")) {
          destination = nextParam;
        }
      }

      document.cookie = `active_module=${targetCode}; path=/; max-age=2592000; SameSite=Lax`;
      markModuleChosen();
      window.location.href = destination;
    } catch (err: any) {
      console.error("Error activating module:", err);
      const fallbackRoutes: Record<string, string> = {
        TASK_WORKFLOW: "/",
        VEHICLE_DESK: "/vehicle",
        DESIGN_TRACKING: "/design/matrix",
        DASHBOARDS: "/dashboards",
        CHANDAK_MEET: "/meet",
      };
      document.cookie = `active_module=${targetCode}; path=/; max-age=2592000; SameSite=Lax`;
      window.location.href = fallbackRoutes[targetCode] || "/";
    }
  };

  const getModuleMeta = (code: string) => {
    switch (code) {
      case "ORG_BUDGET":
        return {
          icon: Wallet,
          badge: "Budgets and cost control",
          launchLabel: "Open Organization Budget",
          features: ["Project, tower and department budgets with versions", "Excel import or typed entry, cost incurred", "Summary and Detail reports, custom fields"],
        };
      case "CHANDAK_MEET":
        return {
          icon: Video,
          badge: "Meetings and reviews",
          launchLabel: "Open Chandak Meet",
          features: ["Meeting series, agendas and Live mode", "Points with automated carry-forward & TAT", "Action items, decision register & MoM PDFs"],
        };
      case "VEHICLE_DESK":
        return {
          icon: Car,
          badge: "Fleet and logistics",
          launchLabel: "Open Vehicle Desk",
          features: ["Vehicle inventory and documents", "Drivers, travellers and trip sheets", "Service bills, job cards and parts"],
        };
      case "TASK_WORKFLOW":
        return {
          icon: FolderKanban,
          badge: "Core operations",
          launchLabel: "Open Task Workflow",
          features: ["Workspaces, tasks and sprints", "Tickets and requirement approvals", "AMC, SLA and software governance"],
        };
      case "DASHBOARDS":
        return {
          icon: LineChart,
          badge: "Budgets and analytics",
          launchLabel: "Open Dashboards",
          features: ["IT and marketing budgets on live IN4 data", "KPI drill-downs and Excel exports", "Scheduled report emails"],
        };
      case "DESIGN_TRACKING":
        return {
          icon: Compass,
          badge: "Drawings and engineering",
          launchLabel: "Open Design Tracking",
          features: ["Drawing registers and revisions", "Consultant reviews and approvals", "GFC handover to site"],
        };
      default:
        return { icon: Layers, badge: "Module", launchLabel: "Open module", features: [] as string[] };
    }
  };

  const selectedModuleObj = data?.modules.find(m => m.code === selectedModuleCode) || data.modules[0];
  const selectedMeta = getModuleMeta(selectedModuleCode);

  const sortedModules = (data?.modules || []).slice().sort((a, b) => {
    const order: Record<string, number> = { TASK_WORKFLOW: 1, VEHICLE_DESK: 2, DESIGN_TRACKING: 3, DASHBOARDS: 4, CHANDAK_MEET: 5 };
    return (order[a.code] || 99) - (order[b.code] || 99);
  });

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground">
      <header className="flex w-full items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/Chandak_Group_Official_Logo.png"
            alt="Chandak Group"
            width={160}
            height={36}
            className="h-8 w-auto object-contain dark:brightness-0 dark:invert"
            priority
          />
          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
          <span className="hidden text-[13px] font-medium text-subtle sm:inline">Chandak Workspace</span>
        </div>
        {data?.userFullName && (
          <div className="flex items-center gap-2 text-[13px]">
            <span className="font-medium text-foreground">{data.userFullName}</span>
            {data.isAdmin && <span className="rounded bg-sunken px-1.5 text-[11.5px] leading-5 text-subtle">Admin</span>}
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading mb-1.5">Choose a module</h1>
          <p className="text-[14px] text-subtle">You can switch modules any time from the sidebar.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Loading modules">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="theme-card-structural h-[220px] animate-pulse p-5">
                <div className="mb-4 h-10 w-10 rounded-md bg-sunken" />
                <div className="mb-2 h-4 w-2/3 rounded bg-sunken" />
                <div className="h-3 w-full rounded bg-sunken" />
              </div>
            ))}
          </div>
        ) : sortedModules.length === 0 ? (
          <div className="theme-card-structural mx-auto max-w-md p-8 text-center">
            <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-warning-soft text-warning-text">
              <Lock className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="text-[15px] font-semibold text-heading">Module Access</h2>
            <p className="mt-1 text-[13.5px] text-muted">Click below to enter the workspace or retry loading your assigned modules.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <AppButton variant="outline" size="sm" onClick={() => loadModules()}>
                Retry
              </AppButton>
              <AppButton variant="primary" size="sm" onClick={() => handleEnterWorkspace("TASK_WORKFLOW")}>
                Go to Task Workflow
              </AppButton>
            </div>
          </div>
        ) : (
          <>
            <div role="radiogroup" aria-label="Modules" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {sortedModules.map((module) => {
                const meta = getModuleMeta(module.code);
                const Icon = meta.icon;
                const isSelected = selectedModuleCode === module.code;
                return (
                  <button
                    key={module.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedModuleCode(module.code)}
                    onDoubleClick={() => handleEnterWorkspace(module.code)}
                    className={`flex flex-col rounded-[10px] border bg-surface p-5 text-left shadow-sm transition-[border-color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                      isSelected ? "border-primary ring-1 ring-primary" : "border-border hover:border-border-active hover:shadow-md"
                    }`}
                  >
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md ${isSelected ? "bg-primary text-primary-foreground" : "bg-accent-soft text-accent-soft-text"}`}>
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border-active"}`} aria-hidden>
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </div>
                    <span className="theme-label mb-1">{meta.badge}</span>
                    <span className="flex items-center gap-1.5 text-[15px] font-semibold text-heading">
                      {module.name}
                      {module.is_default && (
                        <span className="inline-flex items-center gap-1 rounded bg-sunken px-1.5 text-[11.5px] font-medium leading-5 text-subtle">
                          <Star className="h-3 w-3 fill-warning text-warning" aria-hidden /> Default
                        </span>
                      )}
                    </span>
                    {module.description && <span className="mt-1 line-clamp-2 text-[13px] text-muted">{module.description}</span>}
                    {meta.features.length > 0 && (
                      <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                        {meta.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[12.5px] text-subtle">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3">
              {errorMsg && (
                <div role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-center text-[13px] text-danger-text">
                  {errorMsg}
                </div>
              )}
              <label className="flex cursor-pointer items-center justify-center gap-2.5 text-[13.5px] text-foreground">
                <input
                  type="checkbox"
                  checked={rememberDefault}
                  onChange={(e) => setRememberDefault(e.target.checked)}
                  className="h-4 w-4 cursor-pointer"
                />
                Open this module automatically next time
              </label>
              <AppButton
                type="button"
                variant="primary"
                size="lg"
                onClick={() => handleEnterWorkspace()}
                disabled={submitting || !selectedModuleCode}
                isLoading={submitting}
                rightIcon={submitting ? undefined : <ArrowRight className="h-4 w-4" />}
                className="w-full"
              >
                {submitting ? "Opening…" : selectedMeta.launchLabel}
              </AppButton>
              <p className="text-center text-[12px] text-muted">Tip: double-click a module to open it straight away.</p>
            </div>
          </>
        )}
      </main>

      <footer className="w-full border-t border-border py-3 text-center text-[12px] text-muted">
        © {new Date().getFullYear()} Chandak Group
      </footer>
    </div>
  );
}
