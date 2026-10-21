"use client";

/**
 * ThemeProvider v2
 * - Same public API as v1 (theme, density, fontFamily, accentColor, setters …) plus
 *   `mode` / `isLight`, so callers stop keeping their own lists of light themes.
 * - Works with ThemeScript (rendered in <head>), which paints the saved theme before React loads
 *   — no flash of the wrong theme and no hydration mismatch.
 * - Old saved ids (light-neumorphic, cyberpunk, amazon …) are migrated automatically.
 * - Accent colour now drives the primary button / focus ring / active nav, not just
 *   an unused --accent-primary variable.
 * - All preferences (incl. font sizes) sync to the DB, debounced.
 */
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  type ThemeId, type ThemeMode, type AccentId, type Density, type FontId, type WeightProfile,
  DEFAULT_THEME, FONTS, WEIGHT_PROFILES, STORAGE_KEYS, CUSTOM_ACCENT_KEYS,
  normalizeTheme, normalizeAccent, normalizeDensity, normalizeFont, normalizeWeight,
  themeMode, customAccentVars, DEFAULT_DARK_THEME,
} from "./theme-registry";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// v1 type names kept as aliases so imports elsewhere keep compiling
export type ThemeType = ThemeId;
export type DensityType = Density;
export type FontFamilyType = FontId;
export type FontWeightProfileType = WeightProfile;
export type AccentColorType = AccentId | `#${string}`;

interface Prefs {
  theme: ThemeId;
  density: Density;
  tactileFeedback: boolean;
  fontFamily: FontId;
  fontWeightProfile: WeightProfile;
  accentColor: AccentColorType;
  baseFontSize: number;
  subtextFontSize: number;
}

interface ThemeContextType extends Prefs {
  mode: ThemeMode;
  isLight: boolean;
  setTheme: (theme: ThemeId | string) => void;
  /** Flip between the user's last light and last dark theme (navbar sun/moon button). */
  toggleMode: () => void;
  setDensity: (density: Density) => void;
  setTactileFeedback: (enabled: boolean) => void;
  setFontFamily: (font: FontId | string) => void;
  setFontWeightProfile: (profile: WeightProfile | string) => void;
  setAccentColor: (color: AccentColorType | string) => void;
  setBaseFontSize: (size: number) => void;
  setSubtextFontSize: (size: number) => void;
  resetToDefaults: () => void;
  /** false during SSR / first client render; true once stored prefs are applied */
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULTS: Prefs = {
  theme: DEFAULT_THEME,
  density: "comfortable",
  tactileFeedback: true,
  fontFamily: "inter",
  fontWeightProfile: "standard",
  accentColor: "theme-default",
  baseFontSize: 16,
  subtextFontSize: 14,
};

const clampSize = (n: unknown, min: number, max: number, fallback: number) => {
  const v = Number(n);
  return Number.isFinite(v) && v >= min && v <= max ? v : fallback;
};

function safeGet(key: string) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* private mode / quota */ }
}

function readStoredPrefs(): Partial<Prefs> {
  if (typeof window === "undefined") return {};
  const out: Partial<Prefs> = {};
  const t = safeGet(STORAGE_KEYS.theme); if (t) out.theme = normalizeTheme(t);
  const d = safeGet(STORAGE_KEYS.density); if (d) out.density = normalizeDensity(d);
  const tf = safeGet(STORAGE_KEYS.tactile); if (tf !== null) out.tactileFeedback = tf === "true";
  const f = safeGet(STORAGE_KEYS.font); if (f) out.fontFamily = normalizeFont(f);
  const w = safeGet(STORAGE_KEYS.weight); if (w) out.fontWeightProfile = normalizeWeight(w);
  const a = safeGet(STORAGE_KEYS.accent); if (a) out.accentColor = normalizeAccent(a);
  const b = safeGet(STORAGE_KEYS.baseSize); if (b) out.baseFontSize = clampSize(b, 12, 20, 16);
  const s = safeGet(STORAGE_KEYS.subtextSize); if (s) out.subtextFontSize = clampSize(s, 10, 18, 14);
  return out;
}

function writeStoredPrefs(p: Prefs) {
  safeSet(STORAGE_KEYS.theme, p.theme);
  safeSet(STORAGE_KEYS.density, p.density);
  safeSet(STORAGE_KEYS.tactile, String(p.tactileFeedback));
  safeSet(STORAGE_KEYS.font, p.fontFamily);
  safeSet(STORAGE_KEYS.weight, p.fontWeightProfile);
  safeSet(STORAGE_KEYS.accent, p.accentColor);
  safeSet(STORAGE_KEYS.baseSize, String(p.baseFontSize));
  safeSet(STORAGE_KEYS.subtextSize, String(p.subtextFontSize));
}

