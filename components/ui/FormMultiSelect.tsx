"use client";

import React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import * as Popover from "@radix-ui/react-popover";

interface Option {
  value: string;
  label: string;
}

interface FormMultiSelectProps {
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

  const displayValue = selectedValues.length === 0 
    ? <span className="text-gray-400">{placeholder}</span>
    : selectedValues.length <= 2
      ? selectedValues.join(", ")
      : `${selectedValues.length} Selected`;

  return (
    <Popover.Root open={isOpen && !disabled} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 outline-none border border-border text-foreground focus:border-accent focus:ring-accent/20",
            disabled ? "bg-gray-50 dark:bg-slate-800 opacity-70 cursor-not-allowed" : "bg-surface hover:border-gray-300",
            className
          )}
        >
          <span className="truncate pr-4 text-left font-medium">{displayValue}</span>
          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-[100] theme-card-structural rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-[var(--radix-popover-trigger-width)] max-h-64 overflow-auto outline-none animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 p-1.5"
          onInteractOutside={() => setIsOpen(false)}
        >
          {options.length === 0 ? (
            <div className="p-3 text-center text-xs text-gray-500 italic">No options available</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                className="w-full flex items-center px-3 py-2 text-sm rounded-lg hover:bg-accent/10 hover:text-accent transition-colors text-left group"
                onClick={() => handleToggle(option.value)}
              >
                <div className={cn(
                  "w-4 h-4 mr-3 border rounded-[4px] flex items-center justify-center transition-colors",
                  selectedValues.includes(option.value) ? "bg-accent border-accent text-white" : "border-gray-300 group-hover:border-accent"
                )}>
                  {selectedValues.includes(option.value) && <Check className="w-3 h-3" />}
                </div>
                <span className="truncate font-medium">{option.label}</span>
              </button>
            ))
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
