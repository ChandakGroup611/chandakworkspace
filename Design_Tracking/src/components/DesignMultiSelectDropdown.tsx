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
          icon: "text-success-text",
          activeBg: "bg-success-soft border-success-border text-success-text",
          badge: "bg-success text-white",
          checkbox: "text-success-text",
          itemActive: "bg-success-soft text-success-text font-semibold"
        };
      case "purple":
        return {
          icon: "text-accent-soft-text",
          activeBg: "bg-surface border-border text-foreground dark:text-muted-foreground",
          badge: "bg-primary text-white",
          checkbox: "text-accent-soft-text",
          itemActive: "bg-surface dark:bg-surface text-accent-soft-text font-semibold"
        };
      case "amber":
        return {
          icon: "text-warning-text",
          activeBg: "bg-warning-soft border-warning-border text-warning-text",
          badge: "bg-warning text-white",
          checkbox: "text-warning-text",
          itemActive: "bg-warning-soft text-warning-text font-semibold"
        };
      case "teal":
        return {
          icon: "text-info-text",
          activeBg: "bg-info-soft border-border text-info-text",
          badge: "bg-info text-white",
          checkbox: "text-info-text",
          itemActive: "bg-info-soft text-info-text font-semibold"
        };
      case "rose":
        return {
          icon: "text-danger-text",
          activeBg: "bg-danger-soft border-danger-border text-danger-text",
          badge: "bg-danger-solid text-white",
          checkbox: "text-danger-text",
          itemActive: "bg-danger-soft text-danger-text font-semibold"
        };
      case "slate":
        return {
          icon: "text-subtle",
          activeBg: "bg-sunken border-border text-foreground",
          badge: "bg-foreground text-background",
          checkbox: "text-foreground",
          itemActive: "bg-sunken text-foreground font-semibold"
        };
      case "blue":
      default:
        return {
          icon: "text-info-text",
          activeBg: "bg-info-soft border-info-border text-info-text",
          badge: "bg-info text-white",
          checkbox: "text-info-text",
          itemActive: "bg-info-soft text-info-text font-semibold"
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
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-9 px-3 rounded-lg border text-xs font-semibold inline-flex items-center justify-between gap-2 transition-all cursor-pointer select-none max-w-[240px] sm:max-w-[280px] shadow-2xs ${
          isFiltered
            ? `${themeClasses.activeBg} font-semibold shadow-xs`
            : "border-border bg-surface hover:bg-sunken text-foreground"
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 truncate">
          {icon && <span className={`shrink-0 ${themeClasses.icon}`}>{icon}</span>}
          <span className="text-[11px] font-semibold text-muted-foreground shrink-0">{label}:</span>
          <span className="truncate font-medium" title={triggerText}>
            {triggerText}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {isFiltered && (
            <span
              onClick={handleClear}
              title="Clear selection"
              className="p-0.5 rounded-full hover:bg-sunken text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
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

      {/* Dropdown Popover Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-1.5 w-72 sm:w-80 rounded-lg border border-border bg-surface shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Menu Header */}
          <div className="p-3 border-b border-border bg-sunken space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                {icon && <span className={themeClasses.icon}>{icon}</span>}
                <span>Filter by {label}</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-sunken text-muted-foreground font-semibold">
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
                      className="text-xs text-danger-text hover:underline font-semibold cursor-pointer"
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
                  className="w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
                />
                {searchQuery && (
                  <button aria-label="Close"
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
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer select-none ${
                      isSelected
                        ? themeClasses.itemActive
                        : "hover:bg-sunken text-foreground"
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
                          <span className="text-[11px] text-muted-foreground block truncate">
                            {option.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side Badge / Count */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {option.badge && (
                        <span
                          className={`text-[11px] px-1.5 py-0.5 rounded-md font-semibold ${
                            option.badgeColor ||
                            (option.badge === "Onboard"
                              ? "bg-success-soft text-success-text border border-success-border"
                              : "bg-warning-soft text-warning-text border border-warning-border")
                          }`}
                        >
                          {option.badge}
                        </span>
                      )}
                      {typeof option.count === "number" && (
                        <span className="text-[11px] font-mono text-muted-foreground bg-sunken px-1.5 py-0.5 rounded-md">
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
          <div className="p-2 border-t border-border bg-sunken flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              {selectedValues.length === 0
                ? `Showing all ${options.length}`
                : `${selectedValues.length} of ${options.length} selected`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-lg bg-foreground text-background font-semibold hover:opacity-90 transition-opacity cursor-pointer text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
