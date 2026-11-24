"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CheckSquare, Square } from "lucide-react";
import { updateTaskStatus, toggleTaskChecklist, requestTaskExtension, decideTaskExtension } from "@/lib/actions/meet/tasks";
import { updateTaskProgress, reassignTask, type TaskDetail } from "@/lib/actions/meet/task-detail";
import PersonPicker, { type PickPerson } from "@/components/meet/PersonPicker";
import { shortDate, DueHint } from "@/components/meet/point-ui";
import type { TaskStatus } from "@/types/meet";

const STATUS: { id: TaskStatus; label: string }[] = [
  { id: "not_started", label: "Not started" },
  { id: "in_progress", label: "In progress" },
  { id: "on_hold", label: "On hold" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const input = "h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none";
const btn = "inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-[14px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50";
const btn2 = "inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-[14px] font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const ACTION: Record<string, string> = {
  status_changed: "Status changed",
  progress_updated: "Progress updated",
  reassigned: "Given to",
  extension_requested: "More time asked",
  extension_approved: "More time approved",
  extension_rejected: "More time refused",
  created: "Created",
  deleted: "Deleted",
};

export default function TaskDetailClient({ detail, users }: { detail: TaskDetail; users: PickPerson[] }) {
  const router = useRouter();
  const t = detail.task;
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState<number>(Number(t.progress_percent) || 0);
  const [note, setNote] = useState("");
  const [owner, setOwner] = useState("");
  const [addToMeeting, setAddToMeeting] = useState(true);
  const [extDate, setExtDate] = useState("");
  const [extReason, setExtReason] = useState("");
  const [checklist, setChecklist] = useState(detail.checklist);
  const due = t.revised_due_date || t.due_date;
  const done = t.status === "completed" || t.status === "cancelled";

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      if (!r.success) { toast.error(r.error || "Something went wrong."); return; }
      toast.success(ok);
      router.refresh();
    });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <section className="theme-card-structural grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <p className="text-[12.5px] font-medium text-muted">Owner</p>
            <p className="text-[15px] font-semibold text-foreground">{t.owner?.full_name || <span className="text-warning-text">No owner yet</span>}</p>
          </div>
          <div>
            <p className="text-[12.5px] font-medium text-muted">Due</p>
            <p className="text-[15px] font-semibold text-foreground">
              {shortDate(due)} <DueHint due={due} status={done ? "closed" : "open"} />
            </p>
            {t.revised_due_date && <p className="text-[12px] text-muted">First due {shortDate(t.due_date)}</p>}
          </div>
          <div>
            <p className="text-[12.5px] font-medium text-muted">Priority</p>
            <p className="text-[15px] font-semibold capitalize text-foreground">{t.priority}</p>
          </div>
          <div>
            <label htmlFor="st" className="text-[12.5px] font-medium text-muted">Status</label>
            <select
              id="st"
              value={t.status}
              disabled={!detail.canEdit || pending}
              onChange={(e) => run(() => updateTaskStatus({ taskId: t.id, status: e.target.value as TaskStatus }), "Status updated")}
              className={`${input} mt-1`}
            >
              {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          {t.description && (
            <div className="sm:col-span-2">
              <p className="text-[12.5px] font-medium text-muted">Details</p>
              <p className="whitespace-pre-wrap text-[14px] text-foreground">{t.description}</p>
            </div>
          )}
        </section>

        {detail.canEdit && !done && (
          <section className="theme-card-structural space-y-3 p-5" aria-labelledby="h-prog">
            <h2 id="h-prog" className="text-[15px] font-semibold text-heading">Update progress</h2>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="flex-1 accent-[var(--color-primary,#c2410c)]" aria-label="Progress" />
              <span className="w-12 text-right text-[15px] font-semibold text-foreground">{progress}%</span>
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Short note (optional), e.g. waiting on bank" className={input} />
            <button disabled={pending} onClick={() => run(() => updateTaskProgress({ taskId: t.id, progress, note }), "Progress saved")} className={btn}>Save progress</button>
          </section>
        )}

        {checklist.length > 0 && (
          <section className="theme-card-structural space-y-2 p-5" aria-labelledby="h-cl">
            <h2 id="h-cl" className="text-[15px] font-semibold text-heading">Checklist · {checklist.filter((c) => c.is_done).length}/{checklist.length}</h2>
            {checklist.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={!detail.canEdit}
                onClick={async () => {
                  setChecklist((l) => l.map((x) => (x.id === c.id ? { ...x, is_done: !x.is_done } : x)));
                  await toggleTaskChecklist(c.id, !c.is_done);
                }}
                className="flex w-full items-center gap-2 text-left text-[14px] text-foreground"
              >
                {c.is_done ? <CheckSquare className="h-4 w-4 text-success-text" /> : <Square className="h-4 w-4 text-muted" />}
                <span className={c.is_done ? "text-muted line-through" : ""}>{c.text}</span>
              </button>
            ))}
          </section>
        )}

        <section className="theme-card-structural space-y-2 p-5" aria-labelledby="h-act">
          <h2 id="h-act" className="text-[15px] font-semibold text-heading">History</h2>
          {detail.activity.length === 0 ? (
            <p className="text-[13.5px] text-muted">Nothing yet.</p>
          ) : (
            <ol className="space-y-2">
              {detail.activity.map((a) => (
                <li key={a.id} className="border-l-2 border-border pl-3 text-[13.5px]">
                  <span className="font-semibold text-foreground">{ACTION[a.action] || a.action.replace(/_/g, " ")}</span>
                  {a.new_value && <span className="text-subtle">: {String(a.new_value).replace(/_/g, " ")}</span>}
                  <span className="block text-[12px] text-muted">{a.by || "System"} · {when(a.at)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <aside className="space-y-5">
        {detail.canEdit && (
          <section className="theme-card-structural space-y-3 p-5" aria-labelledby="h-own">
            <h2 id="h-own" className="text-[15px] font-semibold text-heading">Give to someone else</h2>
            <PersonPicker people={users} value={owner} onChange={setOwner} />
            <label className="flex items-start gap-2 text-[13px] text-foreground">
              <input type="checkbox" checked={addToMeeting} onChange={(e) => setAddToMeeting(e.target.checked)} className="mt-0.5" />
              Also add them to the meeting if they aren't in it
            </label>
            <button disabled={!owner || pending} onClick={() => run(() => reassignTask({ taskId: t.id, ownerId: owner, addToMeeting }), "Task given to new owner")} className={btn}>Reassign</button>
          </section>
        )}

        {!done && (detail.isOwner || detail.canEdit) && (
          <section className="theme-card-structural space-y-3 p-5" aria-labelledby="h-ext">
            <h2 id="h-ext" className="text-[15px] font-semibold text-heading">Need more time?</h2>
            <input type="date" value={extDate} min={due || undefined} onChange={(e) => setExtDate(e.target.value)} className={input} aria-label="New due date" />
            <textarea value={extReason} onChange={(e) => setExtReason(e.target.value)} rows={2} placeholder="Reason" className="w-full rounded-md border border-border bg-surface p-3 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none" />
            <button
              disabled={!extDate || extReason.trim().length < 3 || pending}
              onClick={() => run(() => requestTaskExtension({ taskId: t.id, requestedDueDate: extDate, reason: extReason.trim() }), "Request sent to the organiser")}
              className={btn2}
            >
              Ask for more time
            </button>
          </section>
        )}

        {detail.extensions.length > 0 && (
          <section className="theme-card-structural space-y-3 p-5" aria-labelledby="h-exl">
            <h2 id="h-exl" className="text-[15px] font-semibold text-heading">Requests for more time</h2>
            {detail.extensions.map((e) => (
              <div key={e.id} className="rounded-md border border-border p-3 text-[13.5px]">
                <p className="font-semibold text-foreground">{shortDate(e.from)} → {shortDate(e.to)} <span className="ml-1 text-[12px] font-medium capitalize text-muted">{e.status}</span></p>
                <p className="text-subtle">{e.reason}</p>
                <p className="text-[12px] text-muted">{e.by} · {when(e.at)}</p>
                {e.status === "pending" && detail.canApprove && !e.mine && (
                  <div className="mt-2 flex gap-2">
                    <button disabled={pending} onClick={() => run(() => decideTaskExtension({ extensionId: e.id, approved: true }), "Approved")} className={btn}>Approve</button>
                    <button disabled={pending} onClick={() => run(() => decideTaskExtension({ extensionId: e.id, approved: false }), "Refused")} className={btn2}>Refuse</button>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </aside>
    </div>
  );
}
