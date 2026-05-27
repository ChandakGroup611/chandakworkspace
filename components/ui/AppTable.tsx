import React from "react";
import { cn } from "@/lib/utils";

export const AppTableContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("w-full overflow-x-auto rounded-xl border border-white/5 bg-white/[0.01]", className)}
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
    className={cn("w-full caption-bottom text-xs text-left border-collapse", className)}
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
    className={cn("border-b border-white/5 bg-white/[0.02] text-xs font-semibold text-gray-400 tracking-wider uppercase", className)}
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
    className={cn("divide-y divide-white/5 font-medium text-gray-200", className)}
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
      "hover:bg-white/[0.02] transition-colors data-[state=selected]:bg-white/[0.04]",
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
    className={cn("h-10 px-3 text-left align-middle font-semibold text-gray-400", className)}
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
    className={cn("p-3 align-middle text-gray-300", className)}
    {...props}
  />
));
AppTableCell.displayName = "AppTableCell";
