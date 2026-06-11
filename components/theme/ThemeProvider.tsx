"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeType = "executive-light" | "midnight-operations" | "glass-intelligence" | "material-ocean" | "aurora-breeze" | "pure-elegance";
export type DensityType = "comfortable" | "compact" | "dense";
export type FontFamilyType = "inter" | "outfit" | "roboto";

interface ThemeContextType {
  theme: ThemeType;
  density: DensityType;
  tactileFeedback: boolean;
  fontFamily: FontFamilyType;
  baseFontSize: number;
  subtextFontSize: number;
  setTheme: (theme: ThemeType) => void;
  setDensity: (density: DensityType) => void;
  setTactileFeedback: (enabled: boolean) => void;
  setFontFamily: (font: FontFamilyType) => void;
  setBaseFontSize: (size: number) => void;
  setSubtextFontSize: (size: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>("glass-intelligence");
  const [density, setDensityState] = useState<DensityType>("comfortable");
  const [tactileFeedback, setTactileFeedbackState] = useState<boolean>(true);
  const [fontFamily, setFontFamilyState] = useState<FontFamilyType>("inter");
  const [baseFontSize, setBaseFontSizeState] = useState<number>(16);
  const [subtextFontSize, setSubtextFontSizeState] = useState<number>(14);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read from localStorage safely on client mount
    const storedTheme = localStorage.getItem("app_theme") as ThemeType;
    const storedDensity = localStorage.getItem("app_density") as DensityType;
    const storedTactile = localStorage.getItem("app_tactile");
    const storedFont = localStorage.getItem("app_font") as FontFamilyType;
    const storedBaseSize = localStorage.getItem("app_base_font_size");
    const storedSubtextSize = localStorage.getItem("app_subtext_font_size");

    if (storedTheme && ["executive-light", "midnight-operations", "glass-intelligence", "material-ocean", "aurora-breeze", "pure-elegance"].includes(storedTheme)) {
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

    if (storedBaseSize) {
      setBaseFontSizeState(Number(storedBaseSize));
    }

    if (storedSubtextSize) {
      setSubtextFontSizeState(Number(storedSubtextSize));
    }

    setMounted(true);
  }, []);

  const updateThemeGlobals = (
    activeTheme: ThemeType,
    activeFont?: FontFamilyType,
    activeBaseSize?: number,
    activeSubtextSize?: number
  ) => {
    if (typeof document === "undefined") return;
    const isLight = activeTheme === "executive-light" || activeTheme === "material-ocean" || activeTheme === "aurora-breeze" || activeTheme === "pure-elegance";
    
    // Inject dynamic root classes to gracefully steer hardcoded container defaults
    if (isLight) {
      document.documentElement.classList.add("theme-light");
      document.documentElement.classList.remove("theme-dark");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("theme-dark");
      document.documentElement.classList.remove("theme-light");
      document.documentElement.classList.add("dark");
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

    const bSize = activeBaseSize || baseFontSize;
    const sSize = activeSubtextSize || subtextFontSize;
    
    document.documentElement.style.setProperty("--base-font-size", `${bSize}px`);
    document.documentElement.style.setProperty("--subtext-font-size", `${sSize}px`);
    document.documentElement.style.setProperty("font-size", `${bSize}px`, "important");
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
      updateThemeGlobals(newTheme, fontFamily, baseFontSize, subtextFontSize);
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
      updateThemeGlobals(theme, font, baseFontSize, subtextFontSize);
    }
  };

  const setBaseFontSize = (size: number) => {
    setBaseFontSizeState(size);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_base_font_size", size.toString());
      updateThemeGlobals(theme, fontFamily, size, subtextFontSize);
    }
  };

  const setSubtextFontSize = (size: number) => {
    setSubtextFontSizeState(size);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_subtext_font_size", size.toString());
      updateThemeGlobals(theme, fontFamily, baseFontSize, size);
    }
  };

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.setAttribute("data-density", density);
      updateThemeGlobals(theme, fontFamily, baseFontSize, subtextFontSize);
    }
  }, [mounted, theme, density, fontFamily, baseFontSize, subtextFontSize]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        density,
        tactileFeedback,
        fontFamily,
        baseFontSize,
        subtextFontSize,
        setTheme,
        setDensity,
        setTactileFeedback,
        setFontFamily,
        setBaseFontSize,
        setSubtextFontSize,
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
