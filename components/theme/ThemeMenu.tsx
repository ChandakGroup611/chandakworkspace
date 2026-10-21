"use client";

import React, { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Palette, Check } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { THEMES, type ThemeId } from "./theme-registry";

export function ThemeMenu({ className = "" }: { className?: string }) {
  const { theme: currentTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Change theme"
          className={`h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-foreground hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
        >
          <Palette className="h-4 w-4" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-[var(--z-popover)] w-72 rounded-xl border border-border bg-elevated p-2 shadow-lg focus:outline-none animate-in fade-in-0 zoom-in-95 duration-150"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-2 py-1.5 text-xs font-semibold text-muted uppercase tracking-wider">
            Themes
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto" role="none">
            {THEMES.map((t) => {
              const isSelected = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isSelected
                      ? "bg-selected text-foreground font-semibold"
                      : "text-subtle hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center gap-1 shrink-0 p-1 rounded-md bg-sunken border border-border">
                      {t.swatch.map((color, idx) => (
                        <span
                          key={idx}
                          className="h-3 w-3 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="truncate">{t.label}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
