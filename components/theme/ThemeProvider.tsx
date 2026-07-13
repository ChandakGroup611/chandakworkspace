"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeType = "executive-light" | "midnight-operations" | "material-ocean" | "aurora-breeze" | "pure-elegance" | "glass-intelligence" | "enterprise-bento" | "tactical-utility" | "pristine-white";
export type DensityType = "comfortable" | "compact" | "dense";
export type FontFamilyType = "inter" | "outfit" | "roboto" | "arial" | "times" | "verdana" | "courier" | "georgia" | "trebuchet" | "comic-sans" | "impact";
export type FontWeightProfileType = "heavy" | "standard" | "light";
export type AccentColorType = "blue" | "emerald" | "rose" | "amber" | "purple" | "slate" | string;

interface ThemeContextType {
  theme: ThemeType;
  density: DensityType;
  tactileFeedback: boolean;
  fontFamily: FontFamilyType;
  fontWeightProfile: FontWeightProfileType;
  accentColor: AccentColorType;
  baseFontSize: number;
  subtextFontSize: number;
  setTheme: (theme: ThemeType) => void;
  setDensity: (density: DensityType) => void;
  setTactileFeedback: (enabled: boolean) => void;
  setFontFamily: (font: FontFamilyType) => void;
  setFontWeightProfile: (profile: FontWeightProfileType) => void;
  setAccentColor: (color: AccentColorType) => void;
  setBaseFontSize: (size: number) => void;
  setSubtextFontSize: (size: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>("pristine-white");
  const [density, setDensityState] = useState<DensityType>("comfortable");
  const [tactileFeedback, setTactileFeedbackState] = useState<boolean>(true);
  const [fontFamily, setFontFamilyState] = useState<FontFamilyType>("inter");
  const [fontWeightProfile, setFontWeightProfileState] = useState<FontWeightProfileType>("heavy");
  const [accentColor, setAccentColorState] = useState<AccentColorType>("blue");
  const [baseFontSize, setBaseFontSizeState] = useState<number>(16);
  const [subtextFontSize, setSubtextFontSizeState] = useState<number>(14);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    async function initPreferences() {
      // First load from localStorage to prevent flash
      const storedTheme = localStorage.getItem("app_theme") as ThemeType;
      const storedDensity = localStorage.getItem("app_density") as DensityType;
      const storedTactile = localStorage.getItem("app_tactile");
      const storedFont = localStorage.getItem("app_font") as FontFamilyType;
      const storedFontWeight = localStorage.getItem("app_font_weight_profile") as FontWeightProfileType;
      const storedAccent = localStorage.getItem("app_accent_color") as AccentColorType;
      const storedBaseSize = localStorage.getItem("app_base_font_size");
      const storedSubtextSize = localStorage.getItem("app_subtext_font_size");

      const applyState = (state: any) => {
        if (state.theme && ["executive-light", "midnight-operations", "material-ocean", "aurora-breeze", "pure-elegance", "glass-intelligence", "enterprise-bento", "tactical-utility", "pristine-white"].includes(state.theme)) {
          setThemeState(state.theme);
        }
        if (state.density && ["comfortable", "compact", "dense"].includes(state.density)) {
          setDensityState(state.density);
        }
        if (state.tactile !== undefined) {
          setTactileFeedbackState(state.tactile === "true" || state.tactile === true);
        }
        if (state.fontFamily && ["inter", "outfit", "roboto", "arial", "times", "verdana", "courier", "georgia", "trebuchet", "comic-sans", "impact"].includes(state.fontFamily)) {
          setFontFamilyState(state.fontFamily);
        }
        if (state.fontWeightProfile && ["heavy", "standard", "light"].includes(state.fontWeightProfile)) {
          setFontWeightProfileState(state.fontWeightProfile);
        }
        if (state.accentColor && (["blue", "emerald", "rose", "amber", "purple", "slate"].includes(state.accentColor) || state.accentColor.startsWith("#"))) {
          setAccentColorState(state.accentColor);
        }
        if (state.baseFontSize) {
          setBaseFontSizeState(Number(state.baseFontSize));
        }
        if (state.subtextFontSize) {
          setSubtextFontSizeState(Number(state.subtextFontSize));
        }
      };

      // Apply local storage first
      applyState({
        theme: storedTheme, density: storedDensity, tactile: storedTactile, 
        fontFamily: storedFont, fontWeightProfile: storedFontWeight, accentColor: storedAccent, 
        baseFontSize: storedBaseSize, subtextFontSize: storedSubtextSize
      });
      setMounted(true);

      // Now fetch from DB quietly in background
      try {
        const { fetchDesignPreferences } = await import("@/lib/actions/preferences");
        const res = await fetchDesignPreferences();
        if (res?.success && res.data) {
          const dbPrefs = res.data;
          applyState(dbPrefs);
          // Sync DB prefs to local storage
          if (dbPrefs.theme) localStorage.setItem("app_theme", dbPrefs.theme);
          if (dbPrefs.density) localStorage.setItem("app_density", dbPrefs.density);
          if (dbPrefs.tactile !== undefined) localStorage.setItem("app_tactile", String(dbPrefs.tactile));
          if (dbPrefs.fontFamily) localStorage.setItem("app_font", dbPrefs.fontFamily);
          if (dbPrefs.fontWeightProfile) localStorage.setItem("app_font_weight_profile", dbPrefs.fontWeightProfile);
          if (dbPrefs.accentColor) localStorage.setItem("app_accent_color", dbPrefs.accentColor);
          if (dbPrefs.baseFontSize) localStorage.setItem("app_base_font_size", String(dbPrefs.baseFontSize));
          if (dbPrefs.subtextFontSize) localStorage.setItem("app_subtext_font_size", String(dbPrefs.subtextFontSize));
        }
      } catch (e) {
        // Silent catch
      }
    }

    initPreferences();
  }, []);

  const updateThemeGlobals = (
    activeTheme: ThemeType,
    activeFont?: FontFamilyType,
    activeWeightProfile?: FontWeightProfileType,
    activeAccentColor?: AccentColorType,
    activeBaseSize?: number,
    activeSubtextSize?: number
  ) => {
    if (typeof document === "undefined") return;
    const isLight = activeTheme === "executive-light" || activeTheme === "material-ocean" || activeTheme === "aurora-breeze" || activeTheme === "pure-elegance" || activeTheme === "pristine-white";
    
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
      document.documentElement.style.setProperty("--app-font-family", "var(--font-outfit), 'Outfit', system-ui, sans-serif");
    } else if (fontTarget === "roboto") {
      document.documentElement.style.setProperty("--app-font-family", "var(--font-roboto), 'Roboto', system-ui, sans-serif");
    } else if (fontTarget === "arial") {
      document.documentElement.style.setProperty("--app-font-family", "Arial, Helvetica, sans-serif");
    } else if (fontTarget === "times") {
      document.documentElement.style.setProperty("--app-font-family", "'Times New Roman', Times, serif");
    } else if (fontTarget === "verdana") {
      document.documentElement.style.setProperty("--app-font-family", "Verdana, Geneva, sans-serif");
    } else if (fontTarget === "courier") {
      document.documentElement.style.setProperty("--app-font-family", "'Courier New', Courier, monospace");
    } else if (fontTarget === "georgia") {
      document.documentElement.style.setProperty("--app-font-family", "Georgia, serif");
    } else if (fontTarget === "trebuchet") {
      document.documentElement.style.setProperty("--app-font-family", "'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif");
    } else if (fontTarget === "comic-sans") {
      document.documentElement.style.setProperty("--app-font-family", "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', sans-serif");
    } else if (fontTarget === "impact") {
      document.documentElement.style.setProperty("--app-font-family", "Impact, Charcoal, sans-serif");
    } else {
      document.documentElement.style.setProperty("--app-font-family", "var(--font-inter), 'Inter', system-ui, sans-serif");
    }

    const bSize = activeBaseSize || baseFontSize;
    const sSize = activeSubtextSize || subtextFontSize;
    
    document.documentElement.style.setProperty("--base-font-size", bSize + "px");
    document.documentElement.style.setProperty("--subtext-font-size", sSize + "px");
    document.documentElement.style.setProperty("--text-scale-ratio", String(bSize / 16));

    const wProfile = activeWeightProfile || fontWeightProfile;
    if (wProfile === "heavy") {
      document.documentElement.style.setProperty("--ui-weight-semibold", "600");
      document.documentElement.style.setProperty("--ui-weight-bold", "700");
      document.documentElement.style.setProperty("--ui-weight-extrabold", "800");
    } else if (wProfile === "standard") {
      document.documentElement.style.setProperty("--ui-weight-semibold", "500");
      document.documentElement.style.setProperty("--ui-weight-bold", "600");
      document.documentElement.style.setProperty("--ui-weight-extrabold", "700");
    } else if (wProfile === "light") {
      document.documentElement.style.setProperty("--ui-weight-semibold", "400");
      document.documentElement.style.setProperty("--ui-weight-bold", "500");
      document.documentElement.style.setProperty("--ui-weight-extrabold", "600");
    }

    const aColor = activeAccentColor || accentColor;
    if (aColor === "blue") {
      document.documentElement.style.setProperty("--accent-primary", "#3b82f6");
      document.documentElement.style.setProperty("--accent-secondary", "#60a5fa");
    } else if (aColor === "emerald") {
      document.documentElement.style.setProperty("--accent-primary", "#10b981");
      document.documentElement.style.setProperty("--accent-secondary", "#34d399");
    } else if (aColor === "rose") {
      document.documentElement.style.setProperty("--accent-primary", "#f43f5e");
      document.documentElement.style.setProperty("--accent-secondary", "#fb7185");
    } else if (aColor === "amber") {
      document.documentElement.style.setProperty("--accent-primary", "#f59e0b");
      document.documentElement.style.setProperty("--accent-secondary", "#fbbf24");
    } else if (aColor === "purple") {
      document.documentElement.style.setProperty("--accent-primary", "#8b5cf6");
      document.documentElement.style.setProperty("--accent-secondary", "#a78bfa");
    } else if (aColor === "slate") {
      document.documentElement.style.setProperty("--accent-primary", "#64748b");
      document.documentElement.style.setProperty("--accent-secondary", "#94a3b8");
    } else if (aColor.startsWith("#")) {
      document.documentElement.style.setProperty("--accent-primary", aColor);
      document.documentElement.style.setProperty("--accent-secondary", aColor);
    }
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
      updateThemeGlobals(newTheme, fontFamily, fontWeightProfile, accentColor, baseFontSize, subtextFontSize);
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
      updateThemeGlobals(theme, font, fontWeightProfile, accentColor, baseFontSize, subtextFontSize);
    }
  };

  const setFontWeightProfile = (profile: FontWeightProfileType) => {
    setFontWeightProfileState(profile);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_font_weight_profile", profile);
      updateThemeGlobals(theme, fontFamily, profile, accentColor, baseFontSize, subtextFontSize);
    }
  };

  const setAccentColor = (color: AccentColorType) => {
    setAccentColorState(color);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_accent_color", color);
      updateThemeGlobals(theme, fontFamily, fontWeightProfile, color, baseFontSize, subtextFontSize);
    }
  };

  const setBaseFontSize = (size: number) => {
    setBaseFontSizeState(size);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_base_font_size", size.toString());
      updateThemeGlobals(theme, fontFamily, fontWeightProfile, accentColor, size, subtextFontSize);
    }
  };

  const setSubtextFontSize = (size: number) => {
    setSubtextFontSizeState(size);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_subtext_font_size", size.toString());
      updateThemeGlobals(theme, fontFamily, fontWeightProfile, accentColor, baseFontSize, size);
    }
  };

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.setAttribute("data-density", density);
      updateThemeGlobals(theme, fontFamily, fontWeightProfile, accentColor, baseFontSize, subtextFontSize);
    }
  }, [mounted, theme, density, fontFamily, fontWeightProfile, accentColor, baseFontSize, subtextFontSize]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        density,
        tactileFeedback,
        fontFamily,
        fontWeightProfile,
        accentColor,
        baseFontSize,
        subtextFontSize,
        setTheme,
        setDensity,
        setTactileFeedback,
        setFontFamily,
        setFontWeightProfile,
        setAccentColor,
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
