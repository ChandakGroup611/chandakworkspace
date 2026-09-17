"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Search, X, CheckSquare, Square, Filter } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
  count?: number;
  badge?: string;
  badgeColor?: string;
  colorDot?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export interface DesignMultiSelectDropdownProps {
  label: string;
  icon?: React.ReactNode;
  options: DropdownOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
  colorTheme?: "blue" | "emerald" | "purple" | "amber" | "rose" | "teal" | "slate";
  className?: string;
  align?: "left" | "right";
}

export const DesignMultiSelectDropdown: React.FC<DesignMultiSelectDropdownProps> = ({
  label,
  icon,
  options,
  selectedValues,
  onChange,
  placeholder,
  searchPlaceholder,
  showSearch = true,
  colorTheme = "blue",
  className = "",
  align = "left"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  // Toggle single option
  const handleToggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  // Select all visible / all options
  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(o => o.value));
    }
  };

  // Clear selection
  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  // Compute theme styles
  const themeClasses = useMemo(() => {
    switch (colorTheme) {
      case "emerald":
        return {
          icon: "text-emerald-500",
          activeBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
          badge: "bg-emerald-600 text-white",
          checkbox: "text-emerald-600",
          itemActive: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 font-semibold"
        };
      case "purple":
        return {
          icon: "text-purple-500",
          activeBg: "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300",
          badge: "bg-purple-600 text-white",
          checkbox: "text-purple-600",
          itemActive: "bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-100 font-semibold"
        };
      case "amber":
        return {
          icon: "text-amber-500",
          activeBg: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
          badge: "bg-amber-600 text-white",
          checkbox: "text-amber-600",
          itemActive: "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 font-semibold"
        };
      case "teal":
        return {
          icon: "text-teal-500",
          activeBg: "bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-300",
          badge: "bg-teal-600 text-white",
          checkbox: "text-teal-600",
          itemActive: "bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-100 font-semibold"
        };
      case "rose":
        return {
          icon: "text-rose-500",
          activeBg: "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300",
          badge: "bg-rose-600 text-white",
          checkbox: "text-rose-600",
          itemActive: "bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 font-semibold"
        };
      case "slate":
        return {
          icon: "text-slate-600 dark:text-slate-300",
          activeBg: "bg-slate-500/10 border-slate-500/30 text-slate-800 dark:text-slate-200",
          badge: "bg-slate-700 text-white",
          checkbox: "text-slate-700 dark:text-slate-300",
          itemActive: "bg-slate-100 dark:bg-slate-800 text-foreground font-semibold"
        };
      case "blue":
      default:
        return {
          icon: "text-blue-500",
          activeBg: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300",
          badge: "bg-blue-600 text-white",
          checkbox: "text-blue-600",
          itemActive: "bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 font-semibold"
        };
    }
  }, [colorTheme]);

  // Trigger button display text
  const triggerText = useMemo(() => {
    if (selectedValues.length === 0) {
      return placeholder || `All ${label} (${options.length})`;
    }
    if (selectedValues.length === 1) {
      const match = options.find(o => o.value === selectedValues[0]);
      return match ? match.label : `${selectedValues.length} ${label}`;
    }
    if (selectedValues.length === 2) {
      const matches = options.filter(o => selectedValues.includes(o.value));
      if (matches.length === 2) {
        return `${matches[0].label}, ${matches[1].label}`;
      }
    }
    return `${selectedValues.length} ${label} Selected`;
  }, [selectedValues, options, label, placeholder]);

  const isFiltered = selectedValues.length > 0;
  const isAllSelected = selectedValues.length === options.length && options.length > 0;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* 🔘 Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 px-3 rounded-xl border text-xs font-semibold inline-flex items-center justify-between gap-2 transition-all cursor-pointer select-none max-w-[240px] sm:max-w-[280px] shadow-2xs ${
          isFiltered
            ? `${themeClasses.activeBg} font-bold shadow-xs`
            : "border-border bg-surface hover:bg-slate-50 dark:hover:bg-slate-800/80 text-foreground"
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 truncate">
          {icon && <span className={`shrink-0 ${themeClasses.icon}`}>{icon}</span>}
          <span className="text-[11px] font-bold text-muted-foreground shrink-0">{label}:</span>
          <span className="truncate font-medium" title={triggerText}>
            {triggerText}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {isFiltered && (
            <span
              onClick={handleClear}
              title="Clear selection"
              className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* 📋 Dropdown Popover Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-1.5 w-72 sm:w-80 rounded-2xl border border-border bg-surface shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Menu Header */}
          <div className="p-3 border-b border-border bg-slate-50/60 dark:bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                {icon && <span className={themeClasses.icon}>{icon}</span>}
                <span>Filter by {label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-muted-foreground font-semibold">
                  {selectedValues.length}/{options.length}
                </span>
              </span>

              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                >
                  {isAllSelected ? "Deselect All" : "Select All"}
                </button>
                {selectedValues.length > 0 && !isAllSelected && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <button
                      type="button"
                      onClick={() => onChange([])}
                      className="text-xs text-rose-500 hover:underline font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Search Input within Dropdown */}
            {showSearch && options.length >= 4 && (
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  aria-label={`Search ${label.toLowerCase()}`}
                  className="w-full pl-8 pr-7 py-1 text-xs rounded-xl border border-border bg-white dark:bg-slate-950 text-foreground focus:outline-none focus:border-primary"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground italic">
                No matching {label.toLowerCase()} found.
              </div>
            ) : (
              filteredOptions.map(option => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleToggleOption(option.value)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer select-none ${
                      isSelected
                        ? themeClasses.itemActive
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="shrink-0 flex items-center justify-center">
                        {isSelected ? (
                          <CheckSquare className={`h-4 w-4 ${themeClasses.checkbox}`} />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground/60" />
                        )}
                      </div>

                      {option.colorDot && (
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: option.colorDot }}
                        />
                      )}

                      {option.icon && <span className="shrink-0">{option.icon}</span>}

                      <div className="truncate">
                        <span className="font-medium text-xs truncate block">
                          {option.label}
                        </span>
                        {option.subtitle && (
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {option.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side Badge / Count */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {option.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                            option.badgeColor ||
                            (option.badge === "Onboard"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20")
                          }`}
                        >
                          {option.badge}
                        </span>
                      )}
                      {typeof option.count === "number" && (
                        <span className="text-[10px] font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                          {option.count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Menu Footer */}
          <div className="p-2 border-t border-border bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {selectedValues.length === 0
                ? `Showing all ${options.length}`
                : `${selectedValues.length} of ${options.length} selected`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-lg bg-foreground text-background font-bold hover:opacity-90 transition-opacity cursor-pointer text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
