"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppInput } from "@/components/ui/AppInput";
import { AppTable, AppTableHeader, AppTableRow, AppTableHead, AppTableBody, AppTableCell } from "@/components/ui/AppTable";
import { MyWorkItem } from "@/lib/actions/my-work";
import { 
  CheckSquare, 
  Search, 
  FolderKanban, 
  LifeBuoy, 
  FileText, 
  Car, 
  Calendar, 
  ArrowUpRight,
  Filter
} from "lucide-react";

interface MyWorkClientProps {
  initialItems: MyWorkItem[];
}

const MODULE_ICONS: Record<string, any> = {
  TASK_WORKFLOW: FolderKanban,
  TICKETS: LifeBuoy,
  REQUIREMENTS: FileText,
  VEHICLE_DESK: Car,
};

export default function MyWorkClient({ initialItems }: MyWorkClientProps) {
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      const matchMod = selectedModule === "ALL" || item.module === selectedModule;
      const matchSearch =
        searchQuery === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.status.toLowerCase().includes(searchQuery.toLowerCase());
      return matchMod && matchSearch;
    });
  }, [initialItems, selectedModule, searchQuery]);

  const moduleCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: initialItems.length };
    for (const it of initialItems) {
      counts[it.module] = (counts[it.module] || 0) + 1;
    }
    return counts;
  }, [initialItems]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-theme-btn-primary" />
            My Work
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified view of tasks, tickets, requirements, and trips assigned to you across all modules.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <AppInput
            placeholder="Search my work..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-muted-foreground" />}
          />
        </div>
      </div>

      {/* Module Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
        {["ALL", "TASK_WORKFLOW", "TICKETS", "REQUIREMENTS", "VEHICLE_DESK"].map((mod) => {
          const count = moduleCounts[mod] || 0;
          const label =
            mod === "ALL"
              ? "All Items"
              : mod === "TASK_WORKFLOW"
              ? "Tasks"
              : mod === "TICKETS"
              ? "Tickets"
              : mod === "REQUIREMENTS"
              ? "Requirements"
              : "Vehicle Desk";

          return (
            <button
              key={mod}
              type="button"
              onClick={() => setSelectedModule(mod)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedModule === mod
                  ? "bg-foreground text-background font-semibold shadow-sm"
                  : "bg-surface border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                selectedModule === mod ? "bg-background text-foreground" : "bg-sunken text-muted-foreground"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Items Table */}
      <AppCard className="overflow-hidden p-0">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground space-y-2">
            <CheckSquare className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="font-medium text-foreground">No pending work items</p>
            <p className="text-xs">You are completely up to date across all assigned modules.</p>
          </div>
        ) : (
          <AppTable cardsOnPhone>
            <AppTableHeader>
              <AppTableRow>
                <AppTableHead className="w-36">Module</AppTableHead>
                <AppTableHead className="w-32">Identifier</AppTableHead>
                <AppTableHead>Title</AppTableHead>
                <AppTableHead className="w-28">Priority</AppTableHead>
                <AppTableHead className="w-32">Status</AppTableHead>
                <AppTableHead className="w-32">Due Date</AppTableHead>
                <AppTableHead className="w-16 text-right">Action</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {filteredItems.map((item) => {
                const Icon = MODULE_ICONS[item.module] || FolderKanban;
                const priorityVariant =
                  item.priority?.toUpperCase() === "HIGH" || item.priority?.toUpperCase() === "URGENT"
                    ? "danger"
                    : item.priority?.toUpperCase() === "MEDIUM"
                    ? "warning"
                    : "neutral";

                return (
                  <AppTableRow key={`${item.module}:${item.id}`}>
                    <AppTableCell>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Icon className="h-4 w-4 text-theme-btn-primary shrink-0" />
                        <span>{item.moduleName}</span>
                      </div>
                    </AppTableCell>
                    <AppTableCell>
                      <code className="text-xs bg-sunken px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                        {item.code || item.id.substring(0, 8)}
                      </code>
                    </AppTableCell>
                    <AppTableCell>
                      <Link
                        href={item.href}
                        className="font-medium text-sm text-foreground hover:text-theme-btn-primary hover:underline line-clamp-1"
                      >
                        {item.title}
                      </Link>
                    </AppTableCell>
                    <AppTableCell>
                      {item.priority ? (
                        <AppBadge variant={priorityVariant} className="text-[11px]">
                          {item.priority}
                        </AppBadge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </AppTableCell>
                    <AppTableCell>
                      <AppBadge variant="neutral" className="text-[11px]">
                        {item.status}
                      </AppBadge>
                    </AppTableCell>
                    <AppTableCell className="text-xs text-muted-foreground">
                      {item.dueDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{item.dueDate.split("T")[0]}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </AppTableCell>
                    <AppTableCell className="text-right">
                      <Link
                        href={item.href}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                        title="Open item"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </AppTableCell>
                  </AppTableRow>
                );
              })}
            </AppTableBody>
          </AppTable>
        )}
      </AppCard>
    </div>
  );
}
