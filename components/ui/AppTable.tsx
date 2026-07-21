import React from "react";
import { cn } from "@/lib/utils";

export const AppTableContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("theme-table-structural w-full overflow-x-auto rounded-2xl transition-all duration-300", className)}
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
    className={cn("w-full min-w-max caption-bottom text-base text-left border-collapse", className)}
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
    className={cn("theme-table-header backdrop-blur text-[11px] font-extrabold text-muted tracking-wider uppercase", className)}
    {...props}
  />
));
AppTableHeader.displayName = "AppTableHeader";

export const AppTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("divide-y divide-border font-medium", className)}
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
        "theme-table-row transition-all duration-200 text-foreground group",
        "data-[state=selected]:bg-accent/10",
        className
      )}
    {...props}
  />
));
AppTableRow.displayName = "AppTableRow";

export const AppTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn("h-9 px-2 text-left align-middle font-bold whitespace-nowrap", className)}
    {...props}
  />
));
AppTableHead.displayName = "AppTableHead";

export const AppTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-2 py-1.5 align-middle whitespace-nowrap", className)}
    {...props}
  />
));
AppTableCell.displayName = "AppTableCell";

