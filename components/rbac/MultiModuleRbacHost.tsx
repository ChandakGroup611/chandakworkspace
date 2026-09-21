"use client";

import React, { useState, useEffect } from "react";
import { 
  FolderKanban, 
  Car, 
  Compass, 
  Layers, 
  ShieldCheck, 
  ArrowRightLeft,
  Sparkles,
  Info
} from "lucide-react";
import IAMGovernanceCockpit from "@/components/iam/IAMGovernanceCockpit";
import FleetRbacGovernance from "@/components/vehicle/FleetRbacGovernance";
import { DesignRbacGovernance } from "@/Design_Tracking/src/components/DesignRbacGovernance";
import { UserModulesResult } from "@/lib/actions/module-switcher";

interface MultiModuleRbacHostProps {
  initialActiveModule?: string;
  userModulesData: UserModulesResult;
}

export default function MultiModuleRbacHost({
  initialActiveModule = "TASK_WORKFLOW",
  userModulesData
}: MultiModuleRbacHostProps) {
  const [selectedModule, setSelectedModule] = useState<string>(initialActiveModule);

  // Synchronize initial selection if initialActiveModule changes
  useEffect(() => {
    if (initialActiveModule) {
      setSelectedModule(initialActiveModule);
    }
  }, [initialActiveModule]);

  const availableModuleCodes = userModulesData.modules.map(m => m.code);
  const isAdmin = userModulesData.isAdmin;

  // Filter accessible tabs (Admins see all 3, otherwise based on user assignments)
  const canAccessTask = isAdmin || availableModuleCodes.includes("TASK_WORKFLOW");
  const canAccessVehicle = isAdmin || availableModuleCodes.includes("VEHICLE_DESK");
  const canAccessDesign = isAdmin || availableModuleCodes.includes("DESIGN_TRACKING");

  return (
    <div className="w-full flex-1 flex flex-col space-y-6 min-w-0 animate-in fade-in duration-300">
      {/* Multi-Module Governance Navigation Tabs */}
      <div className="bg-card rounded-2xl border border-border p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Enterprise RBAC & Identity Governance
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Module-isolated authorization matrices, role scopes, and granular CRUD policies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-surface px-3 py-1.5 rounded-xl border border-border/60">
            <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span>Select a workspace module below to manage its specific roles:</span>
          </div>
        </div>

        {/* Module Selector Tab Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
          {/* 1. Task & Operations Workflow */}
          {canAccessTask && (
            <button
              type="button"
              onClick={() => setSelectedModule("TASK_WORKFLOW")}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer ${
                selectedModule === "TASK_WORKFLOW"
                  ? "bg-blue-500/10 border-blue-500/40 shadow-sm ring-1 ring-blue-500/20"
                  : "bg-surface/60 border-border/40 hover:bg-surface hover:border-border"
              }`}
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                selectedModule === "TASK_WORKFLOW" ? "bg-blue-500 text-white shadow-xs" : "bg-blue-500/10 text-blue-500"
              }`}>
                <FolderKanban className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-bold truncate ${selectedModule === "TASK_WORKFLOW" ? "text-blue-600 dark:text-blue-400" : "text-foreground"}`}>
                  Task & Operations Workflow
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  Workspaces, Requirements & IAM
                </span>
              </div>
            </button>
          )}

          {/* 2. Fleet & Vehicle Desk */}
          {canAccessVehicle && (
            <button
              type="button"
              onClick={() => setSelectedModule("VEHICLE_DESK")}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer ${
                selectedModule === "VEHICLE_DESK"
                  ? "bg-amber-500/10 border-amber-500/40 shadow-sm ring-1 ring-amber-500/20"
                  : "bg-surface/60 border-border/40 hover:bg-surface hover:border-border"
              }`}
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                selectedModule === "VEHICLE_DESK" ? "bg-amber-500 text-white shadow-xs" : "bg-amber-500/10 text-amber-500"
              }`}>
                <Car className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-bold truncate ${selectedModule === "VEHICLE_DESK" ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                  Fleet & Vehicle Desk
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  Vehicles, Drivers & Trips
                </span>
              </div>
            </button>
          )}

          {/* 3. Design Tracking */}
          {canAccessDesign && (
            <button
              type="button"
              onClick={() => setSelectedModule("DESIGN_TRACKING")}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer ${
                selectedModule === "DESIGN_TRACKING"
                  ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20"
                  : "bg-surface/60 border-border/40 hover:bg-surface hover:border-border"
              }`}
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                selectedModule === "DESIGN_TRACKING" ? "bg-emerald-500 text-white shadow-xs" : "bg-emerald-500/10 text-emerald-500"
              }`}>
                <Compass className="h-4 w-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-bold truncate ${selectedModule === "DESIGN_TRACKING" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                  Design Tracking
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  Drawings, Matrix & GFC Approvals
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Render Module-Specific RBAC Governance Matrix */}
      <div className="w-full">
        {selectedModule === "VEHICLE_DESK" ? (
          <FleetRbacGovernance />
        ) : selectedModule === "DESIGN_TRACKING" ? (
          <DesignRbacGovernance />
        ) : (
          <IAMGovernanceCockpit />
        )}
      </div>
    </div>
  );
}
