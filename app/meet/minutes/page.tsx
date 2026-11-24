import React from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { listMinutes, type ShowScope } from "@/lib/actions/meet/lists";
import ListFilters from "@/components/meet/lists/ListFilters";
import ExportCsvButton from "@/components/meet/lists/ExportCsvButton";
import ClickableRow from "@/components/meet/lists/ClickableRow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minutes (MoM) · Chandak Meet", description: "Minutes of every meeting that has been held" };

const IST = "Asia/Kolkata";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short", year: "numeric" });
const STATE = {
  sent: { label: "Sent", cls: "bg-success-soft text-success-text" },
  draft: { label: "Draft · waiting for approval", cls: "bg-warning-soft text-warning-text" },
  missing: { label: "Not written yet", cls: "bg-danger-soft text-danger-text" },
} as const;

export default async function MinutesListPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const data = await listMinutes({ show: sp.show as ShowScope | undefined, state: sp.state, meeting: sp.meeting, from: sp.from, to: sp.to, q: sp.q });
  const showOpts = [{ id: "meetings", label: "My meetings" }, ...(data.isAdmin ? [{ id: "all", label: "All meetings" }] : [])];
  const tile = (state: string, label: string, n: number) => {
    const p = new URLSearchParams({ show: data.show, ...(state ? { state } : {}) });
    const on = (sp.state || "") === state;
    return (
      <Link href={`/meet/minutes?${p}`} aria-current={on ? "true" : undefined} className={`theme-card-structural flex min-w-[140px] flex-1 flex-col p-3 hover:border-primary ${on ? "border-primary" : ""}`}>
        <span className="text-[22px] font-bold text-heading">{n}</span>
        <span className="text-[12.5px] text-muted">{label}</span>
      </Link>
    );
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.01em] text-heading">Minutes (MoM)</h1>
          <p className="mt-0.5 text-[13.5px] text-muted">The minutes of every meeting that has been held. Click a row to read them, or to finish and send a draft.</p>
        </div>
        <ExportCsvButton
          filename="meet-minutes"
          header={["Meeting", "Code", "Held on", "Minutes", "Sent on", "Points", "Tasks", "Decisions", "Summary"]}
          rows={data.rows.map((r) => [r.meeting_title, r.session_code || "", r.date.slice(0, 10), r.state, r.sent_at ? r.sent_at.slice(0, 10) : "", r.points, r.tasks, r.decisions, r.overview || ""])}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {tile("", "All", data.counts.draft + data.counts.sent + data.counts.missing)}
        {tile("draft", "Drafts to approve", data.counts.draft)}
        {tile("missing", "Not written yet", data.counts.missing)}
        {tile("sent", "Sent", data.counts.sent)}
      </div>

      <ListFilters
        action="/meet/minutes"
        search={sp.q}
        searchPlaceholder="Meeting title or code"
        resultLabel={`${data.rows.length} meeting${data.rows.length === 1 ? "" : "s"}`}
        fields={[
          { name: "show", label: "Whose", type: "select", value: data.show, options: showOpts },
          { name: "state", label: "Minutes", type: "select", value: sp.state, anyLabel: "Any", options: [
            { id: "draft", label: "Draft" }, { id: "missing", label: "Not written yet" }, { id: "sent", label: "Sent" },
          ] },
          { name: "meeting", label: "Meeting", type: "select", value: sp.meeting, anyLabel: "Any meeting", options: data.meetings },
          { name: "from", label: "Held from", type: "date", value: sp.from },
          { name: "to", label: "Held to", type: "date", value: sp.to },
        ]}
      />

      {"error" in data && data.error && <p role="alert" className="text-[13px] text-danger-text">Couldn't load minutes: {data.error}</p>}

      {data.rows.length === 0 ? (
        <div className="theme-card-structural p-10 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-muted" aria-hidden />
          <p className="text-[14px] font-medium text-foreground">No minutes match these filters</p>
          <p className="mt-0.5 text-[13px] text-muted">Minutes appear here once a meeting has been ended.</p>
        </div>
      ) : (
        <div className="theme-card-structural overflow-x-auto p-0">
          <table className="w-full min-w-[960px] border-collapse text-[14px]">
            <thead>
              <tr className="bg-sunken text-left text-[12.5px] font-semibold text-subtle">
                <th scope="col" className="px-4 py-2.5">Meeting</th>
                <th scope="col" className="px-4 py-2.5">Held on</th>
                <th scope="col" className="px-4 py-2.5">Minutes</th>
                <th scope="col" className="px-4 py-2.5">Points</th>
                <th scope="col" className="px-4 py-2.5">Tasks</th>
                <th scope="col" className="px-4 py-2.5">Decisions</th>
                <th scope="col" className="px-4 py-2.5"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const st = STATE[r.state];
                return (
                  <ClickableRow key={r.session_id} href={`/meet/sessions/${r.session_id}/review`} className="border-t border-border align-top">
                    <td className="max-w-[420px] px-4 py-3">
                      <Link href={`/meet/sessions/${r.session_id}/review`} className="font-semibold text-heading hover:underline">{r.meeting_title}</Link>
                      <div className="text-[12.5px] text-muted">{r.session_code || r.meeting_code}{r.organiser ? ` · Organiser ${r.organiser}` : ""}</div>
                      {r.overview && <p className="mt-1 line-clamp-2 text-[12.5px] text-subtle">{r.overview}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-subtle">{day(r.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${st.cls}`}>{st.label}</span>
                      {r.sent_at && <div className="mt-0.5 text-[12px] text-muted">on {day(r.sent_at)}</div>}
                    </td>
                    <td className="px-4 py-3 text-subtle">{r.points}</td>
                    <td className="px-4 py-3 text-subtle">{r.tasks}</td>
                    <td className="px-4 py-3 text-subtle">{r.decisions}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link href={`/meet/sessions/${r.session_id}/review`} className="inline-flex h-8 items-center rounded-md border border-border px-3 text-[13px] font-semibold text-foreground hover:bg-surface-hover">
                        {r.state === "sent" ? "Read" : r.state === "draft" ? "Review and send" : "Write minutes"}
                      </Link>
                    </td>
                  </ClickableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
