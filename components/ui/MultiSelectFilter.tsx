"use client";

import React from "react";
import { ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import * as Popover from "@radix-ui/react-popover";
import { MultiSelectList, type Option } from "./MultiSelectList";

export interface MultiSelectFilterProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  iconOnly?: boolean;
}

export function MultiSelectFilter({ 
  options, 
  selectedValues, 
  onChange, 
  placeholder = "Select...", 
  iconOnly = false 
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.value));
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  const isFiltered = selectedValues.length > 0;
  const allSelected = options.length > 0 && selectedValues.length === options.length;

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            iconOnly 
              ? "flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-surface text-muted hover:text-foreground hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0" 
              : "flex items-center justify-between gap-2 px-3 h-[var(--control-h-sm)] text-xs bg-surface hover:bg-surface-hover border border-border hover:border-border-active rounded-[var(--radius-button)] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isFiltered && "border-primary bg-selected text-foreground font-semibold"
          )}
          data-active={isFiltered}
          aria-label={iconOnly ? placeholder : undefined}
        >
          {iconOnly ? (
            <div className="relative">
              <Filter className={cn("w-3.5 h-3.5", isFiltered ? "text-primary" : "text-muted")} />
              {isFiltered && (
                <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                  {selectedValues.length}
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate max-w-[120px] font-medium text-foreground">
                  {placeholder}
                </span>
                {isFiltered && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-primary-foreground shrink-0 tabular-nums">
                    {allSelected ? "All" : selectedValues.length}
                  </span>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />
            </>
          )}
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content
          align={iconOnly ? "end" : "start"}
          sideOffset={4}
          className={cn(
            "z-[var(--z-popover)] bg-elevated border border-border rounded-xl shadow-lg outline-none animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 overflow-hidden",
            iconOnly ? "w-52" : "w-60"
          )}
          onInteractOutside={() => setIsOpen(false)}
        >
          <MultiSelectList
            options={options}
            selectedValues={selectedValues}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onClear={handleClear}
            showSelectAll={true}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
