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

  // User's density setting wins. One exception: executive mode keeps dashboards out of dense (turns dense into compact).
  let effectiveDensity: DensityType = globalDensity;
  if (mode === "executive" && globalDensity === "dense") {
    effectiveDensity = "compact";
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
