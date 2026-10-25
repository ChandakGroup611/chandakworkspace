/* ui-audit-disable */
/**
 * One place that knows about themes. Everything else (provider, pickers,
 * components) imports from here instead of keeping its own
 * ["light-neumorphic", "pure-white", ...] list (there were 7 copies).
 * Colours live in styles/themes.css (generated + contrast-checked).
 */

export type ThemeMode = "light" | "dark";

export const THEMES = [
  { id: "chandak-classic",   label: "Chandak Classic",   mode: "light", group: "Light",         blurb: "Brand plum on cool neutrals. The default for everyday work.",                 sidebarTone: "light", swatch: ["#ffffff", "#ffffff", "#702963"] },
  { id: "chandak-executive", label: "Chandak Executive", mode: "light", group: "Light",         blurb: "Deep aubergine navigation rail with a bright, quiet workspace.",             sidebarTone: "dark", swatch: ["#ffffff", "#23101f", "#702963"] },
  { id: "corporate-blue",    label: "Corporate Blue",    mode: "light", group: "Light",         blurb: "Navy rail, blue actions. Familiar to anyone who lives in ERP and Office.",    sidebarTone: "dark", swatch: ["#ffffff", "#0f1e3d", "#1d4ed8"] },
  { id: "teal-ledger",       label: "Teal Ledger",       mode: "light", group: "Light",         blurb: "Calm teal for finance, AMC and approval-heavy screens.",                      sidebarTone: "light", swatch: ["#ffffff", "#ffffff", "#0f766e"] },
  { id: "saffron-site",      label: "Saffron Site",      mode: "light", group: "Light",         blurb: "Warm construction-site orange with charcoal rail. Good for Design Tracking.", sidebarTone: "dark", swatch: ["#ffffff", "#1f1d1b", "#b4410b"] },
  { id: "high-contrast",     label: "High Contrast",     mode: "light", group: "Accessibility", blurb: "Maximum legibility for long shifts, projectors and low-vision users.",        sidebarTone: "light", swatch: ["#ffffff", "#ffffff", "#0039a6"] },
  { id: "midnight-plum",     label: "Midnight Plum",     mode: "dark",  group: "Dark",          blurb: "Low-glare dark mode that keeps the Chandak plum identity.",                   sidebarTone: "dark", swatch: ["#0e1016", "#0b0d12", "#d38bc2"] },
  { id: "graphite",          label: "Graphite",          mode: "dark",  group: "Dark",          blurb: "Neutral charcoal with blue actions. Quiet enough for 8-hour days.",          sidebarTone: "dark", swatch: ["#101113", "#0c0d0f", "#5b9bff"] },
  { id: "control-room",      label: "Control Room",      mode: "dark",  group: "Dark",          blurb: "Deep blue-black with cyan signals for fleet and live-ops wallboards.",        sidebarTone: "dark", swatch: ["#080d13", "#060a0f", "#2cc4d9"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export const DEFAULT_THEME: ThemeId = "chandak-classic";
export const DEFAULT_DARK_THEME: ThemeId = "midnight-plum";

/** Old ids saved in localStorage / DB → new ids, so nobody gets a broken screen after deploy. */
export const LEGACY_THEME_MAP: Record<string, ThemeId> = {
  "light-neumorphic": "chandak-classic",
  "pure-white": "chandak-classic",
  "pure-white-neumorphic": "teal-ledger",
  "amazon-prime-upi": "saffron-site",
  "dark-neumorphic": "midnight-plum",
  "cyberpunk": "graphite",
  "amazon": "graphite",
  "industrial-control": "control-room",
  // dashboard-only ids that never had CSS
  "executive-light": "chandak-classic",
  "midnight-operations": "graphite",
  "glass-intelligence": "graphite",
  "enterprise-bento": "chandak-classic",
  "tactical-utility": "control-room",
};

export const ACCENTS = [
  { id: "theme-default", label: "Theme default", sidebarTone: "light", swatch: null },
  { id: "plum",    label: "Plum",    sidebarTone: "light", swatch: "#702963" },
  { id: "blue",    label: "Blue",    sidebarTone: "light", swatch: "#1d4ed8" },
  { id: "indigo",  label: "Indigo",  sidebarTone: "light", swatch: "#4338ca" },
  { id: "teal",    label: "Teal",    sidebarTone: "light", swatch: "#0f766e" },
  { id: "emerald", label: "Emerald", sidebarTone: "light", swatch: "#047857" },
  { id: "saffron", label: "Saffron", sidebarTone: "light", swatch: "#b4410b" },
  { id: "slate",   label: "Slate",   sidebarTone: "light", swatch: "#334155" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];

export const DENSITIES = ["comfortable", "compact", "dense"] as const;
export type Density = (typeof DENSITIES)[number];

/** Business-appropriate fonts only. Legacy picks (comic-sans, impact, times …) fall back to Inter. */
export const FONTS = {
  inter:  { label: "Inter",        stack: "var(--font-inter), 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif" },
  roboto: { label: "Roboto",       stack: "var(--font-roboto), 'Roboto', system-ui, sans-serif" },
  outfit: { label: "Outfit",       stack: "var(--font-outfit), 'Outfit', system-ui, sans-serif" },
  system: { label: "System UI",    stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
} as const;
export type FontId = keyof typeof FONTS;

export const WEIGHT_PROFILES = {
  standard: { semibold: 600, bold: 650, extrabold: 700 },
  heavy:    { semibold: 600, bold: 700, extrabold: 800 },
  light:    { semibold: 500, bold: 600, extrabold: 700 },
} as const;
export type WeightProfile = keyof typeof WEIGHT_PROFILES;

const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));

export function normalizeTheme(value: unknown): ThemeId {
  if (typeof value !== "string") return DEFAULT_THEME;
  if (THEME_IDS.has(value)) return value as ThemeId;
  return LEGACY_THEME_MAP[value] ?? DEFAULT_THEME;
}
export function normalizeAccent(value: unknown): AccentId | `#${string}` {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) return value as `#${string}`;
  if (typeof value === "string" && ACCENTS.some((a) => a.id === value)) return value as AccentId;
  return "theme-default";
}
export function normalizeDensity(value: unknown): Density {
  return (DENSITIES as readonly string[]).includes(value as string) ? (value as Density) : "comfortable";
}
export function normalizeFont(value: unknown): FontId {
  return typeof value === "string" && value in FONTS ? (value as FontId) : "inter";
}
export function normalizeWeight(value: unknown): WeightProfile {
  return typeof value === "string" && value in WEIGHT_PROFILES ? (value as WeightProfile) : "standard";
}

export function getTheme(id: ThemeId) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
export const themeMode = (id: ThemeId): ThemeMode => getTheme(id).mode;
export const isLightTheme = (id: ThemeId) => themeMode(id) === "light";

/* ---------- custom hex accent: pick a readable text colour ---------- */
function luminance(hex: string) {
  const n = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrastRatio(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** Returns CSS variables for a user-picked hex, with a text colour that passes 4.5:1. */
export function customAccentVars(hex: string, mode: ThemeMode): Record<string, string> {
  const onWhite = contrastRatio("#ffffff", hex);
  const onBlack = contrastRatio("#0b0b0b", hex);
  const fg = onWhite >= onBlack ? "#ffffff" : "#0b0b0b";
  const soft = `color-mix(in srgb, ${hex} ${mode === "dark" ? 16 : 8}%, var(--bg-surface))`;
  return {
    "--accent-primary": hex,
    "--accent-secondary": `color-mix(in srgb, ${hex} 85%, ${mode === "dark" ? "#ffffff" : "#000000"})`,
    "--btn-primary-bg": hex,
    "--btn-primary-hover": `color-mix(in srgb, ${hex} 85%, ${mode === "dark" ? "#ffffff" : "#000000"})`,
    "--btn-primary-text": fg,
    "--accent-soft": soft,
    "--bg-selected": soft,
    "--accent-soft-text": `color-mix(in srgb, ${hex} 75%, ${mode === "dark" ? "#ffffff" : "#000000"})`,
    "--focus-ring": hex,
    "--sidebar-indicator": hex,
  };
}
export const CUSTOM_ACCENT_KEYS = Object.keys(customAccentVars("#000000", "light"));

/** localStorage keys (unchanged from v1 so existing preferences carry over) */
export const STORAGE_KEYS = {
  theme: "app_theme",
  density: "app_density",
  tactile: "app_tactile",
  font: "app_font",
  weight: "app_font_weight_profile",
  accent: "app_accent_color",
  baseSize: "app_base_font_size",
  subtextSize: "app_subtext_font_size",
} as const;
