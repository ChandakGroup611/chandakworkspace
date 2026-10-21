"use client";

/**
 * REFERENCE LAYOUT for /workspaces/tasks (and every list page: Tickets, Requirements,
 * Vehicles, Drawings …). It is presentation only: wire `tasks`, counts, filters and
 * handlers to the page's existing data hooks / server actions. Do not change queries.
 *
 * What this fixes on the current Workspace Tasks screen:
 *  1. Same number shown 3× (TOTAL 382, "382 total tasks", "Showing 382 tasks")  → once, in the tiles.
 *  2. "Assigned to Me" in BOTH the scope row and the view tabs                    → one scope control.
 *  3. Teal scope button, black New Task, green Import icon: 3 different "primary"s → one primary (New task).
 *  4. Headers cut to "PRIORI…", "CREAT…", "DUE DA…", "AS…"                         → sentence case + minWidth.
 *  5. Created "16-10-2026" vs Due "2026-10-31"                                    → "16 Oct 2026" everywhere; due shows overdue/soon.
 *  6. Department shown as an empty bordered box with "—" (looks like a broken input) → plain text or muted "—".
 *  7. Every priority a red ALL-CAPS outline                                       → PriorityIndicator (red only for Critical).
 *  8. Dashed status pills; yellow-on-white "Follow Up"; red "NEW"                 → StatusBadge tone mapping.
 *  9. Assignee names clipped by the Actions column                                → UserCell + minWidth + sticky end column with divider.
 * 10. Eye / pencil bare icons + red boxed delete                                  → RowActions (equal ghost buttons, inline confirm).
 * 11. Mixed column alignment (centred dates/priority/department)                 → left text, right numbers, consistent.
 */
import React from "react";
import Link from "next/link";
import { ArrowLeft, Building2, ChevronDown, Download, FileSpreadsheet, LayoutGrid, List, CalendarDays, ListTodo, Layers, Loader, CheckCircle2, Plus, Search, SlidersHorizontal, Bookmark, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppButton } from "@/components/ui/AppButton";
import { AppTableContainer, AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell, AppTableEmpty } from "@/components/ui/AppTable";
import { StatusBadge, PriorityIndicator, DateCell, DueDateCell, UserCell, RowActions, StatTile, StatTileRow, statusTone } from "@/components/ui/data";
import { CheckboxMark } from "@/components/ui/MultiSelectList";

export interface TaskRow {
  id: string | number;
  title: string;
  department?: string | null;
  priority?: string | null;
  createdAt?: string | null;
  dueDate?: string | null;
  status?: string | null;
  assignee?: { name: string; photo?: string | null } | null;
}

type Quick = "all" | "open" | "progress" | "done";
type Scope = "org" | "dept" | "mine";

