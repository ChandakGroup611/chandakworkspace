"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, RotateCcw, AlertTriangle, X, ArrowRight, Loader2 } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";
import { endSessionAndCarryForward } from "@/lib/actions/meet/sessions";
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

export function EndSessionModal({
  open,
  onOpenChange,
  sessionId,
  sessionCode,
  points,
}: EndSessionModalProps) {
  const router = useRouter();
  const [summaryNotes, setSummaryNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openLoopsCount, setOpenLoopsCount] = useState(0);
  // After the meeting is ended: a short checklist instead of a dialog that looks frozen
  const [progress, setProgress] = useState<null | { carried: number; open: number; nextNo: number | null; drafting: "running" | "done" | "failed" }>(null);

  // Check open loops on open
  React.useEffect(() => {
    if (open) {
      import("@/lib/actions/meet/notes").then(({ getOrCreateSessionNotes }) => {
        getOrCreateSessionNotes(sessionId).then((n) => {
          if (n) setOpenLoopsCount(n.open_loops_count || 0);
        });
      });
    }
  }, [open, sessionId]);

  const openPoints = points.filter((p) => p.status !== "closed" && p.status !== "dropped");
  const closedPoints = points.filter((p) => p.status === "closed" || p.status === "dropped");
  const escalatedPoints = openPoints.filter((p) => (p.carry_forward_count || 0) + 1 >= 3);

  const handleConfirmEnd = async () => {
    try {
      setIsSubmitting(true);
      const res = await endSessionAndCarryForward(sessionId, summaryNotes);

      if (res.success) {
        setProgress({ carried: res.carriedCount || 0, open: (res as any).stillOpenCount || 0, nextNo: res.nextSessionNo ?? null, drafting: "running" });
        // Draft the minutes automatically, then open the review screen
        let drafted = true;
        try {
          const { generateAIMinutes } = await import("@/lib/actions/meet/ai-minutes");
          const g: any = await generateAIMinutes(sessionId);
          if (g && g.success === false) drafted = false;
        } catch {
          drafted = false; // the review screen has a "Draft minutes" button
        }
        setProgress((p) => (p ? { ...p, drafting: drafted ? "done" : "failed" } : p));
        await new Promise((r) => setTimeout(r, drafted ? 500 : 1200));
        onOpenChange(false);
        router.push(`/meet/sessions/${sessionId}/review`);
      } else {
        toast.error(res.error || "Failed to finalize session");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize session");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
          {progress ? (
            <div role="status" aria-live="polite" className="space-y-4">
              <Dialog.Title className="text-[17px] font-semibold text-heading">Ending the meeting</Dialog.Title>
              <Dialog.Description className="sr-only">Progress after ending the meeting</Dialog.Description>
              <ul className="space-y-3 text-[14px]">
                <li className="flex items-center gap-2.5 text-success-text">
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> Meeting ended
                </li>
                <li className="flex items-center gap-2.5 text-success-text">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  {progress.carried > 0
                    ? `${progress.carried} open point${progress.carried === 1 ? "" : "s"} carried to ${progress.nextNo ? `session ${progress.nextNo}` : "the next meeting"}`
                    : progress.open > 0
                      ? `${progress.open} open point${progress.open === 1 ? "" : "s"} stay open in Points & tasks (one-off meeting)`
                      : "No open points to carry forward"}
                </li>
                <li className={`flex items-center gap-2.5 ${progress.drafting === "failed" ? "text-warning-text" : progress.drafting === "done" ? "text-success-text" : "font-semibold text-foreground"}`}>
                  {progress.drafting === "running" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
                  ) : progress.drafting === "done" ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                  ) : (
                    <AlertTriangle className="h-4 w-4" aria-hidden />
                  )}
                  {progress.drafting === "running" ? "Drafting the minutes…" : progress.drafting === "done" ? "Minutes drafted" : "Couldn't draft the minutes; you can draft them on the next screen"}
                </li>
              </ul>
              <p className="text-[13px] text-muted">The minutes review opens next.</p>
            </div>
          ) : (
          <>
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              <Dialog.Title className="text-[17px] font-semibold text-heading">
                End the meeting?
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[12.5px] text-muted">
                {sessionCode} · Open points stay open until they're closed
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="rounded p-1 text-muted hover:bg-sunken hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="my-5 space-y-4">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-success-border bg-success-soft p-3.5 text-center">
                <span className="text-[20px] font-bold text-success-text">{closedPoints.length}</span>
                <p className="mt-0.5 text-[12px] font-medium text-success-text">Closed in this meeting</p>
              </div>

              <div className="rounded-lg border border-warning-border bg-warning-soft p-3.5 text-center">
                <span className="text-[20px] font-bold text-warning-text">{openPoints.length}</span>
                <p className="mt-0.5 text-[12px] font-medium text-warning-text">Still open</p>
              </div>
            </div>

            {escalatedPoints.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-danger-border bg-danger-soft p-3 text-[12.5px] text-danger-text">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">{escalatedPoints.length} point{escalatedPoints.length > 1 ? "s" : ""} carried 3 times or more</span>
                  <p className="mt-0.5">
                    These will be flagged to management.
                  </p>
                </div>
              </div>
            )}

            {openLoopsCount > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-warning-border bg-warning-soft p-3 text-[12.5px] text-warning-text">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-warning-text" />
                <div>
                  <span className="font-semibold">{openLoopsCount} note line{openLoopsCount > 1 ? "s" : ""} to check</span>
                  <p className="mt-0.5 text-[12px] text-warning-text">
                    They look like action items. You can turn them into tasks on the minutes review, or discard them.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[12.5px] font-medium text-foreground mb-1">
                Closing remarks (optional, goes into the minutes)
              </label>
              <textarea
                value={summaryNotes}
                onChange={(e) => setSummaryNotes(e.target.value)}
                rows={3}
                placeholder="What was agreed overall, or anything to look at next time"
                className="w-full rounded-md border border-border bg-background p-2.5 text-[13px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
            <AppButton
              type="button"
              variant="outline"
              size="md"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
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
