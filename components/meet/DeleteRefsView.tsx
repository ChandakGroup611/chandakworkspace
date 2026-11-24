"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import type { RefItem } from "@/lib/actions/meet/delete-refs";

export interface RefSection {
  key: string;
  step: number;
  title: string;
  hint: string;
  items: RefItem[];
  hrefBase: string;
  removeLabel: string;
  blocking: boolean;
}

/**
 * Delete page body: a reason, then everything that depends on the record, in the order it has
 * to go. Items can be removed one by one; the final delete unlocks when nothing blocking is left,
 * or "Remove everything in order" does it all at once.
 */
export default function DeleteRefsView({
  what,
  sections,
  notes,
  canDelete,
  onRemove,
  onDelete,
  doneHref,
}: {
  what: string;
  sections: RefSection[];
  notes?: string[];
  canDelete: boolean;
  onRemove: (kind: string, id: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  onDelete: (reason: string, removeAll: boolean) => Promise<{ success: boolean; error?: string }>;
  doneHref: string;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [confirmAll, setConfirmAll] = useState(false);
  const left = (s: RefSection) => s.items.filter((i) => !gone.has(i.id));
  const blockingLeft = sections.filter((s) => s.blocking).reduce((n, s) => n + left(s).length, 0);
  const total = sections.reduce((n, s) => n + left(s).length, 0);
  const reasonOk = reason.trim().length >= 3;

  const remove = (kind: string, id: string) => {
    if (!reasonOk) { toast.warning("Write the reason at the top first."); return; }
    start(async () => {
      const r = await onRemove(kind, id, reason);
      if (!r.success) { toast.error(r.error || "Couldn't remove it."); return; }
      setGone((g) => new Set(g).add(id));
      toast.success("Removed");
    });
  };
  const finish = (removeAll: boolean) =>
    start(async () => {
      const r = await onDelete(reason, removeAll);
      if (!r.success) { toast.error(r.error || "Couldn't delete."); return; }
      toast.success(`${what} deleted`);
      router.push(doneHref);
      router.refresh();
    });

  if (!canDelete) {
    return <p className="theme-card-structural p-5 text-[14px] text-danger-text">Only the organiser or a Meet admin can delete this {what.toLowerCase()}.</p>;
  }

  return (
    <div className="space-y-5">
      <section className="theme-card-structural space-y-2 border-danger-border p-5">
        <p className="flex items-start gap-2 text-[14px] text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger-text" aria-hidden />
          <span>
            {total ? `This ${what.toLowerCase()} is linked to ${total} other record${total === 1 ? "" : "s"}, listed below in the order they have to go.` : `Nothing else is linked to this ${what.toLowerCase()}.`}{" "}
            Deleted items are hidden everywhere but kept in the history with your reason.
          </span>
        </p>
        <label htmlFor="del-reason" className="block text-[13px] font-semibold text-foreground">Reason <span className="text-danger-text">*</span></label>
        <textarea id="del-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Created by mistake / merged into another meeting" className="w-full rounded-md border border-border bg-surface p-2.5 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none" />
      </section>

      {sections.map((s) => {
        const items = left(s);
        return (
          <section key={s.key} className="theme-card-structural space-y-2 p-5" aria-labelledby={`del-${s.key}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id={`del-${s.key}`} className="text-[15px] font-semibold text-heading">Step {s.step}. {s.title} ({items.length})</h2>
              {items.length === 0 && <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-success-text"><CheckCircle2 className="h-4 w-4" aria-hidden /> Nothing left</span>}
            </div>
            <p className="text-[12.5px] text-muted">{s.hint}</p>
            {items.length > 0 && (
              <ul className="divide-y divide-border rounded-md border border-border">
                {items.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                    <Link href={`${s.hrefBase}${i.id}`} target="_blank" className="min-w-0 text-[14px] text-foreground hover:underline">
                      {i.code && <span className="mr-1.5 font-semibold text-primary">{i.code}</span>}
                      {i.title}
                      <span className="block text-[12px] text-muted">{[i.detail, String(i.status).replace(/_/g, " ")].filter(Boolean).join(" · ")}</span>
                    </Link>
                    <button type="button" disabled={pending} onClick={() => remove(s.key, i.id)} className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface px-3 text-[13px] font-semibold text-danger-text hover:bg-surface-hover disabled:opacity-50">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden /> {s.removeLabel}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {notes && notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted">{notes.map((n) => <li key={n}>{n}</li>)}</ul>
      )}

      <section className="theme-card-structural flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-[14px] text-foreground">
          {blockingLeft ? `${blockingLeft} item${blockingLeft === 1 ? "" : "s"} still linked. Remove them above, or remove everything in order.` : `Ready to delete the ${what.toLowerCase()}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          {blockingLeft > 0 && (
            confirmAll ? (
              <button type="button" disabled={pending || !reasonOk} onClick={() => finish(true)} className="inline-flex h-10 items-center rounded-md bg-danger-solid px-4 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
                Yes, remove all {total} and delete
              </button>
            ) : (
              <button type="button" disabled={pending || !reasonOk} onClick={() => setConfirmAll(true)} className="inline-flex h-10 items-center rounded-md border border-danger-border bg-surface px-4 text-[14px] font-semibold text-danger-text hover:bg-surface-hover disabled:opacity-50">
                Remove everything in order
              </button>
            )
          )}
          <button type="button" disabled={pending || !reasonOk || blockingLeft > 0} onClick={() => finish(false)} className="inline-flex h-10 items-center rounded-md bg-danger-solid px-4 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
            Delete {what.toLowerCase()}
          </button>
        </div>
      </section>
    </div>
  );
}
