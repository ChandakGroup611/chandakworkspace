"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import * as Dialog from "@radix-ui/react-dialog";
import { Archive, MoreHorizontal, RotateCcw, Trash2, X } from "lucide-react";
import { archiveMeeting, deleteMeeting, restoreMeeting } from "@/lib/actions/meet/meetings";

/** "More" menu on a meeting: archive / restore / delete (delete asks for a reason). */
export default function MeetingActions({ meetingId, title, archived, canDelete }: { meetingId: string; title: string; archived: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<any>, ok: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r?.success) { toast.error(r?.error || "Something went wrong."); return; }
      toast.success(ok);
      setOpen(false);
      after ? after() : router.refresh();
    });

  if (!canDelete) return null;
  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-[13.5px] text-foreground hover:bg-surface-hover";

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-hover"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-52 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg" onMouseLeave={() => setOpen(false)}>
          {archived ? (
            <button className={item} disabled={pending} onClick={() => run(() => restoreMeeting(meetingId), "Meeting restored")}>
              <RotateCcw className="h-4 w-4" /> Restore
            </button>
          ) : (
            <button className={item} disabled={pending} onClick={() => run(() => archiveMeeting(meetingId), "Meeting archived")}>
              <Archive className="h-4 w-4" /> Archive
            </button>
          )}
          <button className={`${item} text-danger-text`} onClick={() => { setOpen(false); router.push(`/meet/meetings/${meetingId}/delete`); }}>
            <Trash2 className="h-4 w-4" /> Delete meeting
          </button>
        </div>
      )}

      <Dialog.Root open={confirm} onOpenChange={setConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="text-[17px] font-semibold text-heading">Delete "{title}"?</Dialog.Title>
              <Dialog.Close className="rounded p-1 text-muted hover:bg-sunken hover:text-foreground" aria-label="Close"><X className="h-4 w-4" /></Dialog.Close>
            </div>
            <Dialog.Description className="mt-2 text-[13.5px] text-subtle">
              Upcoming dates are cancelled and their rooms freed. Minutes, points, tasks and decisions already recorded are kept in the history.
            </Dialog.Description>
            <label className="mt-4 block text-[13px] font-medium text-foreground">
              Reason <span className="text-danger-text">*</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                autoFocus
                placeholder="e.g. Created by mistake / merged into Weekly Sales Review"
                className="mt-1 w-full rounded-md border border-border bg-surface p-2.5 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-[14px] font-semibold text-foreground hover:bg-surface-hover">Keep it</Dialog.Close>
              <button
                disabled={pending || reason.trim().length < 3}
                onClick={() => run(() => deleteMeeting({ meetingId, reason }), "Meeting deleted", () => router.push("/meet/meetings"))}
                className="inline-flex h-10 items-center rounded-md bg-danger-solid px-4 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Delete meeting"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
