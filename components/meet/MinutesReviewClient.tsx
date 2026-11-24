"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Sparkles, Loader2, CheckCircle2, RotateCcw, Send, ChevronLeft } from "lucide-react";
import { generateAIMinutes, updateAIMinutes, approveAndSendMoM } from "@/lib/actions/meet/ai-minutes";
import { convertBlockToItem, updateNoteBlock } from "@/lib/actions/meet/notes";
import type { MinutesReview, ReviewSuggestion } from "@/lib/actions/meet/review";

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
  const when = new Date(review.session.scheduledStart).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric" });

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
      toast.success(`Minutes approved and sent to ${res.sentCount} people.`);
      router.refresh();
    });

  const onDone = (id: string) => (msg: string) => {
    toast.success(msg);
    setGone((g) => new Set(g).add(id));
    router.refresh();
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
        <Link
          href={review.session.meetingId ? `/meet/meetings/${review.session.meetingId}` : "/meet"}
          className="inline-flex items-center gap-1 text-[13.5px] font-medium text-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> {review.session.meetingCode ? `${review.session.meetingCode} ` : ""}
          {review.session.meetingTitle}
        </Link>
        <h1 className="text-[20px] font-bold text-heading">Minutes · {when}</h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
            sent ? "bg-success-soft text-success-text" : m ? "bg-warning-soft text-warning-text" : "bg-sunken text-subtle"
          }`}
        >
          {sent ? "Sent" : m ? "Draft · waiting for approval" : "Not drafted yet"}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href={`/meet/sessions/${review.session.id}`} className={btnSecondary}>Open meeting workspace</Link>
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

      {/* What the draft is built from */}
      <section aria-label="What the minutes use" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { n: review.counts.points, l: "points discussed" },
          { n: review.counts.tasks, l: "action items" },
          { n: review.counts.decisions, l: "decisions" },
          { n: review.counts.noteLines, l: "note lines" },
          { n: `${review.counts.present}/${review.counts.invited}`, l: "attended" },
        ].map((c) => (
          <div key={c.l} className="theme-card-structural flex items-baseline gap-2 p-3.5">
            <span className="text-[20px] font-bold text-primary">{c.n}</span>
            <span className="text-[12.5px] text-subtle">{c.l}</span>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-[999_1_560px] space-y-5">
          {/* Summary */}
          <section className="theme-card-structural space-y-3 p-5" aria-labelledby="mr-sum">
            <div className="flex items-center justify-between gap-2">
              <h2 id="mr-sum" className="flex items-center gap-2 text-[16px] font-semibold text-heading">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Summary
              </h2>
              {m?.model && <span className="text-[12px] text-muted">{m.model === "offline-synthesis" ? "Drafted from meeting data" : `Drafted with AI (${m.model})`}</span>}
            </div>
            {m ? (
              <>
                <label htmlFor="mr-overview" className="sr-only">Summary</label>
                <textarea
                  id="mr-overview"
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  readOnly={!review.canEdit || sent}
                  className="min-h-[110px] w-full resize-y rounded-md border border-border bg-surface p-3 text-[14.5px] leading-relaxed text-foreground focus:border-primary focus:outline-none"
                />
                {review.canEdit && !sent && overview !== savedOverview && (
                  <div className="flex justify-end">
                    <button type="button" onClick={saveOverview} disabled={pending} className={btnSecondary}>Save summary</button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg bg-sunken p-5 text-center">
                <p className="text-[14px] text-subtle">No draft yet. It's built from the points, action items, decisions and notes captured in the meeting.</p>
                {review.canEdit && (
                  <button type="button" onClick={generate} disabled={pending} className={`${btnPrimary} mt-3`}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />} Draft minutes now
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Suggestions */}
          {review.canEdit && !sent && (
            <section className="theme-card-structural overflow-hidden p-0" aria-labelledby="mr-sug">
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                <h2 id="mr-sug" className="text-[16px] font-semibold text-heading">Found in the notes. Keep what's right.</h2>
                <span className="text-[13px] text-subtle">{remaining.length} to review</span>
              </div>
              {remaining.length === 0 ? (
                <p className="flex items-center gap-2 border-t border-border px-5 py-4 text-[13.5px] text-subtle">
                  <CheckCircle2 className="h-4 w-4 text-success-text" aria-hidden /> Nothing left to review. Every action line in the notes is either added or discarded.
                </p>
              ) : (
                <ul>
                  {remaining.map((s) => (
                    <SuggestionRow key={s.blockId} s={s} review={review} onDone={onDone(s.blockId)} />
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Per-point minutes */}
          {m && (m.items_json || []).length > 0 && (
            <section className="theme-card-structural p-5" aria-labelledby="mr-items">
              <h2 id="mr-items" className="mb-3 text-[16px] font-semibold text-heading">Point by point</h2>
              <ol className="space-y-4">
                {(m.items_json || []).map((it) => (
                  <li key={it.point_id} className="text-[14px]">
                    <div className="font-semibold text-heading">
                      <Link href={`/meet/points/${it.point_id}`} className="mr-2 text-primary hover:underline">{it.point_code}</Link>
                      {it.title}
                    </div>
                    <p className="mt-1 leading-relaxed text-foreground">{it.text}</p>
                    {(it.tasks || []).length > 0 && (
                      <ul className="mt-1 list-disc pl-5 text-[13.5px] text-subtle">
                        {(it.tasks || []).map((t, i) => <li key={i}>{t.title} · {t.owner}{t.due_date ? ` · due ${t.due_date}` : ""}</li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="min-w-0 flex-[1_1_300px] space-y-5">
          <section className="theme-card-structural space-y-2 p-4" aria-labelledby="mr-res">
            <h2 id="mr-res" className="text-[15px] font-semibold text-heading">Resolved in this meeting ({resolved.length})</h2>
            {resolved.length === 0 ? <p className="text-[13.5px] text-muted">None.</p> : resolved.slice(0, 8).map((p) => (
              <p key={p.id} className="text-[13.5px] text-success-text">{p.code} {p.title}</p>
            ))}
          </section>
          <section className="theme-card-structural space-y-2 p-4" aria-labelledby="mr-carry">
            <h2 id="mr-carry" className="text-[15px] font-semibold text-heading">
              {review.nextSession ? "Goes to the next meeting" : "Still open"} ({carried.length})
            </h2>
            {carried.length === 0 ? <p className="text-[13.5px] text-muted">Nothing carried forward.</p> : carried.slice(0, 8).map((p) => (
              <p key={p.id} className="text-[13.5px] text-foreground">{p.code} {p.title}{p.owner ? <span className="text-muted"> · {p.owner}</span> : null}</p>
            ))}
            <p className="text-[12.5px] text-muted">
              {review.nextSession
                ? `They'll be on the agenda of ${new Date(review.nextSession.scheduledStart).toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short" })} automatically.`
                : "No next meeting is scheduled, so these stay open in Points & tasks until they're closed."}
            </p>
          </section>
          <section className="theme-card-structural space-y-1.5 p-4" aria-labelledby="mr-rules">
            <h2 id="mr-rules" className="text-[15px] font-semibold text-heading">How this works</h2>
            <p className="text-[13px] leading-relaxed text-subtle">
              Nothing is created until someone accepts it. Approving sends the minutes by email and in-app to everyone in the meeting, and saves each point's summary to its history.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
