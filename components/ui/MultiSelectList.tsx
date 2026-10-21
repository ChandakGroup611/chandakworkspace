"use client";

/**
 * Shared option list for FormMultiSelect and MultiSelectFilter.
 * - every option is a type="button" (v1 filter options had no type, so inside a <form>
 *   each click SUBMITTED the form)
 * - real checkbox visuals for both components (v1 filter showed only a tick, no fill)
 * - search box appears automatically when there are more than 8 options
 * - working hover colour (v1 used the invalid class `hover:opacity-90/10`)
 */
import React from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiOption { value: string; label: string }

export function CheckboxMark({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
        checked || indeterminate ? "border-primary bg-primary text-primary-foreground" : "border-input bg-surface"
      )}
    >
      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : indeterminate ? <span className="h-0.5 w-2 rounded bg-current" /> : null}
    </span>
  );
}

export function MultiSelectList({
  options,
  selectedValues,
  onChange,
  showSelectAll = false,
  searchThreshold = 8,
}: {
  options: MultiOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  showSelectAll?: boolean;
  searchThreshold?: number;
}) {
  const [query, setQuery] = React.useState("");
  const selected = React.useMemo(() => new Set(selectedValues), [selectedValues]);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const toggle = (v: string) => onChange(selected.has(v) ? selectedValues.filter((x) => x !== v) : [...selectedValues, v]);
  const allSelected = options.length > 0 && options.every((o) => selected.has(o.value));
  const someSelected = !allSelected && options.some((o) => selected.has(o.value));

  return (
    <div className="flex max-h-[min(360px,60vh)] flex-col">
      {options.length > searchThreshold && (
        <div className="relative border-b border-border p-1.5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            aria-label="Search options"
            className="h-8 w-full rounded-md border-0 bg-sunken pl-7 pr-2 text-[13px] shadow-none focus-visible:shadow-none"
            autoFocus
          />
        </div>
      )}

      <div role="listbox" aria-multiselectable="true" className="min-h-0 flex-1 overflow-y-auto p-1">
        {showSelectAll && options.length > 0 && !query && (
          <>
            <button
              type="button"
              role="option"
              aria-selected={allSelected}
              onClick={() => onChange(allSelected ? [] : options.map((o) => o.value))}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] font-medium hover:bg-surface-hover"
            >
              <CheckboxMark checked={allSelected} indeterminate={someSelected} />
              Select all
            </button>
            <div className="my-1 h-px bg-border" />
          </>
        )}

        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-center text-[12.5px] text-muted">{options.length ? "No matches" : "No options available"}</div>
        ) : (
          filtered.map((o) => {
            const on = selected.has(o.value);
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => toggle(o.value)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-surface-hover",
                  on && "text-foreground font-medium"
                )}
              >
                <CheckboxMark checked={on} />
                <span className="truncate">{o.label}</span>
              </button>
            );
          })
        )}
      </div>

      {selectedValues.length > 0 && (
        <div className="flex items-center justify-between border-t border-border px-2.5 py-1.5 text-[12px]">
          <span className="text-muted tabular">{selectedValues.length} selected</span>
          <button type="button" onClick={() => onChange([])} className="font-medium text-accent-soft-text hover:underline">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
