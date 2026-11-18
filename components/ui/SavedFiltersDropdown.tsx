"use client";

import React, { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Bookmark, BookmarkPlus, Trash2, Edit2, Check, X } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { SavedFilter } from "@/hooks/useSavedFilters";

interface SavedFiltersDropdownProps<T> {
  savedFilters: SavedFilter<T>[];
  activeSavedFilterId: string | null;
  onSaveCurrent: () => void;
  onApplyFilter: (filter: SavedFilter<T>) => void;
  onDeleteFilter: (id: string, e: React.MouseEvent) => void;
  onUpdateFilter?: (id: string, updates: { name?: string; payload?: T }) => void;
  currentPayload?: T;
  align?: "start" | "center" | "end";
}

export function SavedFiltersDropdown<T>({
  savedFilters,
  activeSavedFilterId,
  onSaveCurrent,
  onApplyFilter,
  onDeleteFilter,
  onUpdateFilter,
  currentPayload,
  align = "start"
}: SavedFiltersDropdownProps<T>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [updateWithCurrent, setUpdateWithCurrent] = useState(false);

  const startEdit = (f: SavedFilter<T>, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(f.id);
    setEditName(f.name);
    setUpdateWithCurrent(false);
  };

  const handleSaveEdit = (f: SavedFilter<T>, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    if (onUpdateFilter) {
      onUpdateFilter(f.id, {
        name: editName.trim(),
        ...(updateWithCurrent && currentPayload !== undefined ? { payload: currentPayload } : {})
      });
    }
    setEditingId(null);
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(null);
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <AppButton
          variant="secondary"
          aria-label="Saved filters"
          title="Saved filters"
          className={activeSavedFilterId ? "shrink-0 border-border-active bg-accent-soft text-accent-soft-text" : "shrink-0"}
          leftIcon={<Bookmark className="h-4 w-4" />}
        >
          <span className="hidden sm:inline">Saved</span>
          {activeSavedFilterId && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="A saved filter is applied" />}
        </AppButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={8}
          className="z-[var(--z-popover)] w-72 p-2 rounded-xl bg-elevated border border-border shadow-md outline-none space-y-2"
        >
          <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-border pb-2">
            <h4 className="text-[13px] font-semibold text-heading">Saved filters</h4>
            <AppButton
              variant="ghost"
              onClick={onSaveCurrent}
              className="h-7 rounded-md bg-accent-soft px-2 text-[12px] text-accent-soft-text hover:bg-accent-soft"
            >
              <BookmarkPlus className="h-3 w-3 mr-1" /> Save current
            </AppButton>
          </div>

          {savedFilters.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted">
              No saved filters yet.<br />Set your filters, then choose &ldquo;Save current&rdquo;.
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              {savedFilters.map(f => {
                const isEditing = editingId === f.id;

                if (isEditing) {
                  return (
                    <div key={f.id} className="p-2 rounded-lg bg-surface border border-border space-y-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveEdit(f);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              handleCancelEdit();
                            }
                          }}
                          autoFocus
                          className="flex-1 h-7 rounded border border-border bg-sunken px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Filter name"
                        />
                        <AppButton
                          variant="primary"
                          size="icon"
                          type="button"
                          aria-label="Save filter changes"
                          className="h-7 w-7 p-0 shrink-0 shadow-2xs"
                          onClick={(e) => handleSaveEdit(f, e)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </AppButton>
                        <AppButton
                          variant="ghost"
                          size="icon"
                          type="button"
                          aria-label="Cancel editing"
                          className="h-7 w-7 p-0 shrink-0 text-muted hover:text-foreground"
                          onClick={(e) => handleCancelEdit(e)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </AppButton>
                      </div>
                      {currentPayload !== undefined && (
                        <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={updateWithCurrent}
                            onChange={(e) => setUpdateWithCurrent(e.target.checked)}
                            className="h-3 w-3 rounded border-border text-primary"
                          />
                          <span>Update with current filter settings</span>
                        </label>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={f.id}
                    className={`group flex items-center justify-between p-1 rounded-lg transition-colors ${activeSavedFilterId === f.id ? "bg-accent-soft text-accent-soft-text" : "hover:bg-surface-hover text-foreground"
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => onApplyFilter(f)}
                      className="flex-1 text-left px-1.5 py-1 text-xs font-medium truncate cursor-pointer bg-transparent border-0 text-inherit focus-visible:outline-none focus-visible:underline"
                    >
                      {f.name}
                    </button>
                    <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity pr-1">
                      {onUpdateFilter && (
                        <AppButton
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit filter ${f.name}`}
                          className="h-6 w-6 p-0 text-muted hover:text-foreground rounded-md"
                          onClick={(e) => startEdit(f, e)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </AppButton>
                      )}
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
                );
              })}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default SavedFiltersDropdown;
