"use client";

import React from "react";
import { Check, ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import * as Popover from "@radix-ui/react-popover";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  iconOnly?: boolean;
}

export function MultiSelectFilter({ options, selectedValues, onChange, placeholder = "Select...", iconOnly = false }: MultiSelectFilterProps) {
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

  const displayValue = selectedValues.length === 0 
    ? placeholder 
    : selectedValues.length === options.length 
      ? `All ${placeholder}` 
      : `${selectedValues.length} Selected`;

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            iconOnly 
              ? "flex items-center justify-center p-1 rounded-sm hover:opacity-90/10 text-muted hover:text-theme-icon data-[active=true]:text-theme-icon data-[active=true]:bg-theme-btn-primary/10 transition-colors" 
              : "tb-btn flex items-center justify-between gap-2 px-3 py-1.5 min-w-[140px] text-sm bg-surface hover:bg-elevated border border-border rounded-md transition-colors"
          )}
          data-active={selectedValues.length > 0}
        >
          {!iconOnly && <span className="truncate max-w-[120px]">{displayValue}</span>}
          {iconOnly ? (
            <Filter className={cn("w-3.5 h-3.5", selectedValues.length > 0 ? "fill-current" : "")} />
          ) : (
            <ChevronDown className="w-4 h-4 opacity-50" />
          )}
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content
          align={iconOnly ? "end" : "start"}
          sideOffset={4}
          className={cn(
            "z-[100] bg-surface border border-border rounded-md  outline-none animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95",
            iconOnly ? "w-48" : "w-56"
          )}
          onInteractOutside={() => setIsOpen(false)}
        >
          <div className="max-h-60 overflow-y-auto scrollbar-thin p-1">
            {options.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted italic">No options available</div>
            ) : (
              <>
                <button
                  className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-elevated transition-colors text-left"
                  onClick={handleSelectAll}
                >
                  <div className="w-4 h-4 mr-2 border rounded-sm flex items-center justify-center border-border">
                    {selectedValues.length === options.length && <Check className="w-3 h-3" />}
                  </div>
                  <span className="font-medium">Select All</span>
                </button>
                <div className="h-px bg-border my-1" />
                {options.map((option) => (
                  <button
                    key={option.value}
                    className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-elevated transition-colors text-left"
                    onClick={() => handleToggle(option.value)}
                  >
                    <div className="w-4 h-4 mr-2 border rounded-sm flex items-center justify-center border-border">
                      {selectedValues.includes(option.value) && <Check className="w-3 h-3" />}
                    </div>
                    <span className="truncate">{option.label}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
