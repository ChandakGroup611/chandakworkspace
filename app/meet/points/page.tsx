import React from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { listPoints, type ShowScope } from "@/lib/actions/meet/lists";
import ListFilters from "@/components/meet/lists/ListFilters";
import ExportCsvButton from "@/components/meet/lists/ExportCsvButton";
import { pointStatus, PriorityText, DueHint, shortDate } from "@/components/meet/point-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Points · Chandak Meet", description: "Every point raised in meetings, with filters" };

const STATUS_OPTS = [
  { id: "open_any", label: "All open" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "on_hold", label: "On hold" },
  { id: "closed", label: "Closed" },
  { id: "dropped", label: "Dropped" },
  { id: "all", label: "Any status" },
];

export default async function PointsListPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const data = await listPoints({
    show: sp.show as ShowScope | undefined,
    status: sp.status,
    meeting: sp.meeting,
    owner: sp.owner,
    priority: sp.priority,
    due: sp.due,
    carried: sp.carried,
    q: sp.q,
  });
  const showOpts = [
    { id: "mine", label: "Assigned to me" },
    { id: "meetings", label: "From my meetings" },
    ...(data.isAdmin ? [{ id: "all", label: "All meetings" }] : []),
  ];
  const quick = (patch: Record<string, string>, label: string, n: number) => {
    const p = new URLSearchParams({ show: data.show, ...patch });
    return (
      <Link href={`/meet/points?${p.toString()}`} className="theme-card-structural flex min-w-[130px] flex-1 flex-col p-3 hover:border-primary">
        <span className="text-[22px] font-bold text-heading">{n}</span>
        <span className="text-[12.5px] text-muted">{label}</span>
      </Link>
    );
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.01em] text-heading">Points</h1>
          <p className="mt-0.5 text-[13.5px] text-muted">Every point raised in your meetings. Open points come back to the next meeting until they're closed. Click a point to open it.</p>
        </div>
        <ExportCsvButton
          filename="meet-points"
          header={["Point", "Title", "Meeting", "Owner", "Status", "Priority", "Due", "Open tasks", "Times carried"]}
          rows={data.rows.map((r) => [r.code, r.title, r.meeting_title, r.owner_name || "", r.status, r.priority, r.due_date || "", r.open_tasks, r.carry_forward_count])}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {quick({ status: "open_any" }, "Open", data.summary.open)}
        {quick({ status: "open_any", due: "overdue" }, "Overdue", data.summary.overdue)}
        {quick({ status: "open_any", carried: "3" }, "Carried 3+ times", data.summary.carried)}
        {quick({ status: "closed" }, "Closed or dropped", data.summary.closed)}
      </div>

      <ListFilters
        action="/meet/points"
        search={sp.q}
        searchPlaceholder="Point title or ID (PT-…)"
        resultLabel={`${data.rows.length} point${data.rows.length === 1 ? "" : "s"}`}
        fields={[
          { name: "show", label: "Whose", type: "select", value: data.show, options: showOpts },
          { name: "status", label: "Status", type: "select", value: sp.status || "open_any", options: STATUS_OPTS },
          { name: "meeting", label: "Meeting", type: "select", value: sp.meeting, anyLabel: "Any meeting", options: data.meetings },
          { name: "owner", label: "Owner", type: "select", value: sp.owner, anyLabel: "Anyone", options: [{ id: "none", label: "No owner yet" }, ...data.owners] },
          { name: "priority", label: "Priority", type: "select", value: sp.priority, anyLabel: "Any priority", options: [
            { id: "critical", label: "Critical" }, { id: "high", label: "High" }, { id: "medium", label: "Medium" }, { id: "low", label: "Low" },
          ] },
          { name: "due", label: "Due", type: "select", value: sp.due, anyLabel: "Any time", options: [
            { id: "overdue", label: "Overdue" }, { id: "week", label: "Next 7 days" }, { id: "month", label: "Next 30 days" },
          ] },
          { name: "carried", label: "Carried forward", type: "select", value: sp.carried, anyLabel: "Any", options: [
            { id: "1", label: "At least once" }, { id: "3", label: "3 times or more" },
          ] },
        ]}
      />

      {"error" in data && data.error && <p role="alert" className="text-[13px] text-danger-text">Couldn't load points: {data.error}</p>}

      {data.rows.length === 0 ? (
        <div className="theme-card-structural p-10 text-center">
          <ClipboardList className="mx-auto mb-2 h-8 w-8 text-muted" aria-hidden />
          <p className="text-[14px] font-medium text-foreground">No points match these filters</p>
          <p className="mt-0.5 text-[13px] text-muted">Try "Whose: From my meetings" or "Status: Any status".</p>
        </div>
      ) : (
        <div className="theme-card-structural overflow-x-auto p-0">
          <table className="w-full min-w-[1000px] border-collapse text-[14px]">
            <thead>
              <tr className="bg-sunken text-left text-[12.5px] font-semibold text-subtle">
                <th scope="col" className="w-[110px] px-4 py-2.5">ID</th>
                <th scope="col" className="px-4 py-2.5">Point</th>
                <th scope="col" className="px-4 py-2.5">Meeting</th>
                <th scope="col" className="px-4 py-2.5">Owner</th>
                <th scope="col" className="px-4 py-2.5">Status</th>
                <th scope="col" className="px-4 py-2.5">Priority</th>
                <th scope="col" className="px-4 py-2.5">Due</th>
                <th scope="col" className="px-4 py-2.5">Open tasks</th>
                <th scope="col" className="px-4 py-2.5">Carried</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const st = pointStatus(r.status);
                const closed = r.status === "closed" || r.status === "dropped";
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <Link href={`/meet/points/${r.id}`} className="text-[13px] font-semibold text-primary hover:underline">{r.code}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/meet/points/${r.id}`} className={`font-medium hover:underline ${closed ? "text-muted line-through" : "text-foreground"}`}>{r.title}</Link>
                    </td>
                    <td className="px-4 py-3 text-[13px]">
                      <Link href={`/meet/meetings/${r.meeting_id}`} className="text-subtle hover:text-primary hover:underline">
                        {r.meeting_code ? `${r.meeting_code} · ` : ""}{r.meeting_title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-subtle">{r.owner_name || <span className="text-warning-text">No owner</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3"><PriorityText p={r.priority} /></td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-[13.5px] text-foreground">{shortDate(r.due_date)}</span> <DueHint due={r.due_date} status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-subtle">{r.open_tasks || "—"}</td>
                    <td className="px-4 py-3">
                      {r.carry_forward_count >= 3 ? (
                        <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[12px] font-semibold text-warning-text">{r.carry_forward_count} times</span>
                      ) : (
                        <span className="text-[13px] text-muted">{r.carry_forward_count ? `${r.carry_forward_count}×` : "New"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
