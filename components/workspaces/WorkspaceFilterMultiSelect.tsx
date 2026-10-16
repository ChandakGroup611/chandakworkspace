"use client";
/* eslint-disable no-restricted-syntax */

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface FilterOption {
  id: string;
  label: string;
  sublabel?: string;
  color?: string;
}

interface WorkspaceFilterMultiSelectProps {
  label: string;
  placeholder: string;
  options: FilterOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function WorkspaceFilterMultiSelect({
  label,
  placeholder,
  options,
  selectedIds,
  onChange,
  isOpen,
  onToggle,
  onClose
}: WorkspaceFilterMultiSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside of this dropdown container
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      opt => opt.label.toLowerCase().includes(q) || (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  const handleToggleOption = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(item => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(opt => opt.id));
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  // Determine display label on trigger button
  const triggerLabel = useMemo(() => {
    if (selectedIds.length === 0) return placeholder;
    if (selectedIds.length === 1) {
      const match = options.find(o => o.id === selectedIds[0]);
      return match ? match.label : "1 Selected";
    }
    return `${selectedIds.length} Selected`;
  }, [selectedIds, options, placeholder]);

  const allSelected = options.length > 0 && selectedIds.length === options.length;

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
          <span>{label}</span>
          {selectedIds.length > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-theme-btn-primary/15 text-theme-btn-primary">
              {selectedIds.length}
            </span>
          ) : (
            <span className="text-[9px] text-muted/60 font-normal lowercase tracking-normal">
              (multi-select)
            </span>
          )}
        </label>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] font-semibold text-muted hover:text-danger underline transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between text-xs px-2.5 py-2 rounded-lg border transition-all text-left outline-none ${
          isOpen
            ? "border-theme-btn-primary ring-1 ring-theme-btn-primary/30 bg-surface shadow-sm"
            : selectedIds.length > 0
            ? "border-theme-btn-primary/50 bg-theme-btn-primary/5 text-foreground"
            : "border-border bg-surface text-muted hover:text-foreground hover:bg-surface/60"
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {selectedIds.length === 1 && (
            (() => {
              const match = options.find(o => o.id === selectedIds[0]);
              if (match?.color) {
                return (
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: match.color }}
                  />
                );
              }
              return null;
            })()
          )}
          <span className={`truncate font-medium ${selectedIds.length > 0 ? "text-foreground font-semibold" : ""}`}>
            {triggerLabel}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selectedIds.length > 0 && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-surface/80 text-muted hover:text-danger cursor-pointer mr-0.5"
              title="Clear selection"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted transition-transform duration-150 ${
              isOpen ? "rotate-180 text-theme-btn-primary" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu Container */}
      {isOpen && (
        <div className="w-full mt-1 rounded-xl border border-border bg-surface shadow-xl p-2 z-40 animate-in fade-in zoom-in-95 duration-100 space-y-2">
          {/* Search Bar if > 5 options */}
          {options.length > 5 && (
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                placeholder={`Search ${label.toLowerCase()}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1 text-xs rounded-md bg-surface/80 border border-border/70 text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-theme-btn-primary focus:border-theme-btn-primary"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Quick Action Header: Select All / Count */}
          <div className="flex items-center justify-between px-1 text-[11px] text-muted border-b border-border/40 pb-1.5">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 font-semibold text-theme-btn-primary hover:underline"
            >
              <div
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                  allSelected
                    ? "bg-theme-btn-primary border-theme-btn-primary text-white"
                    : "border-border"
                }`}
              >
                {allSelected && <Check className="w-2.5 h-2.5" />}
              </div>
              <span>{allSelected ? "Deselect All" : "Select All"}</span>
            </button>
            <span>
              {selectedIds.length} of {options.length}
            </span>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto pr-1 space-y-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted italic">
                No matching {label.toLowerCase()}
              </div>
            ) : (
              filteredOptions.map(option => {
                const isSelected = selectedIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleToggleOption(option.id)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg transition-colors text-left group ${
                      isSelected
                        ? "bg-theme-btn-primary/10 text-theme-btn-primary font-semibold"
                        : "text-foreground hover:bg-surface/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-theme-btn-primary border-theme-btn-primary text-white"
                            : "border-border group-hover:border-theme-btn-primary"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </div>

                      {option.color && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: option.color }}
                        />
                      )}

                      <span className="truncate">{option.label}</span>
                    </div>

                    {option.sublabel && (
                      <span className="text-[10px] text-muted ml-2 shrink-0">
                        {option.sublabel}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