export function WorkspaceTasksView({
  tasks,
  counts,
  departments,
  onNewTask,
  onView,
  onEdit,
  onDelete,
}: {
  tasks: TaskRow[];
  counts: { total: number; open: number; progress: number; done: number };
  departments: { id: string; name: string }[];
  onNewTask: () => void;
  onView: (t: TaskRow) => void;
  onEdit: (t: TaskRow) => void;
  onDelete: (t: TaskRow) => Promise<void>;
}) {
  const [quick, setQuick] = React.useState<Quick>("all");
  const [scope, setScope] = React.useState<Scope>("org");
  const [dept, setDept] = React.useState<string>("all");
  const [view, setView] = React.useState<"list" | "board" | "calendar">("list");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<TaskRow["id"]>>(new Set());

  const allChecked = tasks.length > 0 && tasks.every((t) => selected.has(t.id));
  const someChecked = !allChecked && tasks.some((t) => selected.has(t.id));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(tasks.map((t) => t.id)));
  const toggle = (id: TaskRow["id"]) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const seg = "h-8 rounded-md px-3 text-[13px] font-medium transition-colors";
  const segOn = "bg-surface text-foreground shadow-sm";
  const segOff = "text-muted hover:text-foreground";

  return (
    <div className="flex flex-col gap-4">
      {/* ---------- Header: back link, title, KPI tiles, single primary action ---------- */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <Link href="/workspaces" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-soft-text hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to hierarchy
          </Link>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.01em] text-heading">Workspace tasks</h1>
          <p className="text-[13.5px] text-muted">Tasks across every workspace you can see.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatTileRow>
            <StatTile label="Total" value={counts.total} icon={<ListTodo />} tone="neutral" selected={quick === "all"} onSelect={() => setQuick("all")} />
            <StatTile label="Open" value={counts.open} icon={<Layers />} tone="info" selected={quick === "open"} onSelect={() => setQuick("open")} />
            <StatTile label="In progress" value={counts.progress} icon={<Loader />} tone="accent" selected={quick === "progress"} onSelect={() => setQuick("progress")} />
            <StatTile label="Completed" value={counts.done} icon={<CheckCircle2 />} tone="success" selected={quick === "done"} onSelect={() => setQuick("done")} />
          </StatTileRow>
          <AppButton size="lg" leftIcon={<Plus className="h-4 w-4" />} onClick={onNewTask}>New task</AppButton>
        </div>
      </div>

      {/* ---------- One toolbar card: scope + view + search + actions ---------- */}
      <div className="theme-card-structural flex flex-col gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="theme-label mr-1">Scope</span>
          <div className="inline-flex gap-0.5 rounded-lg border border-border bg-sunken p-0.5" role="radiogroup" aria-label="Scope">
            <button type="button" role="radio" aria-checked={scope === "org"} onClick={() => setScope("org")} className={cn(seg, scope === "org" ? segOn : segOff)}>Entire organisation</button>
            <button type="button" role="radio" aria-checked={scope === "dept"} onClick={() => setScope("dept")} className={cn(seg, scope === "dept" ? segOn : segOff)}>My departments</button>
            <button type="button" role="radio" aria-checked={scope === "mine"} onClick={() => setScope("mine")} className={cn(seg, scope === "mine" ? segOn : segOff)}>Assigned to me</button>
          </div>
          {scope === "dept" && (
            <label className="relative inline-flex items-center">
              <span className="sr-only">Department</span>
              <Building2 className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted" aria-hidden />
              <select value={dept} onChange={(e) => setDept(e.target.value)} className="h-8 appearance-none pl-8 pr-8 text-[13px]">
                <option value="all">All my departments ({departments.length})</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-muted" aria-hidden />
            </label>
          )}
          <span className="ml-auto text-[12.5px] text-muted tabular">{tasks.length} of {counts.total} shown</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <div className="inline-flex gap-0.5 rounded-lg border border-border bg-sunken p-0.5" role="radiogroup" aria-label="View">
            {([["list", List, "List"], ["board", LayoutGrid, "Board"], ["calendar", CalendarDays, "Calendar"]] as const).map(([id, Icon, label]) => (
              <button key={id} type="button" role="radio" aria-checked={view === id} aria-label={`${label} view`} title={label} onClick={() => setView(id)} className={cn("inline-flex h-8 w-8 items-center justify-center rounded-md", view === id ? segOn : segOff)}>
                <Icon className="h-4 w-4" aria-hidden />
              </button>
            ))}
          </div>
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks by title, assignee or department" aria-label="Search tasks" className="h-9 w-full pl-9 pr-3 text-[13.5px]" />
          </div>
          <AppButton variant="secondary" leftIcon={<SlidersHorizontal className="h-4 w-4" />}>Filters</AppButton>
          <AppButton variant="ghost" leftIcon={<Bookmark className="h-4 w-4" />}>Saved</AppButton>
          <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
          <AppButton variant="ghost" leftIcon={<FileSpreadsheet className="h-4 w-4" />}>Import</AppButton>
          <AppButton variant="ghost" leftIcon={<Download className="h-4 w-4" />}>Export</AppButton>
          <AppButton variant="ghost" size="icon" aria-label="Choose columns" title="Columns"><Columns3 className="h-4 w-4" /></AppButton>
        </div>
      </div>

      {/* Bulk bar appears only when rows are selected */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-[10px] border border-primary/30 bg-accent-soft px-3 py-2 text-[13px] text-accent-soft-text">
          <span className="font-semibold tabular">{selected.size} selected</span>
          <AppButton size="sm" variant="secondary">Change status</AppButton>
          <AppButton size="sm" variant="secondary">Reassign</AppButton>
          <button type="button" className="ml-auto font-medium hover:underline" onClick={() => setSelected(new Set())}>Clear selection</button>
        </div>
      )}

      {/* ---------- Table ---------- */}
      <AppTableContainer maxHeight="calc(100dvh - 360px)">
        <AppTable>
          <AppTableHeader>
            <tr>
              <AppTableHead className="w-10 pr-0">
                <button type="button" role="checkbox" aria-checked={allChecked ? true : someChecked ? "mixed" : false} aria-label="Select all tasks" onClick={toggleAll}>
                  <CheckboxMark checked={allChecked} indeterminate={someChecked} />
                </button>
              </AppTableHead>
              <AppTableHead minWidth="260px">Title</AppTableHead>
              <AppTableHead minWidth="140px">Department</AppTableHead>
              <AppTableHead minWidth="110px">Priority</AppTableHead>
              <AppTableHead minWidth="120px">Created</AppTableHead>
              <AppTableHead minWidth="130px">Due</AppTableHead>
              <AppTableHead minWidth="150px">Status</AppTableHead>
              <AppTableHead minWidth="180px">Assignee</AppTableHead>
              <AppTableHead sticky="end" className="w-[112px] text-right">Actions</AppTableHead>
            </tr>
          </AppTableHeader>
          <AppTableBody>
            {tasks.length === 0 && <AppTableEmpty colSpan={9} title="No tasks match these filters" hint="Clear filters or switch scope to Entire organisation." />}
            {tasks.map((t) => {
              const done = statusTone(t.status) === "success";
              const isSel = selected.has(t.id);
              return (
                <AppTableRow key={t.id} data-state={isSel ? "selected" : undefined} className="cursor-pointer" onClick={() => onView(t)}>
                  <AppTableCell className="w-10 pr-0" onClick={(e) => e.stopPropagation()}>
                    <button type="button" role="checkbox" aria-checked={isSel} aria-label={`Select ${t.title}`} onClick={() => toggle(t.id)}>
                      <CheckboxMark checked={isSel} />
                    </button>
                  </AppTableCell>
                  <AppTableCell truncate="360px" className="font-medium">{t.title}</AppTableCell>
                  <AppTableCell truncate="200px">{t.department ? <span className="text-subtle">{t.department}</span> : <span className="text-muted">—</span>}</AppTableCell>
                  <AppTableCell><PriorityIndicator priority={t.priority} /></AppTableCell>
                  <AppTableCell><DateCell value={t.createdAt} /></AppTableCell>
                  <AppTableCell><DueDateCell value={t.dueDate} done={done} /></AppTableCell>
                  <AppTableCell><StatusBadge status={t.status} /></AppTableCell>
                  <AppTableCell><UserCell name={t.assignee?.name} photo={t.assignee?.photo} /></AppTableCell>
                  <AppTableCell sticky="end" className="w-[112px]">
                    <RowActions label={t.title} onView={() => onView(t)} onEdit={() => onEdit(t)} onDelete={() => onDelete(t)} />
                  </AppTableCell>
                </AppTableRow>
              );
            })}
          </AppTableBody>
        </AppTable>
      </AppTableContainer>
    </div>
  );
}
