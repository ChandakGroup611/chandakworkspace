/* eslint-disable no-restricted-syntax */
"use client";


import React from "react";
import { useTheme } from "./ThemeProvider";
import { THEMES, ACCENTS, DENSITIES, type ThemeId, type AccentId, type Density } from "./theme-registry";
import { Check, RotateCcw } from "lucide-react";

export function ThemePicker() {
  const {
    theme: currentTheme,
    setTheme,
    accentColor,
    setAccentColor,
    density,
    setDensity,
    baseFontSize,
    setBaseFontSize,
    resetToDefaults,
  } = useTheme();

  const groups = [
    { name: "Light Themes", group: "Light" },
    { name: "Dark Themes", group: "Dark" },
    { name: "Accessibility", group: "Accessibility" },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Theme Tiles Grouped */}
      <div className="space-y-6">
        {groups.map(({ name, group }) => {
          const groupThemes = THEMES.filter((t) => t.group === group);
          return (
            <div key={group} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                {name}
              </h3>
              <div
                role="radiogroup"
                aria-label={name}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {groupThemes.map((t) => {
                  const isSelected = currentTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setTheme(t.id)}
                      className={`relative flex flex-col text-left rounded-xl border p-3.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isSelected
                          ? "border-primary bg-selected shadow-md ring-1 ring-primary"
                          : "border-border bg-surface hover:border-border-active hover:shadow-sm"
                      }`}
                    >
                      {/* Mini Preview wrapped in data-theme */}
                      <div
                        data-theme={t.id}
                        className="w-full h-24 rounded-lg overflow-hidden border border-border flex mb-3 shrink-0"
                        style={{ backgroundColor: "var(--bg-primary)" }}
                      >
                        {/* Nav rail */}
                        <div
                          className="w-8 shrink-0 flex flex-col items-center py-2 gap-1.5 border-r border-border"
                          style={{ backgroundColor: "var(--sidebar-bg)" }}
                        >
                          <div
                            className="w-3.5 h-3.5 rounded-full"
                            style={{ backgroundColor: "var(--sidebar-indicator)" }}
                          />
                          <div
                            className="w-4 h-1 rounded"
                            style={{ backgroundColor: "var(--sidebar-muted)", opacity: 0.5 }}
                          />
                          <div
                            className="w-4 h-1 rounded"
                            style={{ backgroundColor: "var(--sidebar-muted)", opacity: 0.5 }}
                          />
                        </div>
                        {/* Canvas body */}
                        <div
                          className="flex-1 p-2 flex flex-col justify-between"
                          style={{ backgroundColor: "var(--bg-primary)" }}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="text-[10px] font-semibold"
                              style={{ color: "var(--heading-text)" }}
                            >
                              Aa
                            </span>
                            {/* Status dots */}
                            <div className="flex items-center gap-1">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: "var(--success)" }}
                              />
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: "var(--warning)" }}
                              />
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: "var(--danger)" }}
                              />
                            </div>
                          </div>
                          {/* Mini button */}
                          <div className="flex justify-end">
                            <span
                              className="px-2 py-0.5 rounded text-[9px] font-medium"
                              style={{
                                backgroundColor: "var(--btn-primary-bg)",
                                color: "var(--btn-primary-text)",
                              }}
                            >
                              Action
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">
                            {t.label}
                          </div>
                          <div className="text-xs text-muted line-clamp-2 mt-0.5">
                            {t.blurb}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="h-3 w-3 stroke-[2.5]" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Accent selection */}
      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Accent Colour
        </h3>
        <p className="text-xs text-muted">
          Overrides the primary action, focus rings, links, and active nav indicator.
        </p>
        <div className="flex flex-wrap gap-2.5 items-center">
          {ACCENTS.map((a) => {
            const isSelected = accentColor === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAccentColor(a.id as AccentId)}
                aria-pressed={isSelected}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? "border-primary bg-selected text-foreground ring-1 ring-primary"
                    : "border-border bg-surface text-subtle hover:border-border-active hover:text-foreground"
                }`}
              >
                {a.swatch ? (
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: a.swatch }}
                  />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-full border border-dashed border-muted shrink-0" />
                )}
                <span>{a.label}</span>
                {isSelected && <Check className="h-3 w-3 text-primary ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Density control */}
      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Interface Density
        </h3>
        <div className="inline-flex p-1 rounded-lg border border-border bg-sunken gap-1">
          {DENSITIES.map((d) => {
            const isSelected = density === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDensity(d as Density)}
                aria-pressed={isSelected}
                className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? "bg-surface text-foreground shadow-sm font-semibold"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Base font size slider */}
      <div className="space-y-3 pt-4 border-t border-border max-w-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Text Size
          </h3>
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {baseFontSize}px
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted font-medium">13px</span>
          <input
            type="range"
            min={13}
            max={18}
            step={1}
            value={baseFontSize}
            onChange={(e) => setBaseFontSize(Number(e.target.value))}
            className="flex-1 accent-primary cursor-pointer"
            aria-label="Text size"
          />
          <span className="text-xs text-muted font-medium">18px</span>
        </div>
      </div>

      {/* Reset appearance to defaults */}
      <div className="pt-4 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={resetToDefaults}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-danger-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset appearance to defaults</span>
        </button>
      </div>
    </div>
  );
}
