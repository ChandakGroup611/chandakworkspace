import React from "react";
import Link from "next/link";
import { Search, ClipboardList } from "lucide-react";
import { getTasks } from "@/lib/actions/meet/tasks";
import { getMeetingMasters } from "@/lib/actions/meet/masters";
import { getPointsTable, type PointsView, type PointRow } from "@/lib/actions/meet/points-view";
import MyWorkClient from "./MyWorkClient";
import { btnSecondary } from "@/components/meet/session-ui";
import { pointStatus, PriorityText, DueHint, shortDate } from "@/components/meet/point-ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Points & tasks · Chandak Meet",
  description: "Every point and action item from your meetings, in one table",
};

const VIEWS: { id: PointsView; label: string }[] = [
  { id: "mine", label: "My open points" },
  { id: "meetings", label: "All open in my meetings" },
  { id: "overdue", label: "Overdue" },
  { id: "carried", label: "Carried 3+ times" },
  { id: "closed", label: "Closed" },
];

export default async function PointsAndTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; view?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "tasks" ? "tasks" : "points";
  const view: PointsView = (VIEWS.some((v) => v.id === sp.view) ? sp.view : "mine") as PointsView;
  const search = sp.search?.trim() || "";

  const tabLink = (t: string) => `/meet/my-work?tab=${t}`;

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.01em] text-heading">Points &amp; tasks</h1>
          <p className="mt-0.5 text-[13.5px] text-muted">Every point and action item from your meetings. Open points carry forward until they're closed.</p>
        </div>
      </div>

      <nav aria-label="Points or action items" className="flex border-b border-border">
        {[
          { id: "points", label: "Points" },
          { id: "tasks", label: "Action items" },
        ].map((t) => (
          <Link
            key={t.id}
            href={tabLink(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={`-mb-px mr-6 inline-flex h-11 items-center border-b-2 text-[14.5px] ${
              tab === t.id ? "border-primary font-semibold text-heading" : "border-transparent font-medium text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "tasks" ? <TasksTab /> : <PointsTab view={view} search={search} />}
    </div>
  );
}

async function TasksTab() {
  const [tasks, masters] = await Promise.all([getTasks({ statusTab: "all" }), getMeetingMasters()]);
  return <MyWorkClient initialTasks={tasks} users={masters.users} />;
}

async function PointsTab({ view, search }: { view: PointsView; search: string }) {
  const { rows, error } = await getPointsTable(view, search);

  // Group like Zoho task lists: one group per meeting
  const groups = new Map<string, { title: string; code: string | null; meetingId: string; rows: PointRow[] }>();
  for (const r of rows) {
    const g = groups.get(r.meeting_id) || { title: r.meeting_title, code: r.meeting_code, meetingId: r.meeting_id, rows: [] };
    g.rows.push(r);
    groups.set(r.meeting_id, g);
  }

  return (
    <div className="space-y-3">
      <form className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="tab" value="points" />
        <label className="sr-only" htmlFor="pt-view">Show</label>
        <select
          id="pt-view"
          name="view"
          defaultValue={view}
          className="h-10 rounded-md border border-border bg-surface px-3 text-[14px] font-semibold text-heading"
        >
          {VIEWS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
        <label className="relative min-w-[220px] max-w-md flex-1">
          <span className="sr-only">Search points</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search by point or ID"
            className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </label>
        <button type="submit" className={`${btnSecondary} h-10`}>Show</button>
        <span className="text-[13px] text-muted">Grouped by meeting · {rows.length} point{rows.length === 1 ? "" : "s"}</span>
      </form>

      {error && <p role="alert" className="text-[13px] text-danger-text">Couldn't load points: {error}</p>}

      {rows.length === 0 ? (
        <div className="theme-card-structural p-10 text-center">
          <ClipboardList className="mx-auto mb-2 h-8 w-8 text-muted" aria-hidden />
          <p className="text-[14px] font-medium text-foreground">{search ? "No points match your search" : "Nothing here"}</p>
          <p className="mt-0.5 text-[13px] text-muted">Points are raised inside a meeting and show up here for their owners.</p>
        </div>
      ) : (
        <div className="theme-card-structural overflow-x-auto p-0">
          <table className="w-full min-w-[960px] border-collapse text-[14px]">
            <thead>
              <tr className="bg-sunken text-left text-[12.5px] font-semibold text-subtle">
                <th scope="col" className="w-[120px] px-4 py-2.5">ID</th>
                <th scope="col" className="px-4 py-2.5">Point</th>
                <th scope="col" className="px-4 py-2.5">Owner</th>
                <th scope="col" className="w-[140px] px-4 py-2.5">Status</th>
                <th scope="col" className="px-4 py-2.5">Priority</th>
                <th scope="col" className="px-4 py-2.5">Due date</th>
                <th scope="col" className="px-4 py-2.5">Carried</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(groups.values()).map((g) => (
                <React.Fragment key={g.meetingId}>
                  <tr className="border-t border-border bg-sunken">
                    <td colSpan={7} className="px-4 py-2.5 font-semibold text-heading">
                      <Link href={`/meet/meetings/${g.meetingId}`} className="hover:underline">
                        {g.code ? <span className="mr-2 text-[12.5px] font-semibold text-muted">{g.code}</span> : null}
                        {g.title}
                      </Link>
                      <span className="ml-2 text-[12.5px] font-medium text-muted">({g.rows.length})</span>
                    </td>
                  </tr>
                  {g.rows.map((r) => {
                    const st = pointStatus(r.status);
                    const closed = r.status === "closed" || r.status === "dropped";
                    return (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-4 py-0">
                          <Link href={`/meet/points/${r.id}`} className="text-[13px] font-semibold text-primary hover:underline">{r.code}</Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/meet/points/${r.id}`} className={`font-medium hover:underline ${closed ? "text-muted line-through" : "text-foreground"}`}>
                            {r.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-subtle">{r.owner_name || "Unassigned"}</td>
                        <td className="p-0">
                          <span className={`flex h-[48px] items-center justify-center px-3 text-[13px] font-semibold ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3"><PriorityText p={r.priority} /></td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="text-[13.5px] text-foreground">{shortDate(r.due_date)}</span>{" "}
                          <DueHint due={r.due_date} status={r.status} />
                        </td>
                        <td className="px-4 py-3">
                          {r.carry_forward_count >= 3 ? (
                            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[12px] font-semibold text-warning-text">{r.carry_forward_count} times</span>
                          ) : (
                            <span className="text-[13px] text-muted">{r.carry_forward_count ? `${r.carry_forward_count} time${r.carry_forward_count === 1 ? "" : "s"}` : "New"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
