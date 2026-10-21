"use client";

/**
 * Theme-aware props for Recharts (and any SVG chart). v1 charts hard-coded hex colours,
 * so dashboards kept their old palette (and dark text on dark backgrounds) after a theme
 * switch. Spread these onto Recharts components instead:
 *
 *   const ct = useChartTheme();
 *   <CartesianGrid {...ct.grid} />
 *   <XAxis dataKey="month" {...ct.axis} />
 *   <YAxis {...ct.axis} tickFormatter={ct.formatINR} />
 *   <Tooltip {...ct.tooltip} />
 *   <Bar dataKey="budget" fill={ct.series[0]} radius={[3,3,0,0]} />
 *   <Line dataKey="actual" stroke={ct.series[1]} strokeWidth={2} dot={false} />
 *
 * Values are CSS variables, so they switch with the theme without a re-render.
 */

export const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"] as const;

export const STATUS_COLOR = {
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
  neutral: "var(--text-muted)",
} as const;

const inrCompact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
const inrFull = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function useChartTheme() {
  return CHART_THEME;
}

export const CHART_THEME = {
  series: SERIES,
  status: STATUS_COLOR,
  grid: { stroke: "var(--border-subtle)", strokeDasharray: "0", vertical: false },
  axis: {
    stroke: "var(--border-subtle)",
    tick: { fill: "var(--text-muted)", fontSize: 12 },
    tickLine: false,
    axisLine: false,
  },
  tooltip: {
    cursor: { fill: "var(--bg-hover)" },
    contentStyle: {
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-subtle)",
      borderRadius: 8,
      boxShadow: "var(--elevation-md)",
      color: "var(--text-primary)",
      fontSize: 12.5,
    },
    labelStyle: { color: "var(--text-secondary)", fontWeight: 600, marginBottom: 4 },
    itemStyle: { color: "var(--text-primary)" },
  },
  legend: { wrapperStyle: { fontSize: 12.5, color: "var(--text-secondary)" }, iconType: "circle" as const, iconSize: 8 },
  /** ₹ compact, Indian units: 640000 → "₹6.4L", 32000000 → "₹3.2Cr". */
  formatINR: (v: number) => `₹${inrCompact.format(v)}`,
  formatINRFull: (v: number) => inrFull.format(v),
  formatPct: (v: number) => `${Math.round(v)}%`,
} as const;
