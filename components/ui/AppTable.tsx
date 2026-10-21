import React from "react";
import { cn } from "@/lib/utils";

export const AppTableContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "theme-table-structural w-full overflow-x-auto rounded-[var(--radius-card)] transition-colors",
      className
    )}
    {...props}
  />
));
AppTableContainer.displayName = "AppTableContainer";

export const AppTable = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn(
      "w-full min-w-max caption-bottom text-[length:var(--font-table)] text-left border-collapse",
      className
    )}
    {...props}
  />
));
AppTable.displayName = "AppTable";

export const AppTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "sticky top-0 z-[var(--z-sticky)] bg-sunken text-subtle text-[12px] font-semibold border-b border-border select-none",
      className
    )}
    {...props}
  />
));
AppTableHeader.displayName = "AppTableHeader";

export interface AppTableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  zebra?: boolean;
}

export const AppTableBody = React.forwardRef<
  HTMLTableSectionElement,
  AppTableBodyProps
>(({ className, zebra = false, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      "font-normal text-[length:var(--font-table)]",
      zebra && "[&>tr:nth-child(even)]:bg-sunken/40",
      className
    )}
    {...props}
  />
));
AppTableBody.displayName = "AppTableBody";

export const AppTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "theme-table-row transition-colors duration-150 text-foreground border-b border-border/70 last:border-b-0",
      "data-[state=selected]:bg-selected",
      className
    )}
    {...props}
  />
));
AppTableRow.displayName = "AppTableRow";

export interface AppTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export const AppTableHead = React.forwardRef<
  HTMLTableCellElement,
  AppTableHeadProps
>(({ className, numeric = false, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-[var(--row-h)] px-[var(--cell-px)] py-[var(--cell-py)] align-middle font-semibold text-[12px] text-subtle",
      numeric && "text-right tabular-nums",
      className
    )}
    {...props}
  />
));
AppTableHead.displayName = "AppTableHead";

export interface AppTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export const AppTableCell = React.forwardRef<
  HTMLTableCellElement,
  AppTableCellProps
>(({ className, numeric = false, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "h-[var(--row-h)] px-[var(--cell-px)] py-[var(--cell-py)] align-middle text-[length:var(--font-table)]",
      numeric && "text-right tabular-nums",
      className
    )}
    {...props}
  />
));
AppTableCell.displayName = "AppTableCell";

export const AppTableEmpty = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { colSpan?: number; message?: string }
>(({ className, colSpan = 1, message = "No records found", children, ...props }, ref) => (
  <tr ref={ref} className={cn("hover:bg-transparent", className)} {...props}>
    <td
      colSpan={colSpan}
      className="h-32 text-center text-muted text-sm font-medium align-middle"
    >
      {children || message}
    </td>
  </tr>
));
AppTableEmpty.displayName = "AppTableEmpty";
