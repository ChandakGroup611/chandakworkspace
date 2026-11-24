import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getPointDetail } from "@/lib/actions/meet/points-view";
import { pointStatus, PriorityText, DueHint, shortDate } from "@/components/meet/point-ui";
import PointActions from "./PointActions";
import PointUpdateForm from "./PointUpdateForm";
import PointMoveCard from "./PointMoveCard";
import CommentsPanel from "@/components/meet/CommentsPanel";
import FilesPanel from "@/components/meet/FilesPanel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getPointDetail(id).catch(() => null);
  return { title: d ? `${d.point.code} ${d.point.title} · Chandak Meet` : "Point · Chandak Meet" };
}

const IST = "Asia/Kolkata";
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const ACTION_LABEL: Record<string, string> = {
  created: "Raised",
  status_changed: "Status changed",
  due_date_changed: "Due date changed",
  updated: "Details updated",
  reassigned: "Owner changed",
  carried_forward: "Carried forward",
};

export default async function PointPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const d = await getPointDetail(id);
  if (!d) notFound();
  const p = d.point;
  const st = pointStatus(p.status);
  const tab = ["tasks", "history", "updates", "activity"].includes(rawTab || "") ? rawTab! : "tasks";

  const field = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-3 border-b border-border py-2.5 text-[14px] last:border-b-0">
      <span className="text-[13.5px] text-subtle">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );

  return (
    <div className="flex flex-wrap gap-5 pb-6">
      {/* Left: other open points of this meeting (Zoho-style list) */}
      <aside aria-label="Open points in this meeting" className="flex-[1_1_260px] max-w-[320px] space-y-2">
        <Link href={d.meeting ? `/meet/meetings/${d.meeting.id}?tab=points` : "/meet/points?show=mine"} className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-heading hover:underline">
          <ChevronLeft className="h-4 w-4" aria-hidden /> {d.meeting?.title || "Points"}
        </Link>
        <ul className="space-y-2">
          {d.siblings.slice(0, 30).map((s) => {
            const sst = pointStatus(s.status);
            const current = s.id === p.id;
            return (
              <li key={s.id}>
                <Link
                  href={`/meet/points/${s.id}`}
                  aria-current={current ? "page" : undefined}
                  className={`block rounded-lg border bg-surface p-3 transition-colors hover:border-primary/50 ${current ? "border-primary ring-1 ring-primary" : "border-border"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-muted">{s.code}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[11.5px] font-semibold ${sst.cls}`}>{sst.label}</span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-[14px] font-semibold text-foreground">{s.title}</div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[12.5px] text-subtle">
                    <span className="truncate">{s.owner_name || "Unassigned"}</span>
                    <DueHint due={s.due_date} status={s.status} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Right: the point */}
      <main className="min-w-0 flex-[999_1_560px] space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11.5px] font-semibold text-accent-soft-text">Point</span>
            <span className="text-[13px] font-semibold text-muted">{p.code}</span>
            <span className={`rounded px-2 py-0.5 text-[12px] font-semibold ${st.cls}`}>{st.label}</span>
            {p.carry_forward_count >= 3 && (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[12px] font-semibold text-warning-text">Carried {p.carry_forward_count} times</span>
            )}
          </div>
          <h1 className="mt-2 text-[22px] font-bold text-heading">{p.title}</h1>
          <p className="mt-1 text-[13.5px] text-subtle">
            {p.raised_by_name ? `Raised by ${p.raised_by_name}` : "Raised"}
            {d.meeting ? <> in <Link href={`/meet/meetings/${d.meeting.id}`} className="text-primary hover:underline">{d.meeting.title}</Link></> : null}
            {p.created_at ? ` on ${shortDate(p.created_at)}` : ""} · {d.tasks.length} task{d.tasks.length === 1 ? "" : "s"}
          </p>
        </div>

        <section className="theme-card-structural p-5" aria-labelledby="pt-update">
          <h2 id="pt-update" className="mb-3 text-[15px] font-semibold text-heading">Update</h2>
          <PointActions pointId={p.id} status={p.status} progress={Number(p.progress_percent) || 0} dueDate={p.due_date} canEdit={d.canEdit} />
        </section>

        {p.status !== "closed" && p.status !== "dropped" && (
          <section id="send-update" className="theme-card-structural scroll-mt-4 p-5" aria-labelledby="pt-send-update">
            <h2 id="pt-send-update" className="mb-1 text-[15px] font-semibold text-heading">Send an update for the next meeting</h2>
            <p className="mb-3 text-[13px] text-muted">Shared with everyone in the meeting before it starts.</p>
            <PointUpdateForm pointId={p.id} progress={Number(p.progress_percent) || 0} />
          </section>
        )}

        <section className="theme-card-structural px-5 py-3" aria-labelledby="pt-details">
          <h2 id="pt-details" className="mb-1 mt-1 text-[15px] font-semibold text-heading">Details</h2>
          {field("Description", p.description || <span className="text-muted">No description</span>)}
          {field("Owner", (Array.isArray(p.owner) ? p.owner[0] : p.owner)?.full_name || "Unassigned")}
          {field("Priority", <PriorityText p={p.priority} />)}
          {field("Category", (Array.isArray(p.category) ? p.category[0] : p.category)?.name || "—")}
          {field("TAT", p.tat_days ? `${p.tat_days} working days` : "—")}
          {field("Due date", <>{shortDate(p.due_date)} <DueHint due={p.due_date} status={p.status} /></>)}
          {p.closure_remarks ? field("Closing remarks", p.closure_remarks) : null}
        </section>

        <section className="theme-card-structural p-0" aria-label="Point activity">
          <nav aria-label="Point sections" className="flex flex-wrap border-b border-border px-5">
            {[
              { id: "tasks", label: `Tasks (${d.tasks.length})` },
              { id: "history", label: `Meeting history (${d.history.length})` },
              { id: "updates", label: `Updates (${d.updates.length})` },
              { id: "activity", label: "Activity" },
            ].map((t) => (
              <Link
                key={t.id}
                href={`/meet/points/${p.id}?tab=${t.id}`}
                aria-current={tab === t.id ? "page" : undefined}
                scroll={false}
                className={`-mb-px mr-5 inline-flex h-11 items-center border-b-2 text-[14px] ${
                  tab === t.id ? "border-primary font-semibold text-heading" : "border-transparent font-medium text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="p-5">
            {tab === "tasks" &&
              (d.tasks.length === 0 ? (
                <p className="text-[13.5px] text-muted">No action items under this point yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {d.tasks.map((t: any) => {
                    const owner = Array.isArray(t.owner) ? t.owner[0] : t.owner;
                    const due = t.revised_due_date || t.due_date;
                    return (
                      <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14px]">
                        <span className="min-w-0">
                          <span className="mr-2 text-[12.5px] font-semibold text-muted">{t.code}</span>
                          <span className={t.status === "completed" ? "text-muted line-through" : "text-foreground"}>{t.title}</span>
                          <span className="ml-2 text-[12.5px] text-subtle">{owner?.full_name || ""}</span>
                        </span>
                        <span className="whitespace-nowrap text-[13px] text-subtle">
                          {t.status.replace(/_/g, " ")} · {shortDate(due)} <DueHint due={due} status={t.status === "completed" || t.status === "cancelled" ? "closed" : "open"} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ))}

            {tab === "history" &&
              (d.history.length === 0 ? (
                <p className="text-[13.5px] text-muted">Not discussed in a meeting yet.</p>
              ) : (
                <ol className="space-y-3">
                  {d.history.map((h) => (
                    <li key={h.session_id} className="text-[14px]">
                      <Link href={`/meet/sessions/${h.session_id}`} className="font-semibold text-heading hover:underline">{h.date ? shortDate(h.date) : h.code}</Link>
                      <span className="text-subtle">
                        {" · "}
                        {h.entry_type === "carried_forward" ? "carried forward" : "raised"}
                        {h.status_at_start || h.status_at_end ? ` · ${pointStatus(h.status_at_start || "open").label} → ${pointStatus(h.status_at_end || h.status_at_start || "open").label}` : ""}
                      </span>
                      {h.notes && <p className="mt-0.5 whitespace-pre-wrap text-[13.5px] text-foreground">{h.notes}</p>}
                    </li>
                  ))}
                </ol>
              ))}

            {tab === "updates" &&
              (d.updates.length === 0 ? (
                <p className="text-[13.5px] text-muted">No pre-meeting updates yet.</p>
              ) : (
                <ul className="space-y-3">
                  {d.updates.map((u) => (
                    <li key={u.id} className="text-[14px]">
                      <span className="font-semibold text-heading">{u.by || "Someone"}</span>
                      <span className="text-[12.5px] text-muted"> · {when(u.at)}{u.progress !== null ? ` · ${u.progress}%` : ""}</span>
                      {u.text && <p className="mt-0.5 text-foreground">{u.text}</p>}
                    </li>
                  ))}
                </ul>
              ))}

            {tab === "activity" &&
              (d.activity.length === 0 ? (
                <p className="text-[13.5px] text-muted">No activity recorded.</p>
              ) : (
                <ol className="space-y-2.5">
                  {d.activity.map((a) => (
                    <li key={a.id} className="text-[13.5px]">
                      <span className="font-semibold text-heading">{ACTION_LABEL[a.action] || a.action.replace(/_/g, " ")}</span>
                      <span className="text-muted"> · {a.by || "System"} · {when(a.at)}</span>
                      {(a.old_value || a.new_value) && (
                        <p className="text-subtle">
                          {a.old_value ? `${a.old_value} → ` : ""}
                          {a.new_value}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              ))}
          </div>
        </section>
        {d.canEdit && <PointMoveCard pointId={p.id} meetingId={d.meeting?.id || null} />}
        <FilesPanel entityType="point" entityId={p.id} canAdd={d.canEdit} />
        <CommentsPanel entityType="point" entityId={p.id} />
      </main>
    </div>
  );
}
