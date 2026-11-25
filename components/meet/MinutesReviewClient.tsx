"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Sparkles, Loader2, CheckCircle2, RotateCcw, Send } from "lucide-react";
import { generateAIMinutes, updateAIMinutes, approveAndSendMoM } from "@/lib/actions/meet/ai-minutes";
import { convertBlockToItem, updateNoteBlock } from "@/lib/actions/meet/notes";
import type { MinutesReview, ReviewSuggestion } from "@/lib/actions/meet/review";
import { minutesAsText } from "@/lib/utils/meet-minutes-text";

const IST = "Asia/Kolkata";
const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
const btnSecondary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-[14px] font-semibold text-foreground transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
const field = "h-9 w-full rounded-md border border-border bg-surface px-2.5 text-[13.5px] text-foreground focus:border-primary focus:outline-none";

const KIND_STYLE: Record<ReviewSuggestion["kind"], string> = {
  task: "bg-accent-soft text-accent-soft-text",
  decision: "bg-success-soft text-success-text",
  point: "bg-warning-soft text-warning-text",
};

function SuggestionRow({ s, review, onDone }: { s: ReviewSuggestion; review: MinutesReview; onDone: (msg: string) => void }) {
  const [kind, setKind] = useState<ReviewSuggestion["kind"]>(s.kind);
  const [title, setTitle] = useState(s.text);
  const [pointId, setPointId] = useState(s.pointId || "");
  const [ownerId, setOwnerId] = useState(s.ownerId || "");
  const [tat, setTat] = useState(s.tatDays);
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);

  const accept = () =>
    start(async () => {
      if (kind === "task" && !pointId) {
        toast.warning("Pick the point this task belongs to.");
        setEditing(true);
        return;
      }
      const res = await convertBlockToItem(s.blockId, kind, {
        meeting_id: review.session.meetingId || "",
        session_id: review.session.id,
        title: title.trim(),
        owner_id: ownerId || undefined,
        tat_days: kind === "decision" ? undefined : tat,
        point_id: kind === "task" ? pointId : undefined,
      });
      if (!res.success) {
        toast.error(res.error || "Couldn't add it.");
        return;
      }
      onDone(`${kind === "task" ? "Task" : kind === "decision" ? "Decision" : "Point"} added${res.linked_item?.code ? ` (${res.linked_item.code})` : ""}.`);
    });

  const discard = () =>
    start(async () => {
      const res = await updateNoteBlock(s.blockId, { not_action: true });
      if (!res.success) {
        toast.error(res.error || "Couldn't discard it.");
        return;
      }
      onDone("Discarded. It stays in the notes only.");
    });

  const ownerName = review.people.find((p) => p.id === ownerId)?.name;

  return (
    <li className="border-t border-border px-5 py-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className={`mt-0.5 rounded px-2 py-0.5 text-[11.5px] font-bold ${KIND_STYLE[kind]}`}>
          {kind === "task" ? "Task" : kind === "decision" ? "Decision" : "Point"}
        </span>
        <div className="min-w-0 flex-[1_1_320px]">
          {editing ? (
            <div className="space-y-2.5">
              <label className="sr-only" htmlFor={`t-${s.blockId}`}>Title</label>
              <input id={`t-${s.blockId}`} value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                <label className="text-[12px] font-semibold text-subtle">
                  Type
                  <select value={kind} onChange={(e) => setKind(e.target.value as any)} className={`${field} mt-1`}>
                    <option value="task">Task</option>
                    <option value="decision">Decision</option>
                    <option value="point">New point</option>
                  </select>
                </label>
                {kind === "task" && (
                  <label className="text-[12px] font-semibold text-subtle sm:col-span-1">
                    Under point
                    <select value={pointId} onChange={(e) => setPointId(e.target.value)} className={`${field} mt-1`}>
                      <option value="">Pick a point</option>
                      {review.points.map((p) => <option key={p.id} value={p.id}>{p.code} {p.title}</option>)}
                    </select>
                  </label>
                )}
                {kind !== "decision" && (
                  <>
                    <label className="text-[12px] font-semibold text-subtle">
                      Owner
                      <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={`${field} mt-1`}>
                        <option value="">Unassigned</option>
                        {review.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </label>
                    <label className="text-[12px] font-semibold text-subtle">
                      TAT (working days)
                      <input type="number" min={1} max={60} value={tat} onChange={(e) => setTat(Number(e.target.value) || 1)} className={`${field} mt-1`} />
                    </label>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="text-[14.5px] font-semibold text-foreground">{title}</div>
              <div className="mt-0.5 text-[13px] text-subtle">
                {kind === "decision"
                  ? "Recorded as a decision of this meeting"
                  : `Owner ${ownerName || "not set"} · TAT ${tat} working days${kind === "task" ? ` · under ${review.points.find((p) => p.id === pointId)?.code || "no point yet"}` : ""}`}
              </div>
              <div className="mt-1.5 border-l-[3px] border-border pl-2.5 text-[12.5px] italic text-muted">
                From {s.author ? `${s.author}'s` : "the"} meeting notes: "{s.text}"
              </div>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={accept} disabled={pending} className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60" aria-label={`Accept: ${title}`}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null} Accept
          </button>
          <button type="button" onClick={() => setEditing((v) => !v)} disabled={pending} className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-[13px] font-semibold text-foreground hover:bg-surface-hover">
            {editing ? "Done" : "Edit"}
          </button>
          <button type="button" onClick={discard} disabled={pending} className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-[13px] font-semibold text-danger-text hover:bg-surface-hover" aria-label={`Discard: ${title}`}>
            Discard
          </button>
        </div>
      </div>
    </li>
  );
}

export default function MinutesReviewClient({ review }: { review: MinutesReview }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [overview, setOverview] = useState(review.minutes?.overview || "");
  const [savedOverview, setSavedOverview] = useState(review.minutes?.overview || "");
  const [gone, setGone] = useState<Set<string>>(new Set());

  const m = review.minutes;
  const sent = !!m?.sent_at || ["mom_published", "published"].includes(review.session.status);
  const remaining = review.suggestions.filter((s) => !gone.has(s.blockId));
  const resolved = review.points.filter((p) => !p.carried);
  const carried = review.points.filter((p) => p.carried);

  const generate = () =>
    start(async () => {
      const res = await generateAIMinutes(review.session.id);
      if (!res.success) {
        toast.error(res.error || "Couldn't draft the minutes.");
        return;
      }
      setOverview(res.aiMinutes?.overview || "");
      setSavedOverview(res.aiMinutes?.overview || "");
      toast.success("Minutes drafted.");
      router.refresh();
    });

  const saveOverview = () =>
    start(async () => {
      if (!m) return;
      const res = await updateAIMinutes(m.id, { overview });
      if (!res.success) {
        toast.error(res.error || "Couldn't save.");
        return;
      }
      setSavedOverview(overview);
      toast.success("Summary saved.");
    });

  const approve = () =>
    start(async () => {
      if (!m) return;
      if (remaining.length > 0 && !window.confirm(`${remaining.length} suggestion(s) are not reviewed yet. Send the minutes anyway?`)) return;
      const res = await approveAndSendMoM(review.session.id, m.id, overview);
      if (!res.success) {
        toast.error(res.error || "Couldn't send the minutes.");
        return;
      }
      toast.success(`Minutes approved and sent to ${res.sentCount} ${res.sentCount === 1 ? "person" : "people"}.`);
      router.refresh();
    });

  const onDone = (id: string) => (msg: string) => {
    toast.success(msg);
    setGone((g) => new Set(g).add(id));
    router.refresh();
  };

  const d = review.doc;
  const hrs = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60 ? `${min % 60} min` : ""}`.trim() : `${min} min`);
  const nextLabel = review.nextSession
    ? new Date(review.nextSession.scheduledStart).toLocaleString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : null;
  const due = (x: string | null) => (x ? new Date(`${String(x).slice(0, 10)}T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" }) : "—");
  const ATT: Record<string, string> = { present: "Attended", late: "Came late", absent: "Absent", excused: "Excused", declined: "Couldn't attend", left_early: "Left early" };

  // Email version of the minutes, ready to copy into Outlook
  const email = minutesAsText(review, overview);

  const card = "theme-card-structural p-5";
  const h2 = "text-[16px] font-semibold text-heading";

  return (
    <div className="space-y-5 pb-6 print:space-y-3">
      {/* 1. Title and actions */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted">Minutes of meeting{review.session.meetingCode ? ` · ${review.session.meetingCode}` : ""}</p>
          <h1 className="text-[22px] font-bold text-heading">{review.session.meetingTitle}</h1>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${sent ? "bg-success-soft text-success-text" : m ? "bg-warning-soft text-warning-text" : "bg-sunken text-subtle"}`}>
          {sent ? "Sent" : m ? "Draft · waiting for approval" : "Not drafted yet"}
        </span>
        <div className="ml-auto flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className={btnSecondary}>Print / PDF</button>
          {review.session.meetingId && <Link href={`/meet/meetings/${review.session.meetingId}`} className={btnSecondary}>Meeting page</Link>}
          {review.canEdit && !sent && (
            <button type="button" onClick={generate} disabled={pending} className={btnSecondary}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RotateCcw className="h-4 w-4" aria-hidden />}
              {m ? "Redraft" : "Draft minutes"}
            </button>
          )}
          {review.canApprove && m && !sent && (
            <button type="button" onClick={approve} disabled={pending} className={btnPrimary}>
              <Send className="h-4 w-4" aria-hidden /> Approve and send
            </button>
          )}
        </div>
      </div>

      {/* 2. Meeting in short */}
      <section className={`${card} grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4`} aria-label="Meeting details">
        {[
          ["Date", d.info.date],
          ["Time", `${d.info.start}${d.info.end ? ` – ${d.info.end}` : ""}`],
          ["Where", d.info.where],
          ["Meeting type", d.info.type || "—"],
          ["Organiser", d.info.organiser || "—"],
          ["Chair", d.info.chair || "—"],
          ["Minutes by", d.info.minuteTaker || "—"],
          ["Project", d.info.project || "—"],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-[12px] font-medium text-muted">{k}</p>
            <p className="text-[14.5px] font-semibold text-foreground">{v}</p>
          </div>
        ))}
      </section>

      {/* 3. Numbers at a glance */}
      <section aria-label="At a glance" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          { n: d.totals.durationMin ? hrs(d.totals.durationMin) : "—", l: "Meeting time" },
          { n: `${d.totals.present}/${d.totals.invited}`, l: "Attended" },
          { n: d.totals.points, l: `Points (${d.totals.newPoints} new)` },
          { n: d.totals.tasks, l: "Tasks created" },
          { n: d.totals.decisions, l: "Decisions" },
          { n: d.totals.closed, l: "Points closed" },
          { n: carried.length, l: nextLabel ? "To next meeting" : "Still open" },
        ].map((c) => (
          <div key={c.l} className="theme-card-structural p-3.5">
            <div className="text-[20px] font-bold text-primary">{c.n}</div>
            <div className="text-[12.5px] text-subtle">{c.l}</div>
          </div>
        ))}
      </section>

      {/* 4. Summary */}
      <section className={`${card} space-y-3`} aria-labelledby="mr-sum">
        <div className="flex items-center justify-between gap-2">
          <h2 id="mr-sum" className={`${h2} flex items-center gap-2`}><Sparkles className="h-4 w-4 text-primary" aria-hidden /> Summary</h2>
          {m?.model && <span className="text-[12px] text-muted print:hidden">{m.model === "offline-synthesis" ? "Drafted from meeting data" : "Drafted with AI"}</span>}
        </div>
        {m ? (
          review.canEdit && !sent ? (
            <>
              <label htmlFor="mr-overview" className="sr-only">Summary</label>
              <textarea id="mr-overview" value={overview} onChange={(e) => setOverview(e.target.value)} className="min-h-[110px] w-full resize-y rounded-md border border-border bg-surface p-3 text-[14.5px] leading-relaxed text-foreground focus:border-primary focus:outline-none" />
              {overview !== savedOverview && (
                <div className="flex justify-end"><button type="button" onClick={saveOverview} disabled={pending} className={btnSecondary}>Save summary</button></div>
              )}
            </>
          ) : (
            <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-foreground">{overview || "—"}</p>
          )
        ) : (
          <div className="rounded-lg bg-sunken p-5 text-center">
            <p className="text-[14px] text-subtle">No draft yet. It's built from the points, tasks, decisions and notes captured in the meeting.</p>
            {review.canEdit && (
              <button type="button" onClick={generate} disabled={pending} className={`${btnPrimary} mt-3`}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />} Draft minutes now
              </button>
            )}
          </div>
        )}
        {d.closedRemarks && d.closedRemarks.trim() !== String(overview || "").trim() && <p className="border-l-[3px] border-border pl-3 text-[13.5px] text-subtle">Closing remarks: {d.closedRemarks}</p>}
      </section>

      {/* Review tools (only while it's a draft) */}
      {review.canEdit && !sent && (
        <section className="theme-card-structural overflow-hidden p-0 print:hidden" aria-labelledby="mr-sug">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <h2 id="mr-sug" className={h2}>Found in the notes. Keep what's right.</h2>
            <span className="text-[13px] text-subtle">{remaining.length} to review</span>
          </div>
          {remaining.length === 0 ? (
            <p className="flex items-center gap-2 border-t border-border px-5 py-4 text-[13.5px] text-subtle">
              <CheckCircle2 className="h-4 w-4 text-success-text" aria-hidden /> Nothing left to review.
            </p>
          ) : (
            <ul>{remaining.map((x) => <SuggestionRow key={x.blockId} s={x} review={review} onDone={onDone(x.blockId)} />)}</ul>
          )}
        </section>
      )}

      {/* 5. Decisions */}
      <section className={`${card} space-y-2`} aria-labelledby="mr-dec">
        <h2 id="mr-dec" className={h2}>Decisions taken ({d.decisions.length})</h2>
        {d.decisions.length === 0 ? (
          <p className="text-[13.5px] text-muted">No decisions were recorded in this meeting.</p>
        ) : (
          <ol className="space-y-2">
            {d.decisions.map((x, i) => (
              <li key={x.id} className="flex gap-3 text-[14px]">
                <span className="w-6 shrink-0 font-semibold text-muted">{i + 1}.</span>
                <span className="min-w-0">
                  <Link href={`/meet/decisions/${x.id}`} className="font-medium text-foreground hover:underline">{x.text}</Link>
                  <span className="block text-[12.5px] text-muted">{x.code}{x.by ? ` · decided by ${x.by}` : ""}{x.point ? ` · on ${x.point}` : ""}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 6. Who does what */}
      <section className={`${card} space-y-3`} aria-labelledby="mr-who">
        <h2 id="mr-who" className={h2}>Who does what</h2>
        {d.byPerson.length === 0 ? (
          <p className="text-[13.5px] text-muted">No points or tasks were assigned.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {d.byPerson.map((p) => (
              <div key={p.name} className="rounded-lg border border-border p-3.5">
                <p className="text-[14.5px] font-semibold text-heading">{p.name}</p>
                <p className="mb-2 text-[12.5px] text-muted">{p.points.length} point{p.points.length === 1 ? "" : "s"} · {p.tasks.length} task{p.tasks.length === 1 ? "" : "s"}</p>
                <ul className="space-y-1 text-[13.5px]">
                  {p.tasks.map((t) => (
                    <li key={t.code} className="text-foreground"><span className="font-semibold text-primary">Task</span> {t.title} <span className="text-muted">· by {due(t.due)}</span></li>
                  ))}
                  {p.points.map((x) => (
                    <li key={x.code} className="text-foreground"><span className="font-semibold text-subtle">Point</span> {x.title} <span className="text-muted">· {String(x.status).replace(/_/g, " ")}{x.due ? ` · due ${due(x.due)}` : ""}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7. Action items */}
      <section className={`${card} overflow-x-auto`} aria-labelledby="mr-act">
        <h2 id="mr-act" className={`${h2} mb-2`}>Action items ({d.tasks.length})</h2>
        {d.tasks.length === 0 ? (
          <p className="text-[13.5px] text-muted">No tasks were created in this meeting.</p>
        ) : (
          <table className="w-full min-w-[620px] border-collapse text-[14px]">
            <thead>
              <tr className="bg-sunken text-left text-[12.5px] font-semibold text-subtle">
                <th className="px-3 py-2">#</th><th className="px-3 py-2">Task</th><th className="px-3 py-2">Owner</th><th className="px-3 py-2">Due</th><th className="px-3 py-2">Point</th><th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {d.tasks.map((t, i) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2 text-muted">{i + 1}</td>
                  <td className="px-3 py-2"><Link href={`/meet/tasks/${t.id}`} className="font-medium text-foreground hover:underline">{t.title}</Link></td>
                  <td className="px-3 py-2 text-subtle">{t.owner || <span className="text-warning-text">Not assigned</span>}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-subtle">{due(t.due)}</td>
                  <td className="px-3 py-2 text-subtle">{t.point || "—"}</td>
                  <td className="px-3 py-2 capitalize text-subtle">{t.status.replace(/_/g, " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 8. Point by point */}
      {m && (m.items_json || []).length > 0 && (
        <section className={card} aria-labelledby="mr-items">
          <h2 id="mr-items" className={`${h2} mb-3`}>What was discussed, point by point</h2>
          <ol className="space-y-4">
            {(m.items_json || []).map((it) => (
              <li key={it.point_id} className="text-[14px]">
                <div className="font-semibold text-heading">
                  <Link href={`/meet/points/${it.point_id}`} className="mr-2 text-primary hover:underline">{it.point_code}</Link>
                  {it.title}
                </div>
                <p className="mt-1 leading-relaxed text-foreground">{it.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 9. Closed and open */}
      <div className="grid gap-5 md:grid-cols-2">
        <section className={`${card} space-y-2`} aria-labelledby="mr-res">
          <h2 id="mr-res" className={h2}>Closed in this meeting ({resolved.length})</h2>
          {resolved.length === 0 ? <p className="text-[13.5px] text-muted">None.</p> : resolved.map((p) => (
            <p key={p.id} className="text-[13.5px] text-success-text">{p.code} {p.title}</p>
          ))}
        </section>
        <section className={`${card} space-y-2`} aria-labelledby="mr-carry">
          <h2 id="mr-carry" className={h2}>{nextLabel ? "Goes to the next meeting" : "Still open"} ({carried.length})</h2>
          {carried.length === 0 ? <p className="text-[13.5px] text-muted">Nothing left open.</p> : carried.map((p) => (
            <p key={p.id} className="text-[13.5px] text-foreground">{p.code} {p.title}{p.owner ? <span className="text-muted"> · {p.owner}</span> : null}</p>
          ))}
          <p className="text-[12.5px] text-muted">{nextLabel ? `On the agenda of ${nextLabel} automatically.` : "No next meeting is booked; these stay open in Points until closed."}</p>
        </section>
      </div>

      {/* 10. Attendance */}
      <section className={`${card} space-y-2`} aria-labelledby="mr-att">
        <h2 id="mr-att" className={h2}>Attendance ({d.totals.present} of {d.totals.invited})</h2>
        <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {d.attendance.map((a, i) => (
            <li key={`${a.name}-${i}`} className="flex flex-wrap justify-between gap-2 text-[13.5px]">
              <span className="text-foreground">{a.name}</span>
              <span className={a.status === "present" || a.status === "late" ? "text-success-text" : "text-muted"}>
                {ATT[a.status] || a.status}
                {a.joinedAt ? ` · joined ${a.joinedAt}` : ""}
                {a.note ? ` (${a.note})` : ""}
                {a.reason && a.status !== "present" && a.status !== "late" ? ` · ${a.reason}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 11. Next meeting */}
      <section className={`${card}`} aria-label="Next meeting">
        <p className="text-[14px] text-foreground"><span className="font-semibold text-heading">Next meeting: </span>{nextLabel || "Not booked yet"}</p>
      </section>

      {/* 12. Email version */}
      <section className={`${card} space-y-2 print:hidden`} aria-labelledby="mr-mail">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="mr-mail" className={h2}>Minutes as an email</h2>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(email).then(() => toast.success("Copied. Paste it into Outlook.")).catch(() => toast.error("Couldn't copy."))}
            className={btnSecondary}
          >
            Copy email
          </button>
        </div>
        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md bg-sunken p-4 font-sans text-[13.5px] leading-relaxed text-foreground">{email}</pre>
      </section>
    </div>
  );
}
