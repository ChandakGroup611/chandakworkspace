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
    className={cn("border-b border-white/5 bg-[#4472C4] dark:bg-[#4472C4]/80 text-xs font-semibold text-white tracking-wider uppercase", className)}
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
      "transition-colors duration-150 text-gray-900 dark:text-gray-100",
      "even:bg-[#D9E1F2] dark:even:bg-[#1E293B] even:hover:bg-[#c9d5ec] dark:even:hover:bg-[#334155]",
      "odd:bg-[#B4C6E7] dark:odd:bg-[#334155] odd:hover:bg-[#a3b8e0] dark:odd:hover:bg-[#475569]",
      "data-[state=selected]:bg-blue-100 dark:data-[state=selected]:bg-blue-900/40",
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
    className={cn("h-8 px-2 text-left align-middle font-semibold text-white", className)}
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
    className={cn("p-2 align-middle text-gray-300", className)}
    {...props}
  />
));
AppTableCell.displayName = "AppTableCell";
