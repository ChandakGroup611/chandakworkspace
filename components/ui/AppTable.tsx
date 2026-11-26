import React from "react";
import { cn } from "@/lib/utils";

/*
 * Changes from v1
 * - Sticky header (long registers keep their column names visible).
 * - Row height / padding follow density tokens (--row-h, --cell-px, --cell-py).
 * - Single row divider (v1 drew both `divide-y` and a theme border-bottom → double lines).
 * - Header is sentence-case 12px semibold on a sunken band instead of 11px EXTRABOLD CAPS.
 * - Rows no longer slide 2px right on hover.
 * - Optional zebra striping and numeric (right-aligned, tabular) cells.
 */
export const AppTableContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { maxHeight?: string }>(
  ({ className, maxHeight, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("theme-table-structural relative w-full overflow-auto", className)}
      style={{ maxHeight, ...style }}
      {...props}
    />
  )
);
AppTableContainer.displayName = "AppTableContainer";

export const AppTable = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement> & {
  zebra?: boolean;
  /** On phones (under 640 px) show each row as a card with "column: value" lines instead of a
   *  sideways-scrolling table. For lists, not matrices. Cell labels come from the header row
   *  (components/ui/TableCardLabels.tsx, mounted once in the app shell). */
  cardsOnPhone?: boolean;
}>(
  ({ className, zebra = false, cardsOnPhone = false, ...props }, ref) => (
    <table
      ref={ref}
      data-zebra={zebra || undefined}
      data-cards={cardsOnPhone || undefined}
      className={cn(
        "w-full caption-bottom border-separate border-spacing-0 text-left text-[length:var(--font-table,13.5px)]",
        "[&[data-zebra]_tbody_tr:nth-child(even)]:bg-sunken/60",
        className
      )}
      {...props}
    />
  )
);
AppTable.displayName = "AppTable";

export const AppTableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("theme-table-header sticky top-0 z-[var(--z-sticky)]", className)} {...props} />
));
AppTableHeader.displayName = "AppTableHeader";

export const AppTableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child_td]:border-b-0", className)} {...props} />
));
AppTableBody.displayName = "AppTableBody";

export const AppTableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn("theme-table-row group text-foreground", className)} {...props} />
));
AppTableRow.displayName = "AppTableRow";

type StickySide = "start" | "end";
const stickyCls = (side: StickySide | undefined, header: boolean) =>
  side === "end"
    ? cn("sticky right-0 shadow-[inset_1px_0_0_var(--border-subtle)]", header ? "z-[calc(var(--z-sticky)+1)] bg-sunken" : "z-[1] bg-surface group-hover:bg-surface-hover group-data-[state=selected]:bg-selected")
    : side === "start"
      ? cn("sticky left-0 shadow-[inset_-1px_0_0_var(--border-subtle)]", header ? "z-[calc(var(--z-sticky)+1)] bg-sunken" : "z-[1] bg-surface group-hover:bg-surface-hover group-data-[state=selected]:bg-selected")
      : "";

export interface AppTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  /** Pin the column while the table scrolls sideways (actions → "end", checkbox/title → "start"). */
  sticky?: StickySide;
  /** Minimum column width, e.g. "160px". Prevents "PRIORI…" / "DUE DA…" header truncation. */
  minWidth?: string;
}

export const AppTableHead = React.forwardRef<HTMLTableCellElement, AppTableHeadProps>(
  ({ className, numeric, sticky, minWidth, style, ...props }, ref) => (
    <th
      ref={ref}
      scope="col"
      style={{ minWidth, ...style }}
      className={cn(
        "h-[var(--row-h,44px)] bg-sunken px-[var(--cell-px,16px)] align-middle text-[12px] font-semibold text-subtle whitespace-nowrap border-b border-border",
        numeric ? "text-right" : "text-left",
        stickyCls(sticky, true),
        className
      )}
      {...props}
    />
  )
);
AppTableHead.displayName = "AppTableHead";

export interface AppTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
  sticky?: StickySide;
  /** Cap the width and ellipsize long text; full text shows on hover via `title`. */
  truncate?: string;
}

export const AppTableCell = React.forwardRef<HTMLTableCellElement, AppTableCellProps>(
  ({ className, numeric, sticky, truncate, style, children, title, ...props }, ref) => (
    <td
      ref={ref}
      style={truncate ? { maxWidth: truncate, ...style } : style}
      title={title ?? (truncate && typeof children === "string" ? children : undefined)}
      className={cn(
        "h-[var(--row-h,44px)] px-[var(--cell-px,16px)] py-[var(--cell-py,10px)] align-middle border-b border-border",
        numeric && "text-right tabular",
        truncate && "truncate",
        stickyCls(sticky, false),
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
);
AppTableCell.displayName = "AppTableCell";

/** Friendly empty state for tables / lists. Backward compatible with both message and title/hint props. */
export function AppTableEmpty({
  colSpan = 1,
  title,
  message = "No records yet",
  hint,
  children,
  className,
}: {
  colSpan?: number;
  title?: string;
  message?: string;
  hint?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const displayTitle = title || message;
  return (
    <tr className={className}>
      <td colSpan={colSpan} className="px-4 py-12 text-center align-middle">
        {children ? (
          <div className="text-[13.5px] font-medium text-foreground">{children}</div>
        ) : (
          <>
            <div className="text-[13.5px] font-medium text-foreground">{displayTitle}</div>
            {hint && <div className="mt-1 text-[12.5px] text-muted">{hint}</div>}
          </>
        )}
      </td>
    </tr>
  );
}
