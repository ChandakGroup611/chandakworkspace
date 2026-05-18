"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeType = "executive-light" | "midnight-operations" | "glass-intelligence";
export type DensityType = "comfortable" | "compact" | "dense";
export type FontFamilyType = "inter" | "outfit" | "roboto";
export type FontSizeScaleType = "sm" | "base" | "lg";

interface ThemeContextType {
  theme: ThemeType;
  density: DensityType;
  tactileFeedback: boolean;
  fontFamily: FontFamilyType;
  fontSizeScale: FontSizeScaleType;
  setTheme: (theme: ThemeType) => void;
  setDensity: (density: DensityType) => void;
  setTactileFeedback: (enabled: boolean) => void;
  setFontFamily: (font: FontFamilyType) => void;
  setFontSizeScale: (scale: FontSizeScaleType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>("glass-intelligence");
  const [density, setDensityState] = useState<DensityType>("comfortable");
  const [tactileFeedback, setTactileFeedbackState] = useState<boolean>(true);
  const [fontFamily, setFontFamilyState] = useState<FontFamilyType>("inter");
  const [fontSizeScale, setFontSizeScaleState] = useState<FontSizeScaleType>("base");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read from localStorage safely on client mount
    const storedTheme = localStorage.getItem("app_theme") as ThemeType;
    const storedDensity = localStorage.getItem("app_density") as DensityType;
    const storedTactile = localStorage.getItem("app_tactile");
    const storedFont = localStorage.getItem("app_font") as FontFamilyType;
    const storedScale = localStorage.getItem("app_font_scale") as FontSizeScaleType;

    if (storedTheme && ["executive-light", "midnight-operations", "glass-intelligence"].includes(storedTheme)) {
      setThemeState(storedTheme);
    } else {
      setThemeState("glass-intelligence");
    }

    if (storedDensity && ["comfortable", "compact", "dense"].includes(storedDensity)) {
      setDensityState(storedDensity);
    }

    if (storedTactile !== null) {
      setTactileFeedbackState(storedTactile === "true");
    }

    if (storedFont && ["inter", "outfit", "roboto"].includes(storedFont)) {
      setFontFamilyState(storedFont);
    }

    if (storedScale && ["sm", "base", "lg"].includes(storedScale)) {
      setFontSizeScaleState(storedScale);
    }

    setMounted(true);
  }, []);

  const updateThemeGlobals = (
    activeTheme: ThemeType,
    activeFont?: FontFamilyType,
    activeScale?: FontSizeScaleType
  ) => {
    if (typeof document === "undefined") return;
    const isLight = activeTheme === "executive-light";
    
    // Inject dynamic root classes to gracefully steer hardcoded container defaults
    if (isLight) {
      document.documentElement.classList.add("theme-light");
      document.documentElement.classList.remove("theme-dark");
    } else {
      document.documentElement.classList.add("theme-dark");
      document.documentElement.classList.remove("theme-light");
    }

    // Apply literal DOM style modifications to bypass any fixed CSS framework specificities
    const fontTarget = activeFont || fontFamily;
    document.documentElement.setAttribute("data-font", fontTarget);
    if (fontTarget === "outfit") {
      document.body.style.setProperty("font-family", "'Outfit', system-ui, sans-serif", "important");
    } else if (fontTarget === "roboto") {
      document.body.style.setProperty("font-family", "'Roboto', system-ui, sans-serif", "important");
    } else {
      document.body.style.setProperty("font-family", "'Inter', system-ui, sans-serif", "important");
    }

    const scaleTarget = activeScale || fontSizeScale;
    document.documentElement.setAttribute("data-font-scale", scaleTarget);
    if (scaleTarget === "sm") {
      document.documentElement.style.setProperty("font-size", "15px", "important");
    } else if (scaleTarget === "lg") {
      document.documentElement.style.setProperty("font-size", "19px", "important");
    } else {
      document.documentElement.style.setProperty("font-size", "17.5px", "important");
    }
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
      updateThemeGlobals(newTheme, fontFamily, fontSizeScale);
    }
  };

  const setDensity = (newDensity: DensityType) => {
    setDensityState(newDensity);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_density", newDensity);
      document.documentElement.setAttribute("data-density", newDensity);
    }
  };

  const setTactileFeedback = (enabled: boolean) => {
    setTactileFeedbackState(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_tactile", String(enabled));
    }
  };

  const setFontFamily = (font: FontFamilyType) => {
    setFontFamilyState(font);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_font", font);
      updateThemeGlobals(theme, font, fontSizeScale);
    }
  };

  const setFontSizeScale = (scale: FontSizeScaleType) => {
    setFontSizeScaleState(scale);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_font_scale", scale);
      updateThemeGlobals(theme, fontFamily, scale);
    }
  };

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.setAttribute("data-density", density);
      updateThemeGlobals(theme, fontFamily, fontSizeScale);
    }
  }, [mounted, theme, density, fontFamily, fontSizeScale]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        density,
        tactileFeedback,
        fontFamily,
        fontSizeScale,
        setTheme,
        setDensity,
        setTactileFeedback,
        setFontFamily,
        setFontSizeScale,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
