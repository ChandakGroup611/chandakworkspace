"use client";

import React, { useState, useMemo } from "react";
import { Check, Minus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
}

export interface MultiSelectListProps {
  options: Option[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onSelectAll?: () => void;
  onClear: () => void;
  showSelectAll?: boolean;
}

export function MultiSelectList({
  options,
  selectedValues,
  onToggle,
  onSelectAll,
  onClear,
  showSelectAll = false,
}: MultiSelectListProps) {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const allSelected = options.length > 0 && selectedValues.length === options.length;
  const isIndeterminate = selectedValues.length > 0 && !allSelected;

  return (
    <div className="flex flex-col max-h-72 w-full text-foreground">
      {/* Search box if > 8 options */}
      {options.length > 8 && (
        <div className="p-2 border-b border-border sticky top-0 bg-elevated z-10">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full h-8 pl-8 pr-2.5 text-xs bg-surface border border-input rounded-[var(--radius-input)] placeholder:text-muted focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring text-foreground"
            />
          </div>
        </div>
      )}

      {/* Select All (Filter only) */}
      {showSelectAll && onSelectAll && (
        <div className="p-1 border-b border-border">
          <button
            type="button"
            role="option"
            aria-selected={allSelected}
            onClick={onSelectAll}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius-input)] text-xs font-medium text-left hover:bg-surface-hover text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div
              className={cn(
                "w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors shrink-0",
                allSelected || isIndeterminate
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-input bg-surface"
              )}
            >
              {allSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
              {isIndeterminate && <Minus className="w-3 h-3 stroke-[2.5]" />}
            </div>
            <span className="font-semibold">Select all</span>
          </button>
        </div>
      )}

      {/* Options List */}
      <div className="overflow-y-auto p-1 space-y-0.5 flex-1" role="listbox" aria-multiselectable="true">
        {filteredOptions.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted">No options found</div>
        ) : (
          filteredOptions.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onToggle(option.value)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius-input)] text-xs text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "bg-selected text-foreground font-medium"
                    : "hover:bg-surface-hover text-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors shrink-0",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-input bg-surface"
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                </div>
                <span className="truncate">{option.label}</span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border flex items-center justify-between text-xs bg-sunken rounded-b-xl">
        <span className="text-muted tabular-nums">
          {selectedValues.length} selected
        </span>
        {selectedValues.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-subtle hover:text-danger-text transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
