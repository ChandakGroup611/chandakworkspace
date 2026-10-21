"use client";

import React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Bookmark, BookmarkPlus, Trash2 } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { SavedFilter } from "@/hooks/useSavedFilters";

interface SavedFiltersDropdownProps<T> {
  savedFilters: SavedFilter<T>[];
  activeSavedFilterId: string | null;
  onSaveCurrent: () => void;
  onApplyFilter: (filter: SavedFilter<T>) => void;
  onDeleteFilter: (id: string, e: React.MouseEvent) => void;
  align?: "start" | "center" | "end";
}

export function SavedFiltersDropdown<T>({
  savedFilters,
  activeSavedFilterId,
  onSaveCurrent,
  onApplyFilter,
  onDeleteFilter,
  align = "start"
}: SavedFiltersDropdownProps<T>) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <AppButton
          variant="outline"
          className={`h-8 px-3 rounded-lg border border-border text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 ${
            activeSavedFilterId ? 'bg-accent-soft text-accent-soft-text border-primary/30' : 'bg-surface text-foreground hover:bg-hover'
          }`}
        >
          <Bookmark className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Saved Filters</span>
          {activeSavedFilterId && <span className="w-2 h-2 rounded-full bg-primary ml-1" />}
        </AppButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={8}
          className="z-[var(--z-popover)] w-64 p-2 rounded-xl bg-elevated border border-border shadow-md outline-none space-y-2"
        >
          <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-border pb-2">
            <h4 className="text-xs font-semibold text-foreground">Saved Filters</h4>
            <AppButton
              variant="ghost"
              onClick={onSaveCurrent}
              className="h-6 px-2 text-[11px] bg-accent-soft text-primary hover:bg-primary/20 rounded-md"
            >
              <BookmarkPlus className="h-3 w-3 mr-1" /> Save current
            </AppButton>
          </div>
          
          {savedFilters.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted">
              No saved filters yet.<br />Configure filters and click &ldquo;Save current&rdquo;.
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {savedFilters.map(f => (
                <div
                  key={f.id}
                  className={`group flex items-center justify-between p-1 rounded-lg transition-colors ${
                    activeSavedFilterId === f.id ? 'bg-accent-soft text-accent-soft-text' : 'hover:bg-hover text-foreground'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onApplyFilter(f)}
                    className="flex-1 text-left px-1.5 py-1 text-xs font-medium truncate cursor-pointer bg-transparent border-0 text-inherit focus-visible:outline-none focus-visible:underline"
                  >
                    {f.name}
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                    <AppButton
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete filter ${f.name}`}
                      className="h-6 w-6 p-0 text-muted hover:text-danger rounded-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFilter(f.id, e);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </AppButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
export default SavedFiltersDropdown;
