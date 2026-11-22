"use client";

/**
 * Record lifecycle standard (see docs/ui-standards/record-lifecycle.md).
 *
 * One form component renders a record in all three modes, so the user sees a
 * record the same way they created it:
 *   create → empty form, "Create" button
 *   view   → the SAME form, every control read-only, "Edit" button
 *   edit   → the SAME form, pre-filled, "Save changes" / "Cancel"
 *
 * Usage inside an existing create form:
 *   <RecordModeProvider mode={mode}>
 *     <RecordFieldset> ...the create form's fields, unchanged... </RecordFieldset>
 *     <EditOnly> ...things that only make sense while typing (templates, "add row")... </EditOnly>
 *     <RecordFormActions ... />
 *   </RecordModeProvider>
 *
 * <RecordFieldset> uses the native <fieldset disabled>, which makes every input,
 * select, textarea and button inside it read-only without touching each field.
 * The `.record-readonly` styles make disabled controls read as values, not as greyed-out inputs.
 */
import React from "react";
import Link from "next/link";
import { Pencil, Save, X, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecordMode = "create" | "view" | "edit";

interface RecordModeValue {
  mode: RecordMode;
  readOnly: boolean;
  isCreate: boolean;
  isEdit: boolean;
  isView: boolean;
}

const RecordModeContext = React.createContext<RecordModeValue>({
  mode: "create",
  readOnly: false,
  isCreate: true,
  isEdit: false,
  isView: false,
});

export function RecordModeProvider({ mode, children }: { mode: RecordMode; children: React.ReactNode }) {
  const value = React.useMemo<RecordModeValue>(
    () => ({ mode, readOnly: mode === "view", isCreate: mode === "create", isEdit: mode === "edit", isView: mode === "view" }),
    [mode]
  );
  return <RecordModeContext.Provider value={value}>{children}</RecordModeContext.Provider>;
}

export function useRecordMode() {
  return React.useContext(RecordModeContext);
}

/** Wraps form fields. In view mode every control inside becomes read-only. */
export function RecordFieldset({ children, className }: { children: React.ReactNode; className?: string }) {
  const { readOnly } = useRecordMode();
  return (
    <fieldset disabled={readOnly} data-record-mode={readOnly ? "view" : "edit"} className={cn("m-0 min-w-0 border-0 p-0", readOnly && "record-readonly", className)}>
      {children}
    </fieldset>
  );
}

/** Rendered only while creating or editing (e.g. template pickers, "Add line", "Remove"). */
export function EditOnly({ children }: { children: React.ReactNode }) {
  return useRecordMode().readOnly ? null : <>{children}</>;
}

/** Rendered only while creating (e.g. "start from a template"). */
export function CreateOnly({ children }: { children: React.ReactNode }) {
  return useRecordMode().isCreate ? <>{children}</> : null;
}

/** Rendered only in view mode. */
export function ViewOnly({ children }: { children: React.ReactNode }) {
  return useRecordMode().readOnly ? <>{children}</> : null;
}

/** Standard title per mode: "New meeting series" / "Weekly review" / "Edit · Weekly review". */
export function recordTitle(mode: RecordMode, entity: string, name?: string | null) {
  if (mode === "create") return `New ${entity}`;
  if (mode === "edit") return name ? `Edit · ${name}` : `Edit ${entity}`;
  return name || entity;
}

const btnBase =
  "inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60";
// Same tokens as AppButton primary / secondary.
const btnPrimary = cn(btnBase, "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover");
const btnSecondary = cn(btnBase, "bg-surface text-foreground border border-border-active shadow-sm hover:bg-surface-hover");

/**
 * The action bar for a record form. Same placement and wording in every module.
 *  - create: [Cancel] [Create <entity>]
 *  - view:   [Back to list] [Edit]
 *  - edit:   [Cancel] [Save changes]
 * Cancel / Back / Edit accept either an href (navigation) or a handler (in-place overlay).
 */
export function RecordFormActions({
  entity,
  submitting = false,
  canEdit = true,
  listHref,
  onCancel,
  cancelHref,
  editHref,
  onEdit,
  submitLabel,
  extra,
  sticky = true,
  className,
}: {
  entity: string;
  submitting?: boolean;
  canEdit?: boolean;
  listHref?: string;
  onCancel?: () => void;
  cancelHref?: string;
  editHref?: string;
  onEdit?: () => void;
  submitLabel?: string;
  /** Extra buttons shown on the left (e.g. "Archive", "Print"). */
  extra?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  const { mode } = useRecordMode();

  const secondary = (label: string, href?: string, onClick?: () => void, icon?: React.ReactNode) =>
    href ? (
      <Link href={href} className={btnSecondary}>{icon}{label}</Link>
    ) : onClick ? (
      <button type="button" className={btnSecondary} onClick={onClick}>{icon}{label}</button>
    ) : null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-border bg-elevated px-5 py-3",
        sticky && "sticky bottom-0 z-[1] rounded-b-[var(--radius-card,12px)]",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">{extra}</div>
      <div className="flex flex-wrap items-center gap-2">
        {mode === "view" ? (
          <>
            {secondary("Back to list", listHref, onCancel)}
            {canEdit && (editHref ? (
              <Link href={editHref} className={btnPrimary}><Pencil className="h-4 w-4" aria-hidden />Edit</Link>
            ) : onEdit ? (
              <button type="button" className={btnPrimary} onClick={onEdit}><Pencil className="h-4 w-4" aria-hidden />Edit</button>
            ) : null)}
          </>
        ) : (
          <>
            {secondary("Cancel", cancelHref, onCancel, <X className="h-4 w-4" aria-hidden />)}
            <button type="submit" className={btnPrimary} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : mode === "create" ? <Plus className="h-4 w-4" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              {submitLabel ?? (mode === "create" ? `Create ${entity}` : "Save changes")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Small mode badge for headers: "Viewing" / "Editing" / "New". */
export function RecordModeBadge() {
  const { mode } = useRecordMode();
  const label = mode === "create" ? "New" : mode === "edit" ? "Editing" : "Viewing";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] font-medium",
        mode === "view" ? "bg-sunken text-muted" : "bg-accent-soft text-accent-soft-text"
      )}
    >
      {label}
    </span>
  );
}
