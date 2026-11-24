"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { setDecisionReview, withdrawDecision, addDecisionTask } from "@/lib/actions/meet/decision-detail";
import { supersedeDecision } from "@/lib/actions/meet/decisions";
import PersonPicker, { type PickPerson } from "@/components/meet/PersonPicker";

const input = "h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none";
const area = "w-full rounded-md border border-border bg-surface p-2.5 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none";
const btn = "inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-[14px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50";
const btn2 = "inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-[14px] font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50";

/** Next steps for a decision: review date, follow-up task, replace, withdraw. */
export default function DecisionDetailClient({ id, status, reviewDate, sessionId, canManage, users }: { id: string; status: string; reviewDate: string; sessionId: string | null; canManage: boolean; users: PickPerson[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rev, setRev] = useState(reviewDate);
  const [taskTitle, setTaskTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [days, setDays] = useState(3);
  const [newText, setNewText] = useState("");
  const [reason, setReason] = useState("");
  const active = status === "active";

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok: string, reset?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.success) { toast.error(r.error || "Something went wrong."); return; }
      toast.success(ok);
      reset?.();
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <section className="theme-card-structural space-y-3 p-5" aria-labelledby="nx-task">
        <h2 id="nx-task" className="text-[15px] font-semibold text-heading">Ask someone to act on it</h2>
        <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="What they must do, e.g. Update dealer credit limits in SAP" className={input} />
        <div className="grid grid-cols-[1fr_80px] gap-2">
          <PersonPicker people={users} value={owner} onChange={setOwner} placeholder="Owner" />
          <input type="number" min={1} max={60} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Days to finish" className={input} />
        </div>
        <button disabled={pending || taskTitle.trim().length < 3} onClick={() => run(() => addDecisionTask({ id, title: taskTitle, ownerId: owner || undefined, days }), "Task created for them", () => { setTaskTitle(""); setOwner(""); })} className={btn}>Assign action</button>
      </section>

      {canManage && active && (
        <>
          <section className="theme-card-structural space-y-3 p-5" aria-labelledby="nx-rev">
            <h2 id="nx-rev" className="text-[15px] font-semibold text-heading">Review date</h2>
            <p className="text-[13px] text-muted">The decision shows as "Review due" from this date, so it's looked at again.</p>
            <input type="date" value={rev} onChange={(e) => setRev(e.target.value)} className={input} aria-label="Review date" />
            <div className="flex flex-wrap gap-2">
              <button disabled={pending || !rev} onClick={() => run(() => setDecisionReview({ id, reviewDate: rev }), "Review date set")} className={btn2}>Save date</button>
              {reviewDate && <button disabled={pending} onClick={() => run(() => setDecisionReview({ id, reviewDate: null, note: "Still valid" }), "Marked as reviewed", () => setRev(""))} className={btn2}>Reviewed, still valid</button>}
            </div>
          </section>

          {sessionId && (
            <section className="theme-card-structural space-y-3 p-5" aria-labelledby="nx-rep">
              <h2 id="nx-rep" className="text-[15px] font-semibold text-heading">Replace with a new decision</h2>
              <textarea value={newText} onChange={(e) => setNewText(e.target.value)} rows={2} placeholder="The new decision" className={area} />
              <button disabled={pending || newText.trim().length < 3} onClick={() => run(async () => { const r: any = await supersedeDecision({ oldDecisionId: id, sessionId, text: newText.trim() }); if (r?.success && r.decision?.id) router.push(`/meet/decisions/${r.decision.id}`); return r; }, "Decision replaced")} className={btn2}>Replace</button>
            </section>
          )}

          <section className="theme-card-structural space-y-3 p-5" aria-labelledby="nx-wd">
            <h2 id="nx-wd" className="text-[15px] font-semibold text-heading">Withdraw</h2>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Why it no longer applies" className={area} />
            <button disabled={pending || reason.trim().length < 3} onClick={() => run(() => withdrawDecision({ id, reason }), "Decision withdrawn")} className={btn2}>Withdraw decision</button>
          </section>
        </>
      )}
    </div>
  );
}
