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
        <AppButton variant="outline" className={`h-8 px-3 rounded-xl border border-border/50 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ${activeSavedFilterId ? 'bg-primary/10 text-primary border-primary/30' : 'bg-elevated/50 text-foreground hover:bg-surface'}`}>
          <Bookmark className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Saved Filters</span>
          {activeSavedFilterId && <span className="w-2 h-2 rounded-full bg-primary ml-1"></span>}
        </AppButton>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align={align} sideOffset={8} className="z-50 w-64 p-2 rounded-2xl theme-card-structural  animate-in zoom-in-95 data-[state=closed]:zoom-out-95 outline-none space-y-2">
          <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-border/50 pb-2">
            <h4 className="text-xs font-bold text-foreground">My Saved Filters</h4>
            <AppButton variant="ghost" onClick={onSaveCurrent} className="h-6 px-2 text-[10px] bg-primary/10 text-primary hover:bg-primary/20 rounded-md">
              <BookmarkPlus className="h-3 w-3 mr-1" /> Save Current
            </AppButton>
          </div>
          
          {savedFilters.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted">
              No saved filters yet.<br/>Configure your view and click "Save Current".
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {savedFilters.map(f => (
                <div key={f.id} className={`group flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${activeSavedFilterId === f.id ? 'bg-primary/10 text-primary' : 'hover:bg-elevated/80 text-foreground'}`} onClick={() => onApplyFilter(f)}>
                  <span className="text-sm font-semibold truncate pr-2">{f.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AppButton variant="ghost" className="h-6 w-6 p-0 text-muted hover:text-danger rounded-md" onClick={(e) => onDeleteFilter(f.id, e)}>
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
