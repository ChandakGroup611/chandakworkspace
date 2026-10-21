"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { MultiSelectList, type MultiOption } from "./MultiSelectList";

interface FormMultiSelectProps {
  options: MultiOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
}

/*
 * v1 showed the raw VALUES of the first two picks (often database ids) instead of their
 * labels, had no search, and its popover (z-100) rendered BEHIND EnterpriseModalShell (z-200)
 * and EnterpriseDrawerShell (z-999999).
 */
export function FormMultiSelect({ options, selectedValues, onChange, placeholder = "Select…", className, disabled = false, id, ...rest }: FormMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const labelFor = React.useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);
  const labels = selectedValues.map((v) => labelFor.get(v) ?? v);

  const display =
    labels.length === 0 ? <span className="text-muted">{placeholder}</span>
    : labels.length <= 2 ? labels.join(", ")
    : <>{labels[0]} <span className="text-muted">+{labels.length - 1} more</span></>;

  return (
    <Popover.Root open={open && !disabled} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={rest["aria-invalid"]}
          className={cn(
            "theme-input-structural flex w-full items-center justify-between gap-2 px-3 text-left text-[13.5px]",
            className
          )}
        >
          <span className="truncate">{display}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-[var(--z-popover)] w-[var(--radix-popover-trigger-width)] min-w-[220px] overflow-hidden rounded-[10px] border border-border bg-elevated text-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <MultiSelectList options={options} selectedValues={selectedValues} onChange={onChange} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