/** Single place that touches <html>. Idempotent. */
function applyToDocument(p: Prefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const mode = themeMode(p.theme);

  root.setAttribute("data-theme", p.theme);
  root.setAttribute("data-mode", mode);
  root.setAttribute("data-density", p.density);
  root.classList.toggle("theme-light", mode === "light");
  root.classList.toggle("theme-dark", mode === "dark");
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;

  // accent: preset → data-accent (pure CSS); custom hex → inline vars
  CUSTOM_ACCENT_KEYS.forEach((k) => root.style.removeProperty(k));
  root.removeAttribute("data-accent");
  if (typeof p.accentColor === "string" && p.accentColor.startsWith("#")) {
    Object.entries(customAccentVars(p.accentColor, mode)).forEach(([k, v]) => root.style.setProperty(k, v));
  } else if (p.accentColor !== "theme-default") {
    root.setAttribute("data-accent", p.accentColor);
  }

  root.style.setProperty("--app-font-family", FONTS[p.fontFamily].stack);
  const w = WEIGHT_PROFILES[p.fontWeightProfile];
  root.style.setProperty("--ui-weight-semibold", String(w.semibold));
  root.style.setProperty("--ui-weight-bold", String(w.bold));
  root.style.setProperty("--ui-weight-extrabold", String(w.extrabold));
  root.style.setProperty("--base-font-size", `${p.baseFontSize}px`);
  root.style.setProperty("--subtext-font-size", `${p.subtextFontSize}px`);
  root.style.setProperty("--text-scale-ratio", String(p.baseFontSize / 16));
  root.toggleAttribute("data-no-tactile", !p.tactileFeedback);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Server and first client render use DEFAULTS (no hydration mismatch). Stored prefs are
  // read in a layout effect, i.e. before the browser paints; ThemeScript has already
  // styled <html>, so nothing flashes either way.
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const hydratedFromDb = useRef(false);
  const lastLight = useRef<ThemeId>(DEFAULT_THEME);
  const lastDark = useRef<ThemeId>(DEFAULT_DARK_THEME);

  useIsoLayoutEffect(() => {
    setPrefs({ ...DEFAULTS, ...readStoredPrefs() });
    setLoaded(true);
  }, []);

  // Apply + persist locally whenever anything changes
  useEffect(() => {
    if (!loaded) return;
    applyToDocument(prefs);
    writeStoredPrefs(prefs);
    if (themeMode(prefs.theme) === "light") lastLight.current = prefs.theme; else lastDark.current = prefs.theme;
  }, [prefs, loaded]);

  // First visit on a new device: pull saved preferences from the DB
  useEffect(() => {
    let cancelled = false;
    const hadLocalTheme = safeGet(STORAGE_KEYS.theme) !== null;
    if (hadLocalTheme) {
      hydratedFromDb.current = true;
      return;
    }

    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/auth/")) {
        hydratedFromDb.current = true;
        return;
      }
    }

    (async () => {
      try {
        const { fetchDesignPreferences } = await import("@/lib/actions/preferences");
        const res = await fetchDesignPreferences();
        if (cancelled || !res?.success || !res.data) return;
        const db = res.data as Record<string, unknown>;
        setPrefs((p) => ({
          ...p,
          theme: db.theme ? normalizeTheme(db.theme) : p.theme,
          density: db.density ? normalizeDensity(db.density) : p.density,
          tactileFeedback: typeof db.tactileFeedback === "boolean" ? db.tactileFeedback : p.tactileFeedback,
          fontFamily: db.fontFamily ? normalizeFont(db.fontFamily) : p.fontFamily,
          fontWeightProfile: db.fontWeightProfile ? normalizeWeight(db.fontWeightProfile) : p.fontWeightProfile,
          accentColor: db.accentColor ? normalizeAccent(db.accentColor) : p.accentColor,
          baseFontSize: clampSize(db.baseFontSize, 12, 20, p.baseFontSize),
          subtextFontSize: clampSize(db.subtextFontSize, 10, 18, p.subtextFontSize),
        }));
      } catch {
        /* offline or action missing: local prefs are fine */
      } finally {
        hydratedFromDb.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Save to DB (debounced) after the initial load, so every device follows the user
  useEffect(() => {
    if (!loaded || !hydratedFromDb.current) return;
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/auth/")) {
        return;
      }
    }
    const id = window.setTimeout(async () => {
      try {
        const { saveDesignPreferences } = await import("@/lib/actions/preferences");
        await saveDesignPreferences(prefs);
      } catch (e) {
        console.warn("[theme] could not save preferences", e);
      }
    }, 800);
    return () => window.clearTimeout(id);
  }, [prefs, loaded]);

  const update = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => (p[key] === value ? p : { ...p, [key]: value }));
  }, []);

  const value = useMemo<ThemeContextType>(() => {
    const mode = themeMode(prefs.theme);
    return {
      ...prefs,
      mode,
      isLight: mode === "light",
      setTheme: (t) => update("theme", normalizeTheme(t)),
      toggleMode: () => update("theme", mode === "light" ? lastDark.current : lastLight.current),
      setDensity: (d) => update("density", normalizeDensity(d)),
      setTactileFeedback: (b) => update("tactileFeedback", !!b),
      setFontFamily: (f) => update("fontFamily", normalizeFont(f)),
      setFontWeightProfile: (w) => update("fontWeightProfile", normalizeWeight(w)),
      setAccentColor: (a) => update("accentColor", normalizeAccent(a)),
      setBaseFontSize: (n) => update("baseFontSize", clampSize(n, 12, 20, 16)),
      setSubtextFontSize: (n) => update("subtextFontSize", clampSize(n, 10, 18, 14)),
      resetToDefaults: () => setPrefs(DEFAULTS),
      ready: loaded,
    };
  }, [prefs, update, loaded]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

/** Non-throwing variant for leaf components that may render outside the provider (Storybook, tests). */
export function useOptionalTheme() {
  return useContext(ThemeContext);
}
