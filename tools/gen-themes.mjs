// Single source of truth for Chandak Workspace themes.
// Generates themes.css + themes.json and fails loudly on WCAG contrast misses.
import fs from "node:fs";
import path from "node:path";

const OUT = process.argv[2] || ".";

// ---------- colour helpers ----------
const hex2rgb = (h) => {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const rgb2hex = (r) => "#" + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v * t + B[i] * (1 - t))); }; // t = share of a
const lum = (h) => { const c = hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// ---------- semantic status palettes ----------
const STATUS_LIGHT = {
  success: { solid: "#15803d", text: "#166534" },
  warning: { solid: "#b45309", text: "#92400e" },
  danger:  { solid: "#b91c1c", text: "#991b1b" },
  info:    { solid: "#0369a1", text: "#075985" },
};
const STATUS_DARK = {
  success: { solid: "#34d399", text: "#6ee7b7" },
  warning: { solid: "#fbbf24", text: "#fcd34d" },
  danger:  { solid: "#f87171", text: "#fca5a5" },
  info:    { solid: "#38bdf8", text: "#7dd3fc" },
};

// ---------- theme definitions ----------
// mode: light|dark. primary = brand action colour. sidebar = left nav surface.
const THEMES = [
  {
    id: "chandak-classic", label: "Chandak Classic", mode: "light", group: "Light",
    blurb: "Brand plum on cool neutrals. The default for everyday work.",
    canvas: "#f4f5f8", surface: "#ffffff", sunken: "#f0f2f6", hover: "#eceef3",
    border: "#e2e5eb", strong: "#c3c8d2", input: "#b9bfca",
    text: "#141a26", text2: "#3c4555", muted: "#5d6677", heading: "#0d1220",
    primary: "#702963", primaryHover: "#5a1f4f", primaryFg: "#ffffff",
    sidebar: { bg: "#ffffff", text: "#2b3342", muted: "#5d6677", hover: "#f3f4f7", activeBg: "#f6ecf4", activeText: "#702963", border: "#e2e5eb", indicator: "#702963" },
    chart: ["#702963", "#2563eb", "#0f766e", "#d97706", "#64748b", "#be185d"],
  },
  {
    id: "chandak-executive", label: "Chandak Executive", mode: "light", group: "Light",
    blurb: "Deep aubergine navigation rail with a bright, quiet workspace.",
    canvas: "#f5f4f6", surface: "#ffffff", sunken: "#f1eff3", hover: "#ece9ef",
    border: "#e4e0e7", strong: "#c6c0cc", input: "#bbb4c2",
    text: "#1a1420", text2: "#43394b", muted: "#665c6e", heading: "#120c17",
    primary: "#702963", primaryHover: "#5a1f4f", primaryFg: "#ffffff",
    sidebar: { bg: "#23101f", text: "#efe4ec", muted: "#b9a2b3", hover: "#331a2e", activeBg: "#4a2343", activeText: "#ffffff", border: "#341b30", indicator: "#e7a6d7" },
    chart: ["#702963", "#c2410c", "#0f766e", "#2563eb", "#a16207", "#6b7280"],
  },
  {
    id: "corporate-blue", label: "Corporate Blue", mode: "light", group: "Light",
    blurb: "Navy rail, blue actions. Familiar to anyone who lives in ERP and Office.",
    canvas: "#f3f5f9", surface: "#ffffff", sunken: "#eef2f7", hover: "#e8edf5",
    border: "#dde3ec", strong: "#bec8d6", input: "#b3bfd0",
    text: "#0f1a2e", text2: "#36445c", muted: "#57667e", heading: "#0a1324",
    primary: "#1d4ed8", primaryHover: "#1a3fb0", primaryFg: "#ffffff",
    sidebar: { bg: "#0f1e3d", text: "#e3e9f5", muted: "#9aabc9", hover: "#18294d", activeBg: "#1f3a72", activeText: "#ffffff", border: "#1a2a4b", indicator: "#7aa7ff" },
    chart: ["#1d4ed8", "#0891b2", "#7c3aed", "#ea580c", "#16a34a", "#64748b"],
  },
  {
    id: "teal-ledger", label: "Teal Ledger", mode: "light", group: "Light",
    blurb: "Calm teal for finance, AMC and approval-heavy screens.",
    canvas: "#f3f6f6", surface: "#ffffff", sunken: "#eef3f2", hover: "#e7eeed",
    border: "#dce5e3", strong: "#bccbc8", input: "#b0c1be",
    text: "#10201e", text2: "#354844", muted: "#566a66", heading: "#0a1715",
    primary: "#0f766e", primaryHover: "#0b5f58", primaryFg: "#ffffff",
    sidebar: { bg: "#ffffff", text: "#24332f", muted: "#566a66", hover: "#f1f5f4", activeBg: "#e6f3f1", activeText: "#0b5f58", border: "#dce5e3", indicator: "#0f766e" },
    chart: ["#0f766e", "#1d4ed8", "#b45309", "#7c3aed", "#be123c", "#64748b"],
  },
  {
    id: "saffron-site", label: "Saffron Site", mode: "light", group: "Light",
    blurb: "Warm construction-site orange with charcoal rail. Good for Design Tracking.",
    canvas: "#f6f5f3", surface: "#ffffff", sunken: "#f2f0ec", hover: "#ece9e4",
    border: "#e4e0d9", strong: "#c9c2b7", input: "#bdb5a8",
    text: "#1c1814", text2: "#463f37", muted: "#685f55", heading: "#14110d",
    primary: "#b4410b", primaryHover: "#953508", primaryFg: "#ffffff",
    sidebar: { bg: "#1f1d1b", text: "#f0ebe5", muted: "#b0a79c", hover: "#2c2926", activeBg: "#3d3530", activeText: "#ffffff", border: "#2e2b28", indicator: "#f59e5b" },
    chart: ["#b4410b", "#1d4ed8", "#0f766e", "#a16207", "#6d28d9", "#57534e"],
  },
  {
    id: "high-contrast", label: "High Contrast", mode: "light", group: "Accessibility",
    blurb: "Maximum legibility for long shifts, projectors and low-vision users.",
    canvas: "#ffffff", surface: "#ffffff", sunken: "#f2f2f2", hover: "#e8e8e8",
    border: "#767676", strong: "#000000", input: "#000000",
    text: "#000000", text2: "#1a1a1a", muted: "#3d3d3d", heading: "#000000",
    primary: "#0039a6", primaryHover: "#002a7a", primaryFg: "#ffffff",
    sidebar: { bg: "#ffffff", text: "#000000", muted: "#3d3d3d", hover: "#e8e8e8", activeBg: "#0039a6", activeText: "#ffffff", border: "#000000", indicator: "#000000" },
    chart: ["#0039a6", "#b30000", "#006b2d", "#7a4b00", "#5b0099", "#000000"],
    statusOverride: { success: { solid: "#006b2d", text: "#00531f" }, warning: { solid: "#7a4b00", text: "#5c3800" }, danger: { solid: "#b30000", text: "#8a0000" }, info: { solid: "#0039a6", text: "#002a7a" } },
  },
  {
    id: "midnight-plum", label: "Midnight Plum", mode: "dark", group: "Dark",
    blurb: "Low-glare dark mode that keeps the Chandak plum identity.",
    canvas: "#0e1016", surface: "#151821", sunken: "#11131a", hover: "#1e2230", elevated: "#1a1d28",
    border: "#252a37", strong: "#3a4152", input: "#434b5e",
    text: "#e9ebf1", text2: "#bcc2ce", muted: "#959cab", heading: "#f5f6f9",
    primary: "#d38bc2", primaryHover: "#e2a5d3", primaryFg: "#22091c",
    sidebar: { bg: "#0b0d12", text: "#d9dce4", muted: "#8f96a5", hover: "#171a23", activeBg: "#2a1a28", activeText: "#f3c6e8", border: "#1c202b", indicator: "#d38bc2" },
    chart: ["#d38bc2", "#60a5fa", "#2dd4bf", "#fbbf24", "#a78bfa", "#94a3b8"],
  },
  {
    id: "graphite", label: "Graphite", mode: "dark", group: "Dark",
    blurb: "Neutral charcoal with blue actions. Quiet enough for 8-hour days.",
    canvas: "#101113", surface: "#17181b", sunken: "#131416", hover: "#212328", elevated: "#1c1e22",
    border: "#26282d", strong: "#3a3d44", input: "#454953",
    text: "#e8e9ec", text2: "#b9bcc4", muted: "#9195a0", heading: "#f4f5f7",
    primary: "#5b9bff", primaryHover: "#7fb1ff", primaryFg: "#06142e",
    sidebar: { bg: "#0c0d0f", text: "#d7d9de", muted: "#8b8f99", hover: "#18191d", activeBg: "#16233b", activeText: "#a9c8ff", border: "#1d1f23", indicator: "#5b9bff" },
    chart: ["#5b9bff", "#2dd4bf", "#f472b6", "#fbbf24", "#a78bfa", "#9ca3af"],
  },
  {
    id: "control-room", label: "Control Room", mode: "dark", group: "Dark",
    blurb: "Deep blue-black with cyan signals for fleet and live-ops wallboards.",
    canvas: "#080d13", surface: "#0e1520", sunken: "#0a1018", hover: "#16202e", elevated: "#121b28",
    border: "#1b2636", strong: "#2c3c52", input: "#36485f",
    text: "#e2ebf5", text2: "#aebdd0", muted: "#8597ad", heading: "#f0f6fc",
    primary: "#2cc4d9", primaryHover: "#5ad5e6", primaryFg: "#03171c",
    sidebar: { bg: "#060a0f", text: "#cfdae6", muted: "#7f90a6", hover: "#0f1722", activeBg: "#0c2a33", activeText: "#7ee6f3", border: "#121b27", indicator: "#2cc4d9" },
    chart: ["#2cc4d9", "#818cf8", "#34d399", "#fbbf24", "#f472b6", "#94a3b8"],
  },
];

// Accent overrides users can pick on top of any theme ("Use theme accent" = none).
const ACCENTS = {
  plum:    { light: ["#702963", "#5a1f4f", "#ffffff"], dark: ["#d38bc2", "#e2a5d3", "#22091c"] },
  blue:    { light: ["#1d4ed8", "#1a3fb0", "#ffffff"], dark: ["#5b9bff", "#7fb1ff", "#06142e"] },
  teal:    { light: ["#0f766e", "#0b5f58", "#ffffff"], dark: ["#2dd4bf", "#5eead4", "#032421"] },
  indigo:  { light: ["#4338ca", "#3730a3", "#ffffff"], dark: ["#8b93ff", "#a5abff", "#0e1040"] },
  saffron: { light: ["#b4410b", "#953508", "#ffffff"], dark: ["#fb923c", "#fdba74", "#2a1203"] },
  emerald: { light: ["#047857", "#065f46", "#ffffff"], dark: ["#34d399", "#6ee7b7", "#022c1e"] },
  slate:   { light: ["#334155", "#1e293b", "#ffffff"], dark: ["#cbd5e1", "#e2e8f0", "#0f172a"] },
};

// ---------- derive + check ----------
const problems = [];
const check = (theme, name, fg, bg, min) => {
  const r = contrast(fg, bg);
  if (r < min) problems.push(`${theme}: ${name} ${fg} on ${bg} = ${r.toFixed(2)} (< ${min})`);
  return r;
};

function derive(t) {
  const dark = t.mode === "dark";
  const st = t.statusOverride || (dark ? STATUS_DARK : STATUS_LIGHT);
  const elevated = t.elevated || t.surface;
  const softT = dark ? 0.16 : 0.08;
  const accentSoft = mix(t.primary, t.surface, softT);
  // accent text on soft: light → primary itself (dark enough); dark → primaryHover (lighter)
  const accentSoftText = dark ? t.primaryHover : t.primary;
  const status = {};
  for (const k of Object.keys(st)) status[k] = { solid: st[k].solid, text: st[k].text, soft: mix(st[k].solid, t.surface, dark ? 0.14 : 0.09), border: mix(st[k].solid, t.surface, dark ? 0.35 : 0.3) };
  const dangerSolid = dark ? "#dc2626" : "#b91c1c";
  const v = {
    "color-scheme": dark ? "dark" : "light",
    "--bg-primary": t.canvas,
    "--bg-surface": t.surface,
    "--bg-elevated": elevated,
    "--bg-sunken": t.sunken,
    "--bg-hover": t.hover,
    "--bg-selected": accentSoft,
    "--text-primary": t.text,
    "--text-secondary": t.text2,
    "--text-muted": t.muted,
    "--text-disabled": mix(t.muted, t.surface, 0.6),
    "--heading-text": t.heading,
    "--icon-color": t.muted,
    "--border-subtle": t.border,
    "--border-active": t.strong,
    "--border-input": t.input,
    "--accent-primary": t.primary,
    "--accent-secondary": t.primaryHover,
    "--accent-soft": accentSoft,
    "--accent-soft-text": accentSoftText,
    "--btn-primary-bg": t.primary,
    "--btn-primary-hover": t.primaryHover,
    "--btn-primary-text": t.primaryFg,
    "--btn-secondary-bg": t.surface,
    "--btn-secondary-hover": t.hover,
    "--btn-secondary-text": t.text,
    "--btn-secondary-border": t.strong,
    "--tab-active-bg": t.surface,
    "--tab-active-text": t.text,
    "--tab-inactive-bg": "transparent",
    "--tab-inactive-text": t.muted,
    "--danger-solid": dangerSolid,
    "--danger-solid-text": "#ffffff",
    "--focus-ring": dark ? t.primaryHover : t.primary,
    "--overlay": dark ? "rgba(0, 0, 0, 0.62)" : "rgba(15, 20, 30, 0.45)",
    "--elevation-sm": dark ? "0 1px 2px rgba(0,0,0,.5)" : "0 1px 2px rgba(16,24,40,.06)",
    "--elevation-md": dark ? "0 4px 12px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.03)" : "0 4px 12px rgba(16,24,40,.08), 0 1px 3px rgba(16,24,40,.06)",
    "--elevation-lg": dark ? "0 16px 40px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04)" : "0 16px 40px rgba(16,24,40,.16), 0 2px 6px rgba(16,24,40,.08)",
    "--selection-bg": dark ? mix(t.primary, t.surface, 0.45) : mix(t.primary, "#ffffff", 0.22),
    "--selection-text": t.text,
    "--sidebar-bg": t.sidebar.bg,
    "--sidebar-text": t.sidebar.text,
    "--sidebar-muted": t.sidebar.muted,
    "--sidebar-hover": t.sidebar.hover,
    "--sidebar-active-bg": t.sidebar.activeBg,
    "--sidebar-active-text": t.sidebar.activeText,
    "--sidebar-border": t.sidebar.border,
    "--sidebar-indicator": t.sidebar.indicator,
  };
  for (const [k, s] of Object.entries(status)) {
    v[`--${k}`] = s.solid; v[`--${k}-text`] = s.text; v[`--${k}-soft`] = s.soft; v[`--${k}-border`] = s.border;
  }
  t.chart.forEach((c, i) => (v[`--chart-${i + 1}`] = c));

  // ---- contrast checks (WCAG AA) ----
  const id = t.id;
  for (const [bgName, bg] of [["canvas", t.canvas], ["surface", t.surface], ["sunken", t.sunken], ["hover", t.hover]]) {
    check(id, `text/${bgName}`, t.text, bg, 7);
    check(id, `text2/${bgName}`, t.text2, bg, 4.5);
    check(id, `muted/${bgName}`, t.muted, bg, 4.5);
  }
  check(id, "btn-primary", t.primaryFg, t.primary, 4.5);
  check(id, "btn-primary-hover", t.primaryFg, t.primaryHover, 4.5);
  check(id, "primary as text on surface", dark ? t.primaryHover : t.primary, t.surface, 4.5);
  check(id, "accent-soft-text", accentSoftText, accentSoft, 4.5);
  check(id, "focus ring vs surface", v["--focus-ring"], t.surface, 3);
  check(id, "focus ring vs canvas", v["--focus-ring"], t.canvas, 3);
  check(id, "danger button", "#ffffff", dangerSolid, 4.5);
  for (const [k, s] of Object.entries(status)) {
    check(id, `${k}-text on soft`, s.text, s.soft, 4.5);
    check(id, `${k}-text on surface`, s.text, t.surface, 4.5);
    check(id, `${k} icon on surface`, s.solid, t.surface, 3);
  }
  const sb = t.sidebar;
  check(id, "sidebar text", sb.text, sb.bg, 7);
  check(id, "sidebar muted", sb.muted, sb.bg, 4.5);
  check(id, "sidebar text on hover", sb.text, sb.hover, 4.5);
  check(id, "sidebar active", sb.activeText, sb.activeBg, 4.5);
  check(id, "sidebar indicator", sb.indicator, sb.bg, 3);
  check(id, "input border vs surface (soft target 1.8)", t.input, t.surface, 1.8);
  return v;
}

const derived = THEMES.map((t) => ({ t, v: derive(t) }));

// accents
const accentCss = [];
for (const [name, a] of Object.entries(ACCENTS)) {
  for (const { t } of derived) {
    const [bg, hover, fg] = a[t.mode];
    check(`accent ${name}/${t.id}`, "button", fg, bg, 4.5);
    check(`accent ${name}/${t.id}`, "button hover", fg, hover, 4.5);
    const textOnSurface = t.mode === "dark" ? hover : bg;
    check(`accent ${name}/${t.id}`, "as text", textOnSurface, t.surface, 4.5);
    const soft = mix(bg, t.surface, t.mode === "dark" ? 0.16 : 0.08);
    check(`accent ${name}/${t.id}`, "soft text", textOnSurface, soft, 4.5);
  }
  for (const mode of ["light", "dark"]) {
    const [bg, hover, fg] = a[mode];
    const softT = mode === "dark" ? 16 : 8;
    accentCss.push(`[data-mode="${mode}"][data-accent="${name}"] {
  --accent-primary: ${bg}; --accent-secondary: ${hover};
  --btn-primary-bg: ${bg}; --btn-primary-hover: ${hover}; --btn-primary-text: ${fg};
  --accent-soft: color-mix(in srgb, ${bg} ${softT}%, var(--bg-surface));
  --bg-selected: var(--accent-soft);
  --accent-soft-text: ${mode === "dark" ? hover : bg};
  --focus-ring: ${mode === "dark" ? hover : bg};
  --sidebar-indicator: ${mode === "dark" ? bg : bg};
  --selection-bg: color-mix(in srgb, ${bg} ${mode === "dark" ? 45 : 22}%, ${mode === "dark" ? "var(--bg-surface)" : "#ffffff"});
}`);
  }
}

// ---------- emit CSS ----------
const block = (sel, v) => `${sel} {\n${Object.entries(v).map(([k, val]) => `  ${k}: ${val};`).join("\n")}\n}`;
const header = `/* ==========================================================================
   Chandak Workspace — Enterprise theme tokens (generated by gen-themes.mjs)
   Do not hand-edit colours here: change gen-themes.mjs and regenerate so every
   pair is re-checked against WCAG AA.
   Apply with <html data-theme="<id>" data-mode="light|dark" [data-accent] [data-density]>
   ========================================================================== */
`;
const defaults = derived[0];
let css = header + "\n" + block(":root", defaults.v) + "\n\n";
for (const { t, v } of derived) css += `/* ${t.label} — ${t.blurb} */\n` + block(`[data-theme="${t.id}"]`, v) + "\n\n";
css += "/* ---------- Accent overrides (optional) ---------- */\n" + accentCss.join("\n") + "\n\n";
css += `/* ---------- Density ---------- */
:root, [data-density="comfortable"] {
  --control-h: 36px; --control-h-sm: 30px; --row-h: 44px;
  --cell-px: 16px; --cell-py: 10px; --font-body: 14px; --font-table: 13.5px; --gap: 16px;
}
[data-density="compact"] {
  --control-h: 32px; --control-h-sm: 28px; --row-h: 38px;
  --cell-px: 12px; --cell-py: 8px; --font-body: 13.5px; --font-table: 13px; --gap: 12px;
}
[data-density="dense"] {
  --control-h: 28px; --control-h-sm: 24px; --row-h: 32px;
  --cell-px: 10px; --cell-py: 5px; --font-body: 13px; --font-table: 12.5px; --gap: 8px;
}
`;

const meta = derived.map(({ t, v }) => ({ id: t.id, label: t.label, mode: t.mode, group: t.group, blurb: t.blurb, swatch: [t.canvas, t.sidebar.bg, t.primary, v["--success"], v["--warning"], v["--danger"]] }));

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "themes.css"), css);
fs.writeFileSync(path.join(OUT, "themes.json"), JSON.stringify({ themes: meta, accents: Object.keys(ACCENTS) }, null, 2));

if (problems.length) {
  console.error("CONTRAST PROBLEMS:\n" + problems.join("\n"));
  process.exit(1);
}
console.log(`OK: ${THEMES.length} themes, ${Object.keys(ACCENTS).length} accents, all checks pass.`);
