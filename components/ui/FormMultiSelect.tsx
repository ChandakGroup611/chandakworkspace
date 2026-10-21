"use client";

import React, { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import * as Popover from "@radix-ui/react-popover";
import { MultiSelectList, type Option } from "./MultiSelectList";

export interface FormMultiSelectProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function FormMultiSelect({ 
  options, 
  selectedValues, 
  onChange, 
  placeholder = "Select...", 
  className,
  disabled = false
}: FormMultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  // Map selected values to their corresponding human-readable labels
  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]));
    return selectedValues.map((v) => map.get(v) || v);
  }, [options, selectedValues]);

  const displayValue = useMemo(() => {
    if (selectedLabels.length === 0) {
      return <span className="text-muted font-normal">{placeholder}</span>;
    }
    if (selectedLabels.length === 1) {
      return selectedLabels[0];
    }
    if (selectedLabels.length === 2) {
      return `${selectedLabels[0]}, ${selectedLabels[1]}`;
    }
    return `${selectedLabels[0]} +${selectedLabels.length - 1} more`;
  }, [selectedLabels, placeholder]);

  return (
    <Popover.Root open={isOpen && !disabled} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between h-[var(--control-h)] px-3 rounded-[var(--radius-input)] text-sm transition-colors",
            "border border-input bg-surface text-foreground placeholder:text-muted",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 hover:border-border-active",
            disabled ? "opacity-55 cursor-not-allowed bg-sunken" : "cursor-pointer",
            className
          )}
        >
          <span className="truncate pr-2 text-left font-normal">{displayValue}</span>
          <ChevronDown className="w-4 h-4 text-muted shrink-0" />
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-[var(--z-popover)] bg-elevated border border-border rounded-xl shadow-lg w-[var(--radix-popover-trigger-width)] min-w-[220px] outline-none animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 overflow-hidden"
          onInteractOutside={() => setIsOpen(false)}
        >
          <MultiSelectList
            options={options}
            selectedValues={selectedValues}
            onToggle={handleToggle}
            onClear={handleClear}
            showSelectAll={false}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
