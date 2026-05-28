"use client";

import React, { createContext, useContext } from "react";
import { useTheme, DensityType } from "./ThemeProvider";

export type ExperienceMode = "executive" | "operational" | "compact";

interface ExperienceContextType {
  mode: ExperienceMode;
}

const ExperienceContext = createContext<ExperienceContextType>({ mode: "operational" });

/**
 * Context-Aware Experience Governance
 * Forces visual density and layout rhythm based on the specific operational context.
 * Executive: Dashboards, Overviews (Forces 'comfortable' density, immersive spacing)
 * Operational: Tables, Grids, Execution Lists (Forces 'dense' density, tactical flow)
 * Compact: Forms, Drawers, Quick Actions (Forces 'compact' density)
 */
export function ExperienceProvider({ 
  mode, 
  children,
  className = "" 
}: { 
  mode: ExperienceMode; 
  children: React.ReactNode;
  className?: string;
}) {
  const { density: globalDensity } = useTheme();

  // Determine the effective density based on context rules
  let effectiveDensity: DensityType = globalDensity;
  if (mode === "executive") {
    effectiveDensity = "comfortable"; // Protect dashboards
  } else if (mode === "operational") {
    effectiveDensity = "dense"; // Aggressive compression for tables
  } else if (mode === "compact") {
    effectiveDensity = "compact"; // Medium compression for forms
  }

  return (
    <ExperienceContext.Provider value={{ mode }}>
      <div data-density={effectiveDensity} className={`experience-mode-${mode} ${className}`}>
        {children}
      </div>
    </ExperienceContext.Provider>
  );
}

export function useExperience() {
  return useContext(ExperienceContext);
}
