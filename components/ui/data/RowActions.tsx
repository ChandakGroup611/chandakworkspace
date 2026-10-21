"use client";

import React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Eye, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Row actions with one consistent look. v1 mixed a bare teal eye icon, a bare orange
 * pencil and a red BOXED delete button in every row, which made Delete the loudest
 * thing on the page (and the easiest to mis-click).
 * Now: three equal 28px ghost icon buttons; Delete is only red on hover/focus and asks
 * for confirmation inline (no browser confirm()).
 */
export interface RowActionsProps {
  label: string; // the row's name, used in aria-labels: "Edit Compliance Tracker"
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  /** Extra menu items shown under "…" */
  more?: { label: string; onSelect: () => void; danger?: boolean }[];
  /** Hide delete for users without permission instead of disabling it. */
  canDelete?: boolean;
  canEdit?: boolean;
  /** Extra line in the delete confirmation, e.g. "It moves to Trash Data." */
  deleteHint?: string;
}

const btn =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

export function RowActions({ label, onView, onEdit, onDelete, more, canDelete = true, canEdit = true, deleteHint }: RowActionsProps) {
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const doDelete = async () => {
    if (!onDelete) return;
    setBusy(true);
    try { await onDelete(); } finally { setBusy(false); setConfirming(false); }
  };

  return (
    <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      {onView && (
        <button type="button" className={btn} onClick={onView} aria-label={`View ${label}`} title="View">
          <Eye className="h-4 w-4" aria-hidden />
        </button>
      )}
      {onEdit && canEdit && (
        <button type="button" className={btn} onClick={onEdit} aria-label={`Edit ${label}`} title="Edit">
          <Pencil className="h-4 w-4" aria-hidden />
        </button>
      )}
      {onDelete && canDelete && (
        <Popover.Root open={confirming} onOpenChange={setConfirming}>
          <Popover.Trigger asChild>
            <button type="button" className={cn(btn, "hover:bg-danger-soft hover:text-danger-text")} aria-label={`Delete ${label}`} title="Delete">
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={6}
              className="z-[var(--z-popover)] w-64 rounded-[10px] border border-border bg-elevated p-3 text-foreground shadow-lg outline-none"
            >
              <p className="text-[13px] font-medium">Delete “{label}”?</p>
              {deleteHint && <p className="mt-1 text-[12.5px] text-muted">{deleteHint}</p>}
              <div className="mt-3 flex justify-end gap-2">
                <Popover.Close asChild>
                  <button type="button" className="h-8 rounded-md px-3 text-[13px] text-subtle hover:bg-surface-hover">Cancel</button>
                </Popover.Close>
                <button
                  type="button"
                  disabled={busy}
                  onClick={doDelete}
                  className="h-8 rounded-md bg-danger-solid px-3 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-60"
                >
                  {busy ? "Deleting…" : "Delete"}
                </button>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
      {more && more.length > 0 && (
        <Popover.Root>
          <Popover.Trigger asChild>
            <button type="button" className={btn} aria-label={`More actions for ${label}`} title="More">
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="end" sideOffset={6} className="z-[var(--z-popover)] min-w-44 rounded-[10px] border border-border bg-elevated p-1 text-foreground shadow-lg outline-none">
              {more.map((m) => (
                <Popover.Close asChild key={m.label}>
                  <button
                    type="button"
                    onClick={m.onSelect}
                    className={cn("flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-hover", m.danger && "text-danger-text hover:bg-danger-soft")}
                  >
                    {m.label}
                  </button>
                </Popover.Close>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
}
