import React from "react";
import { cn } from "@/lib/utils";

export const AppTableContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0B0D17]", className)}
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
    className={cn("w-full caption-bottom text-sm text-left border-collapse", className)}
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
    className={cn("border-b-2 border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800 text-[12px] font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase shadow-sm", className)}
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
    className={cn("divide-y divide-slate-200/60 dark:divide-white/5 font-medium", className)}
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
      "transition-colors duration-150 text-slate-800 dark:text-slate-200",
      "[tbody_&]:even:bg-white dark:[tbody_&]:even:bg-[#0B0D17] [tbody_&]:even:hover:bg-blue-50/60 dark:[tbody_&]:even:hover:bg-blue-900/20",
      "[tbody_&]:odd:bg-slate-50 dark:[tbody_&]:odd:bg-[#121620] [tbody_&]:odd:hover:bg-blue-50/60 dark:[tbody_&]:odd:hover:bg-blue-900/20",
      "data-[state=selected]:bg-blue-100 dark:data-[state=selected]:bg-blue-900/30",
      "[thead_&]:bg-transparent [thead_&]:hover:bg-transparent", // Ensure header row doesn't have zebra background
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
    className={cn("h-10 px-3 text-left align-middle font-bold", className)}
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
    className={cn("p-3 align-middle", className)}
    {...props}
  />
));
AppTableCell.displayName = "AppTableCell";

