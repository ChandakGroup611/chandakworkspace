import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDecisionDetail } from "@/lib/actions/meet/decision-detail";
import { getMeetingMasters } from "@/lib/actions/meet/masters";
import BackLink from "@/components/meet/BackLink";
import DecisionDetailClient from "./DecisionDetailClient";
import CommentsPanel from "@/components/meet/CommentsPanel";
import FilesPanel from "@/components/meet/FilesPanel";
import { readDecisionMeta, getDecisionImplementation } from "@/lib/actions/meet/decision-new";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export const dynamic = "force-dynamic";

const IST = "Asia/Kolkata";
const day = (iso?: string | null) => (iso ? new Date(String(iso).length === 10 ? `${iso}T12:00:00+05:30` : iso).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric" }) : "—");
const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-success-soft text-success-text" },
  superseded: { label: "Replaced", cls: "bg-warning-soft text-warning-text" },
  revoked: { label: "Withdrawn", cls: "bg-sunken text-muted" },
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const x: any = await getDecisionDetail(id).catch(() => null);
  return { title: x?.d ? `${x.d.code} · Decision · Chandak Meet` : "Decision · Chandak Meet" };
}

export default async function DecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [x, masters, meta, impl] = await Promise.all([getDecisionDetail(id), getMeetingMasters(), readDecisionMeta(id).catch(() => null), getDecisionImplementation(id).catch(() => [])]);
  if (!x) notFound();
  const userName = (uid: string) => (masters.users || []).find((u: any) => u.id === uid)?.full_name || "Someone";
  let deptNames: string[] = [];
  if (meta?.department_ids?.length) {
    const { data } = await supabaseAdmin.from("departments").select("name").in("id", meta.department_ids);
    deptNames = (data || []).map((d: any) => d.name);
  }
  const appliesLabel = !meta || meta.applies_to === "everyone" ? "Everyone" : meta.applies_to === "departments" ? deptNames.join(", ") || "Departments" : meta.user_ids.map(userName).join(", ");
  const doneCount = impl.filter((t) => t.status === "completed").length;
  const st = STATUS[x.d.status] || STATUS.active;
  const reviewDue = x.d.status === "active" && x.d.review_date && x.d.review_date <= new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5 pb-6">
      <div className="space-y-2 border-b border-border pb-4">
        <BackLink href="/meet/decisions" label="Decisions" />
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[15px] font-semibold text-muted">{x.d.code}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${st.cls}`}>{st.label}</span>
          {reviewDue && <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-[12.5px] font-semibold text-danger-text">Review due</span>}
        </div>
        <h1 className="leading-snug text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading">{x.d.text}</h1>
        {(meta?.category || meta?.priority) && (
          <div className="flex flex-wrap gap-2">
            {meta?.category && <span className="rounded-full bg-sunken px-2.5 py-0.5 text-[12.5px] font-semibold text-subtle">{meta.category}</span>}
            {meta?.priority && <span className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold capitalize ${meta.priority === "critical" ? "bg-danger-soft text-danger-text" : "bg-warning-soft text-warning-text"}`}>{meta.priority} importance</span>}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {meta?.details && (
            <section className="theme-card-structural space-y-1 p-5" aria-label="Details">
              <h2 className="text-[15px] font-semibold text-heading">Details</h2>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">{meta.details}</p>
            </section>
          )}

          <section className="theme-card-structural grid gap-4 p-5 sm:grid-cols-2" aria-label="Where it came from">
            <div className="sm:col-span-2">
              <p className="text-[12.5px] font-medium text-muted">Applies to</p>
              <p className="text-[15px] font-semibold text-foreground">{appliesLabel}</p>
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-muted">Meeting</p>
              {x.meeting ? <Link href={`/meet/meetings/${x.meeting.id}`} className="text-[15px] font-semibold text-primary hover:underline">{x.meeting.code ? `${x.meeting.code} · ` : ""}{x.meeting.title}</Link> : <p className="text-[15px] text-foreground">—</p>}
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-muted">Decided on</p>
              <p className="text-[15px] font-semibold text-foreground">
                {day(x.session?.date || x.d.decided_at)}
                {x.session && <Link href={`/meet/sessions/${x.session.id}/review`} className="ml-2 text-[13px] font-medium text-primary hover:underline">Minutes</Link>}
              </p>
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-muted">About point</p>
              {x.point ? <Link href={`/meet/points/${x.point.id}`} className="text-[15px] font-semibold text-primary hover:underline">{x.point.code} {x.point.title}</Link> : <p className="text-[14px] text-muted">Not linked to a point</p>}
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-muted">Decided by</p>
              <p className="text-[15px] font-semibold text-foreground">{x.d.decided_by || "The meeting"}</p>
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-muted">In force from</p>
              <p className="text-[15px] text-foreground">{day(x.d.effective_from)}</p>
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-muted">Review on</p>
              <p className={`text-[15px] ${reviewDue ? "font-semibold text-danger-text" : "text-foreground"}`}>{x.d.review_date ? day(x.d.review_date) : "No review date"}</p>
            </div>
          </section>

          {(x.replacedBy || x.replaces.length > 0) && (
            <section className="theme-card-structural space-y-2 p-5" aria-label="History">
              <h2 className="text-[15px] font-semibold text-heading">Replaced decisions</h2>
              {x.replacedBy && (
                <p className="text-[14px] text-foreground">Replaced by <Link href={`/meet/decisions/${x.replacedBy.id}`} className="font-semibold text-primary hover:underline">{x.replacedBy.code}</Link>: {x.replacedBy.text}</p>
              )}
              {x.replaces.map((r) => (
                <p key={r.id} className="text-[14px] text-foreground">Replaces <Link href={`/meet/decisions/${r.id}`} className="font-semibold text-primary hover:underline">{r.code}</Link>: {r.text}</p>
              ))}
            </section>
          )}

          <section className="theme-card-structural space-y-3 p-5" aria-label="Implementation">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-heading">What's been done</h2>
              {impl.length > 0 && <span className="text-[13px] font-semibold text-subtle">{doneCount} of {impl.length} done</span>}
            </div>
            {impl.length === 0 ? (
              <p className="text-[13.5px] text-muted">Nobody has been asked to act on this yet. Add a person on the right; they get a task and update it with what they did.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-[14px]">
                  <thead>
                    <tr className="bg-sunken text-left text-[12.5px] font-semibold text-subtle">
                      <th className="px-3 py-2">Person</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Done</th><th className="px-3 py-2">Due</th><th className="px-3 py-2">Latest update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impl.map((t) => (
                      <tr key={t.id} className="border-t border-border align-top">
                        <td className="px-3 py-2"><Link href={`/meet/tasks/${t.id}`} className="font-medium text-foreground hover:underline">{t.owner}</Link><span className="block text-[12px] text-muted">{t.code}</span></td>
                        <td className="px-3 py-2 capitalize text-subtle">{t.status.replace(/_/g, " ")}</td>
                        <td className="px-3 py-2 text-subtle">{t.progress}%</td>
                        <td className="whitespace-nowrap px-3 py-2 text-subtle">{day(t.due)}</td>
                        <td className="px-3 py-2 text-[13px] text-subtle">{t.lastUpdate || "No update yet"}{t.lastAt ? <span className="block text-[12px] text-muted">{day(t.lastAt)}</span> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <FilesPanel entityType="decision" entityId={x.d.id} title="Attachments" canAdd={x.canManage} />

          <CommentsPanel entityType="decision" entityId={x.d.id} />

          <section className="theme-card-structural space-y-2 p-5" aria-label="Activity">
            <h2 className="text-[15px] font-semibold text-heading">History</h2>
            <ol className="space-y-2">
              <li className="border-l-2 border-border pl-3 text-[13.5px]"><span className="font-semibold text-foreground">Recorded</span><span className="block text-[12px] text-muted">{day(x.d.created_at)}</span></li>
              {x.activity.map((a) => (
                <li key={a.id} className="border-l-2 border-border pl-3 text-[13.5px]">
                  <span className="font-semibold text-foreground">{a.value || a.action.replace(/_/g, " ")}</span>
                  <span className="block text-[12px] text-muted">{a.by || "System"} · {day(a.at)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside>
          <DecisionDetailClient
            id={x.d.id}
            status={x.d.status}
            reviewDate={x.d.review_date || ""}
            sessionId={x.session?.id || null}
            canManage={x.canManage}
            users={(masters.users || []) as any}
          />
        </aside>
      </div>
    </div>
  );
}
