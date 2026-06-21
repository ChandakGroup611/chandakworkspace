"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function MultiSelectFilter({ options, selectedValues, onChange, placeholder = "Select..." }: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const displayValue = selectedValues.length === 0 
    ? placeholder 
    : selectedValues.length === options.length 
      ? `All ${placeholder}` 
      : `${selectedValues.length} Selected`;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        className="tb-btn flex items-center justify-between gap-2 px-3 py-1.5 min-w-[140px] text-sm bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-md transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate max-w-[120px]">{displayValue}</span>
        <ChevronDown className="w-4 h-4 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-56 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-1">
            <button
              className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-[var(--surface-hover)] transition-colors text-left"
              onClick={handleSelectAll}
            >
              <div className="w-4 h-4 mr-2 border rounded-sm flex items-center justify-center border-[var(--border)]">
                {selectedValues.length === options.length && <Check className="w-3 h-3" />}
              </div>
              <span className="font-medium">Select All</span>
            </button>
            <div className="h-px bg-[var(--border)] my-1" />
            {options.map((option) => (
              <button
                key={option.value}
                className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-[var(--surface-hover)] transition-colors text-left"
                onClick={() => handleToggle(option.value)}
              >
                <div className="w-4 h-4 mr-2 border rounded-sm flex items-center justify-center border-[var(--border)]">
                  {selectedValues.includes(option.value) && <Check className="w-3 h-3" />}
                </div>
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
