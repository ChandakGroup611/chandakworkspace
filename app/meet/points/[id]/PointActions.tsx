"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { updatePointStatus } from "@/lib/actions/meet/points";
import { changePointDueDate } from "@/lib/actions/meet/points-view";

const STATUSES = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "on_hold", label: "On hold" },
  { id: "closed", label: "Closed" },
  { id: "dropped", label: "Dropped" },
  { id: "reopened", label: "Reopened" },
];

const field = "h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-foreground focus:border-primary focus:outline-none disabled:opacity-60";
const btn = "inline-flex h-10 items-center justify-center rounded-md px-4 text-[14px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

/** Status + progress, and the due-date change that needs a reason (Zoho "Reason for update"). */
export default function PointActions({
  pointId,
  status,
  progress,
  dueDate,
  canEdit,
}: {
  pointId: string;
  status: string;
  progress: number;
  dueDate: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newStatus, setNewStatus] = useState(status);
  const [newProgress, setNewProgress] = useState(progress);
  const [remarks, setRemarks] = useState("");
  const [newDue, setNewDue] = useState(dueDate ? String(dueDate).slice(0, 10) : "");
  const [reason, setReason] = useState("");

  const needsRemarks = newStatus !== status && ["closed", "dropped", "on_hold"].includes(newStatus);
  const statusChanged = newStatus !== status || newProgress !== progress;
  const dueChanged = !!newDue && newDue !== (dueDate ? String(dueDate).slice(0, 10) : "");

  const saveStatus = () => {
    if (needsRemarks && remarks.trim().length < 3) {
      toast.warning(newStatus === "closed" ? "Add closing remarks." : newStatus === "dropped" ? "Say why it's dropped." : "Say why it's on hold.");
      return;
    }
    startTransition(async () => {
      const res: any = await updatePointStatus({
        pointId,
        status: newStatus as any,
        progressPercent: newProgress,
        closureRemarks: remarks.trim() || undefined,
      });
      if (res?.success === false || res?.error) {
        toast.error(res?.error || "Couldn't update the point.");
        return;
      }
      toast.success("Point updated.");
      setRemarks("");
      router.refresh();
    });
  };

  const saveDue = () => {
    if (reason.trim().length < 3) {
      toast.warning("A reason is needed whenever the due date changes.");
      return;
    }
    startTransition(async () => {
      const res = await changePointDueDate({ pointId, newDueDate: newDue, reason });
      if (!res.success) {
        toast.error(res.error || "Couldn't change the date.");
        return;
      }
      toast.success("Due date changed.");
      setReason("");
      router.refresh();
    });
  };

  if (!canEdit) {
    return <p className="text-[13px] text-muted">Only the owner, the organiser or the chair can change this point.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="pa-status" className="text-[13px] font-semibold text-subtle">Status</label>
          <select id="pa-status" className={field} value={newStatus} onChange={(e) => setNewStatus(e.target.value)} disabled={isPending}>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pa-progress" className="text-[13px] font-semibold text-subtle">Progress: {newProgress}%</label>
          <input
            id="pa-progress"
            type="range"
            min={0}
            max={100}
            step={10}
            value={newProgress}
            onChange={(e) => setNewProgress(Number(e.target.value))}
            disabled={isPending}
            className="h-10 w-full accent-[var(--color-primary)]"
          />
        </div>
      </div>
      {needsRemarks && (
        <div className="space-y-1.5">
          <label htmlFor="pa-remarks" className="text-[13px] font-semibold text-subtle">
            {newStatus === "closed" ? "Closing remarks" : newStatus === "dropped" ? "Why is it dropped?" : "Why is it on hold?"} <span className="text-danger-text">*</span>
          </label>
          <textarea id="pa-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} className={`${field} h-20 py-2`} disabled={isPending} />
          {newStatus === "closed" && <p className="text-[12.5px] text-muted">Closing a point also completes its open action items.</p>}
        </div>
      )}
      <div className="flex justify-end">
        <button type="button" onClick={saveStatus} disabled={!statusChanged || isPending} className={`${btn} bg-primary text-primary-foreground hover:bg-primary-hover`}>
          {isPending ? "Saving…" : "Save status"}
        </button>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
          <div className="space-y-1.5">
            <label htmlFor="pa-due" className="text-[13px] font-semibold text-subtle">Due date</label>
            <input id="pa-due" type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className={field} disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="pa-reason" className="text-[13px] font-semibold text-subtle">
              Reason for new date {dueChanged && <span className="text-danger-text">*</span>}
            </label>
            <input
              id="pa-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Distributor asked for changes to the credit clause"
              className={field}
              disabled={isPending || !dueChanged}
            />
          </div>
        </div>
        <p className="text-[12.5px] text-muted">A reason is needed every time the due date moves. It shows on the point's timeline.</p>
        <div className="flex justify-end">
          <button type="button" onClick={saveDue} disabled={!dueChanged || isPending} className={`${btn} border border-border bg-surface text-foreground hover:bg-surface-hover`}>
            Change due date
          </button>
        </div>
      </div>
    </div>
  );
}
