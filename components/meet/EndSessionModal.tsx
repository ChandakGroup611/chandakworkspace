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
        toast.success(
          `Meeting concluded! ${res.carriedCount} open items carried forward to Session ${res.nextSessionNo}`
        );
        onOpenChange(false);
        router.push(`/meet/sessions/${sessionId}`);
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
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div>
              <Dialog.Title className="text-[17px] font-semibold text-heading">
                Conclude Meeting & Carry Forward
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[12.5px] text-muted">
                {sessionCode} · Finalize session and carry forward unresolved items
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
                <p className="mt-0.5 text-[12px] font-medium text-success-text">Closed in this Session</p>
              </div>

              <div className="rounded-lg border border-warning-border bg-warning-soft p-3.5 text-center">
                <span className="text-[20px] font-bold text-warning-text">{openPoints.length}</span>
                <p className="mt-0.5 text-[12px] font-medium text-warning-text">Carried to Next Session</p>
              </div>
            </div>

            {escalatedPoints.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-danger-border bg-danger-soft p-3 text-[12.5px] text-danger-text">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">{escalatedPoints.length} Repeatedly Carried Points:</span>
                  <p className="mt-0.5">
                    Items carried 3+ times will be flagged for management escalation per Chandak Governance SOP.
                  </p>
                </div>
              </div>
            )}

            {openLoopsCount > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[12.5px] text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <span className="font-semibold">{openLoopsCount} Unconverted Open Loop{openLoopsCount > 1 ? "s" : ""}:</span>
                  <p className="mt-0.5 text-[12px] text-amber-200/90">
                    {openLoopsCount} note line{openLoopsCount > 1 ? "s" : ""} look like action items but have not been converted into tasks or points yet.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[12.5px] font-medium text-foreground mb-1">
                Executive Meeting Summary / Notes (Included in MoM)
              </label>
              <textarea
                value={summaryNotes}
                onChange={(e) => setSummaryNotes(e.target.value)}
                rows={3}
                placeholder="Key outcomes, overall consensus, or remarks for next review..."
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
              {isSubmitting ? "Finalizing…" : "Confirm & Conclude"}
            </AppButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
