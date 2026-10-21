"use client";

import React from "react";
import { ChevronDown, Filter } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { MultiSelectList, type MultiOption } from "./MultiSelectList";

interface MultiSelectFilterProps {
  options: MultiOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  iconOnly?: boolean;
}

/** Column / toolbar filter. Shows an accent count chip when active so applied filters are obvious. */
export function MultiSelectFilter({ options, selectedValues, onChange, placeholder = "Filter", iconOnly = false }: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);
  const count = selectedValues.length;
  const active = count > 0 && count < options.length;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {iconOnly ? (
          <button
            type="button"
            aria-label={`${placeholder} filter${active ? `, ${count} selected` : ""}`}
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-foreground",
              active && "bg-accent-soft text-accent-soft-text"
            )}
          >
            <Filter className={cn("h-3.5 w-3.5", active && "fill-current")} aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            className={cn(
              "inline-flex h-[var(--control-h-sm,30px)] shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-medium transition-colors",
              active ? "border-primary/40 bg-accent-soft text-accent-soft-text" : "border-border-active bg-surface text-foreground hover:bg-surface-hover"
            )}
          >
            <span className="max-w-[140px] truncate">{placeholder}</span>
            {active && <span className="rounded bg-primary px-1 text-[11px] leading-4 text-primary-foreground tabular">{count}</span>}
            <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
          </button>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={iconOnly ? "end" : "start"}
          sideOffset={4}
          className="z-[var(--z-popover)] w-60 overflow-hidden rounded-[10px] border border-border bg-elevated text-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <MultiSelectList options={options} selectedValues={selectedValues} onChange={onChange} showSelectAll />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
