"use client";

/**
 * Compact theme menu for the navbar (replaces DashboardThemeSwitcher, which only
 * opened on mouse hover, had a hard-coded black panel and listed ids with no CSS).
 * Keyboard and touch friendly via Radix Popover.
 */
import React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";
import { THEMES } from "./theme-registry";

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Change theme"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-foreground"
        >
          <Palette className="h-4 w-4" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-[var(--z-popover)] w-64 rounded-[10px] border border-border bg-elevated p-1.5 shadow-lg"
        >
          <div className="px-2 pb-1.5 pt-1 theme-label">Theme</div>
          <div role="menu" aria-label="Theme">
            {THEMES.map((t) => {
              const active = t.id === theme;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px]",
                    active ? "bg-accent-soft text-accent-soft-text font-semibold" : "text-foreground hover:bg-surface-hover"
                  )}
                >
                  <span className="flex h-4 w-6 overflow-hidden rounded-sm border border-border" aria-hidden>
                    <span className="w-1/3" style={{ background: t.swatch[1] }} />
                    <span className="flex-1" style={{ background: t.swatch[0] }} />
                    <span className="w-1/4" style={{ background: t.swatch[2] }} />
                  </span>
                  <span className="flex-1">{t.label}</span>
                  {active && <Check className="h-3.5 w-3.5" aria-hidden />}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
