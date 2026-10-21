"use client";

import React, { createContext, useContext } from "react";
import { useTheme } from "./ThemeProvider";
import type { Density } from "./theme-registry";

export type ExperienceMode = "executive" | "operational" | "compact";

const ExperienceContext = createContext<{ mode: ExperienceMode; density: Density }>({ mode: "operational", density: "comfortable" });

/**
 * v1 ignored the user's Density setting completely (executive → always comfortable,
 * operational → always dense), so the Settings control appeared broken.
 * v2: the user's choice wins. Executive screens are only prevented from going
 * "dense", because KPI tiles and charts become unreadable there.
 */
export function ExperienceProvider({ mode, children, className = "" }: { mode: ExperienceMode; children: React.ReactNode; className?: string }) {
  const { density: userDensity } = useTheme();
  const density: Density = mode === "executive" && userDensity === "dense" ? "compact" : userDensity;

  return (
    <ExperienceContext.Provider value={{ mode, density }}>
      <div data-density={density} className={`experience-mode-${mode} ${className}`}>
        {children}
      </div>
    </ExperienceContext.Provider>
  );
}

export function useExperience() {
  return useContext(ExperienceContext);
}
