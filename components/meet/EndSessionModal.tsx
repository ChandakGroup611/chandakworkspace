"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, AlertTriangle, X, ArrowRight, Loader2, Info, AlertCircle, UserCheck, UserX } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { endSessionAndCarryForward } from "@/lib/actions/meet/sessions";
import { getEndChecklist, type EndChecklist, type CheckLevel } from "@/lib/actions/meet/end-check";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import type { MeetingPoint } from "@/types/meet";

interface EndSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionCode: string;
  points: MeetingPoint[];
}

const LEVEL: Record<CheckLevel, { icon: React.ElementType; cls: string; label: string }> = {
  fix: { icon: AlertCircle, cls: "text-danger-text", label: "Fix" },
  check: { icon: AlertTriangle, cls: "text-warning-text", label: "Check" },
  tip: { icon: Info, cls: "text-info-text", label: "Tip" },
  ok: { icon: CheckCircle2, cls: "text-success-text", label: "OK" },
};

/**
 * End meeting: first a check of what was covered (per person and overall), then the meeting is
 * ended, open points move on, and the minutes are drafted. The meeting only counts as finished
 * once the minutes are approved and sent on the next screen.
 */
export function EndSessionModal({ open, onOpenChange, sessionId, sessionCode, points }: EndSessionModalProps) {
  const router = useRouter();
  const [summaryNotes, setSummaryNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [check, setCheck] = useState<EndChecklist | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [followUp, setFollowUp] = useState(false);
  const [followUpAt, setFollowUpAt] = useState("");
  const [progress, setProgress] = useState<null | { carried: number; open: number; nextNo: number | null; drafting: "running" | "done" | "failed" }>(null);

  React.useEffect(() => {
    if (!open) return;
    setCheck(null);
    setConfirmed(false);
    getEndChecklist(sessionId)
      .then((c) => {
        setCheck(c);
        setFollowUpAt(c.defaultFollowUp);
      })
      .catch(() => setCheck({ items: [], people: [], isOneOff: false, openPoints: 0, defaultFollowUp: "" }));
  }, [open, sessionId]);

  const openPoints = points.filter((p) => p.status !== "closed" && p.status !== "dropped");
  const closedPoints = points.filter((p) => p.status === "closed" || p.status === "dropped");
  const needsConfirm = !!check && check.items.some((i) => i.level === "fix" || i.level === "check") || !!check?.people.some((p) => !p.ok);
  const offerFollowUp = !!check?.isOneOff && (check?.openPoints || 0) > 0;

  const handleConfirmEnd = async () => {
    try {
      setIsSubmitting(true);
      const followUpStart = offerFollowUp && followUp && followUpAt ? new Date(`${followUpAt}:00+05:30`).toISOString() : null;
      const res = await endSessionAndCarryForward(sessionId, summaryNotes, { followUpStart });
      if (res.success) {
        setProgress({ carried: res.carriedCount || 0, open: (res as any).stillOpenCount || 0, nextNo: res.nextSessionNo ?? null, drafting: "running" });
        // Draft the summary and minutes straight away, then open the review screen
        let drafted = true;
        try {
          const { generateAIMinutes } = await import("@/lib/actions/meet/ai-minutes");
          const g: any = await generateAIMinutes(sessionId);
          if (g && g.success === false) drafted = false;
        } catch {
          drafted = false;
        }
        setProgress((p) => (p ? { ...p, drafting: drafted ? "done" : "failed" } : p));
        await new Promise((r) => setTimeout(r, drafted ? 500 : 1200));
        onOpenChange(false);
        router.push(`/meet/sessions/${sessionId}/review`);
      } else {
        toast.error(res.error || "Couldn't end the meeting");
      }
    } catch (err: any) {
      toast.error(err.message || "Couldn't end the meeting");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(94vw,640px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-surface shadow-xl animate-in fade-in-0 zoom-in-95">
          {progress ? (
            <div role="status" aria-live="polite" className="space-y-4 p-6">
              <Dialog.Title className="text-[17px] font-semibold text-heading">Ending the meeting</Dialog.Title>
              <Dialog.Description className="sr-only">Progress after ending the meeting</Dialog.Description>
              <ul className="space-y-3 text-[14px]">
                <li className="flex items-center gap-2.5 text-success-text">
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> Meeting ended
                </li>
                <li className="flex items-center gap-2.5 text-success-text">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  {progress.carried > 0
                    ? `${progress.carried} open point${progress.carried === 1 ? "" : "s"} moved to the next meeting`
                    : progress.open > 0
                      ? `${progress.open} open point${progress.open === 1 ? "" : "s"} stay open in Points`
                      : "No open points to move on"}
                </li>
                <li className={`flex items-center gap-2.5 ${progress.drafting === "failed" ? "text-warning-text" : progress.drafting === "done" ? "text-success-text" : "font-semibold text-foreground"}`}>
                  {progress.drafting === "running" ? <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden /> : progress.drafting === "done" ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <AlertTriangle className="h-4 w-4" aria-hidden />}
                  {progress.drafting === "running" ? "Writing the summary and minutes…" : progress.drafting === "done" ? "Summary and minutes drafted" : "Couldn't draft the minutes; you can draft them on the next screen"}
                </li>
              </ul>
              <p className="text-[13px] text-muted">Next: review the minutes and send them. The meeting counts as finished once the minutes are sent.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between border-b border-border px-6 pb-3 pt-5">
                <div>
                  <Dialog.Title className="text-[17px] font-semibold text-heading">Before you end the meeting</Dialog.Title>
                  <Dialog.Description className="mt-0.5 text-[12.5px] text-muted">{sessionCode} · Check that everyone's points and tasks are covered</Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button className="rounded p-1 text-muted hover:bg-sunken hover:text-foreground" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-success-border bg-success-soft p-3 text-center">
                    <span className="text-[20px] font-bold text-success-text">{closedPoints.length}</span>
                    <p className="mt-0.5 text-[12px] font-medium text-success-text">Closed in this meeting</p>
                  </div>
                  <div className="rounded-lg border border-warning-border bg-warning-soft p-3 text-center">
                    <span className="text-[20px] font-bold text-warning-text">{openPoints.length}</span>
                    <p className="mt-0.5 text-[12px] font-medium text-warning-text">Still open</p>
                  </div>
                </div>

                {!check ? (
                  <p className="flex items-center gap-2 text-[13.5px] text-muted"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking the meeting…</p>
                ) : (
                  <>
                    <section aria-labelledby="ec-h">
                      <h3 id="ec-h" className="mb-2 text-[14px] font-semibold text-heading">Checks</h3>
                      <ul className="space-y-2">
                        {check.items.map((it, i) => {
                          const L = LEVEL[it.level];
                          const Icon = L.icon;
                          return (
                            <li key={i} className="flex gap-2.5 rounded-md border border-border p-2.5">
                              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${L.cls}`} aria-hidden />
                              <div>
                                <p className="text-[13.5px] font-semibold text-foreground"><span className="sr-only">{L.label}: </span>{it.text}</p>
                                {it.detail && <p className="text-[12.5px] text-subtle">{it.detail}</p>}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>

                    {check.people.length > 0 && (
                      <section aria-labelledby="ep-h">
                        <h3 id="ep-h" className="mb-2 text-[14px] font-semibold text-heading">Person by person</h3>
                        <ul className="divide-y divide-border rounded-md border border-border">
                          {check.people.map((p) => (
                            <li key={p.user_id} className="flex gap-2.5 p-2.5">
                              {p.ok ? <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-text" aria-hidden /> : <UserX className="mt-0.5 h-4 w-4 shrink-0 text-warning-text" aria-hidden />}
                              <div className="min-w-0 flex-1">
                                <p className="text-[13.5px] font-semibold text-foreground">
                                  {p.name} <span className="font-normal text-muted">· {p.attendance === "present" || p.attendance === "late" ? "attended" : p.attendance}</span>
                                </p>
                                <p className="text-[12.5px] text-subtle">
                                  {p.open_points} open point{p.open_points === 1 ? "" : "s"} · {p.tasks_given} new task{p.tasks_given === 1 ? "" : "s"}
                                  {p.ok ? " · all covered" : ""}
                                </p>
                                {!p.ok && (
                                  <p className="text-[12.5px] text-warning-text">
                                    No update on: {p.points_without_update.slice(0, 3).map((x) => x.code).join(", ")}
                                    {p.points_without_update.length > 3 ? ` +${p.points_without_update.length - 3} more` : ""}
                                  </p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {offerFollowUp && (
                      <section className="rounded-md border border-border bg-sunken p-3">
                        <label className="flex items-start gap-2 text-[13.5px] font-medium text-foreground">
                          <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} className="mt-0.5" />
                          Book a follow-up meeting for the {check.openPoints} open point{check.openPoints === 1 ? "" : "s"}
                        </label>
                        {followUp && (
                          <input
                            type="datetime-local"
                            value={followUpAt}
                            onChange={(e) => setFollowUpAt(e.target.value)}
                            className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-foreground focus:border-primary focus:outline-none"
                            aria-label="Follow-up date and time"
                          />
                        )}
                        <p className="mt-1 text-[12px] text-muted">This was a one-off meeting. Without a follow-up, open points stay in the Points list until they're closed.</p>
                      </section>
                    )}
                  </>
                )}

                <div>
                  <label htmlFor="end-remarks" className="mb-1 block text-[12.5px] font-medium text-foreground">
                    Closing remarks <span className="font-normal text-muted">(optional, goes into the minutes)</span>
                  </label>
                  <textarea
                    id="end-remarks"
                    value={summaryNotes}
                    onChange={(e) => setSummaryNotes(e.target.value)}
                    rows={3}
                    placeholder="What was agreed overall, or anything to look at next time"
                    className="w-full rounded-md border border-border bg-background p-2.5 text-[13px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-[12px] text-muted">The summary and minutes are written for you right after you end. You review and send them on the next screen.</p>
                </div>

                {needsConfirm && (
                  <label className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-soft p-3 text-[13px] font-medium text-warning-text">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
                    I've seen the checks above and want to end the meeting anyway
                  </label>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border px-6 py-4">
                <AppButton type="button" variant="outline" size="md" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Go back and fix
                </AppButton>
                <AppButton
                  type="button"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  disabled={!check || (needsConfirm && !confirmed)}
                  onClick={handleConfirmEnd}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {isSubmitting ? "Ending…" : "End meeting"}
                </AppButton>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
