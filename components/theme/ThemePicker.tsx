"use client";

/**
 * Drop-in "Appearance" panel for Settings → Design Gallery.
 * Shows each theme as a mini app preview (rail + canvas + primary button)
 * rendered from the theme's real tokens, plus accent, density and font size.
 */
import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";
import { THEMES, ACCENTS, DENSITIES, type ThemeId } from "./theme-registry";

function ThemeTile({ id, label, blurb, active, onSelect }: { id: ThemeId; label: string; blurb: string; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        "group text-left rounded-[10px] border bg-surface p-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        active ? "border-primary ring-1 ring-primary" : "border-border hover:border-border-active"
      )}
    >
      {/* Mini preview painted with the target theme's own tokens */}
      <div data-theme={id} className="pointer-events-none flex h-[84px] overflow-hidden rounded-md border border-border" aria-hidden>
        <div className="w-[26%] bg-sidebar p-1.5 space-y-1 border-r border-sidebar-border">
          <div className="h-1.5 w-3/4 rounded-sm bg-sidebar-muted/50" />
          <div className="h-2.5 rounded-sm bg-sidebar-active border-l-2 border-sidebar-indicator" />
          <div className="h-1.5 w-2/3 rounded-sm bg-sidebar-muted/40" />
          <div className="h-1.5 w-1/2 rounded-sm bg-sidebar-muted/40" />
        </div>
        <div className="flex-1 bg-background p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="h-1.5 w-1/3 rounded-sm bg-foreground/70" />
            <div className="h-3 w-8 rounded-sm bg-primary" />
          </div>
          <div className="rounded-sm border border-border bg-surface p-1.5 space-y-1">
            <div className="h-1 w-full rounded-sm bg-muted/30" />
            <div className="flex gap-1">
              <span className="h-1.5 w-5 rounded-full bg-success" />
              <span className="h-1.5 w-5 rounded-full bg-warning" />
              <span className="h-1.5 w-5 rounded-full bg-danger" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-foreground">{label}</span>
        {active && <Check className="h-4 w-4 text-accent-soft-text" aria-hidden />}
      </div>
      <p className="mt-0.5 text-xs leading-snug text-muted line-clamp-2">{blurb}</p>
    </button>
  );
}

export function ThemePicker() {
  const { theme, setTheme, accentColor, setAccentColor, density, setDensity, baseFontSize, setBaseFontSize, resetToDefaults } = useTheme();
  const groups = ["Light", "Dark", "Accessibility"] as const;

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g} aria-labelledby={`theme-group-${g}`} className="space-y-3">
          <h3 id={`theme-group-${g}`} className="theme-label">{g} themes</h3>
          <div role="radiogroup" aria-label={`${g} themes`} className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
            {THEMES.filter((t) => t.group === g).map((t) => (
              <ThemeTile key={t.id} id={t.id} label={t.label} blurb={t.blurb} active={theme === t.id} onSelect={() => setTheme(t.id)} />
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-3">
        <h3 className="theme-label">Accent colour</h3>
        <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap gap-2">
          {ACCENTS.map((a) => {
            const active = accentColor === a.id;
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setAccentColor(a.id)}
                className={cn(
                  "inline-flex items-center gap-2 h-8 rounded-md border px-2.5 text-[13px]",
                  active ? "border-primary bg-accent-soft text-accent-soft-text font-semibold" : "border-border text-subtle hover:bg-surface-hover"
                )}
              >
                {/* ui-audit-ignore-next-line default accent placeholder dot */}
                {a.swatch ? <span className="h-3.5 w-3.5 rounded-full" style={{ background: a.swatch }} /> : <span className="h-3.5 w-3.5 rounded-full border border-dashed border-border-active" />}
                {a.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="space-y-3">
          <h3 className="theme-label">Density</h3>
          <div className="theme-tab-list" role="tablist" aria-label="Density">
            {DENSITIES.map((d) => (
              <button key={d} type="button" role="tab" aria-selected={density === d} className="theme-tab-standard capitalize" onClick={() => setDensity(d)}>
                {d}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Dense fits about 40% more table rows on screen.</p>
        </section>

        <section className="space-y-3">
          <label htmlFor="base-font-size" className="theme-label block">Text size · {baseFontSize}px</label>
          <input
            id="base-font-size"
            type="range"
            min={13}
            max={18}
            step={1}
            value={baseFontSize}
            onChange={(e) => setBaseFontSize(Number(e.target.value))}
            className="w-full accent-[var(--btn-primary-bg)]"
          />
        </section>
      </div>

      <button type="button" onClick={resetToDefaults} className="text-[13px] font-medium text-accent-soft-text hover:underline">
        Reset appearance to defaults
      </button>
    </div>
  );
}
