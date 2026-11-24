"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Check, HelpCircle, X } from "lucide-react";
import { replyToInvite, type RsvpPerson, type RsvpReply } from "@/lib/actions/meet/rsvp";
import PersonPicker, { type PickPerson } from "@/components/meet/PersonPicker";

/**
 * "Will you attend?" for the signed-in person, plus who is coming (with reasons from people
 * who can't). Shown on the meeting page for the next meeting date.
 */

const REPLY: Record<string, { label: string; cls: string }> = {
  accepted: { label: "Attending", cls: "bg-success-soft text-success-text" },
  tentative: { label: "Maybe", cls: "bg-warning-soft text-warning-text" },
  declined: { label: "Can't attend", cls: "bg-danger-soft text-danger-text" },
  invited: { label: "No reply yet", cls: "bg-sunken text-subtle" },
};

export function ReplyChip({ reply }: { reply: string | null | undefined }) {
  const r = REPLY[reply || "invited"] || REPLY.invited;
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${r.cls}`}>{r.label}</span>;
}

export default function RsvpPanel({
  sessionId,
  dateLabel,
  people,
  mine,
  canReply,
  users,
}: {
  sessionId: string;
  dateLabel: string;
  people: RsvpPerson[];
  mine: { reply: string; reason: string | null } | null;
  canReply: boolean;
  users: PickPerson[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [standIn, setStandIn] = useState("");

  const send = (reply: RsvpReply) =>
    start(async () => {
      const r = await replyToInvite({ sessionId, reply, reason: reply === "declined" ? reason : undefined, standInId: reply === "declined" ? standIn || undefined : undefined });
      if (!r.success) { toast.error(r.error || "Couldn't save your reply."); return; }
      toast.success(reply === "accepted" ? "You're attending" : reply === "tentative" ? "Saved as maybe" : "The organiser will see your reason");
      setDeclining(false);
      router.refresh();
    });

  const counts = people.reduce<Record<string, number>>((a, p) => ((a[p.reply] = (a[p.reply] || 0) + 1), a), {});
  const btn = "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[13.5px] font-semibold transition-colors disabled:opacity-50";

  return (
    <section className="theme-card-structural space-y-4 p-4" aria-labelledby="rsvp-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="rsvp-h" className="text-[15px] font-semibold text-heading">Who's coming · {dateLabel}</h2>
        <p className="text-[13px] text-muted">
          {counts.accepted || 0} attending · {counts.tentative || 0} maybe · {counts.declined || 0} can't · {counts.invited || 0} no reply
        </p>
      </div>

      {mine && canReply && (
        <div className="rounded-lg border border-border bg-sunken p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13.5px] font-medium text-foreground">Your reply:</span>
            <button disabled={pending} onClick={() => send("accepted")} className={`${btn} ${mine.reply === "accepted" ? "border-success-border bg-success-soft text-success-text" : "border-border bg-surface text-foreground hover:bg-surface-hover"}`}>
              <Check className="h-4 w-4" aria-hidden /> Attending
            </button>
            <button disabled={pending} onClick={() => send("tentative")} className={`${btn} ${mine.reply === "tentative" ? "border-warning-border bg-warning-soft text-warning-text" : "border-border bg-surface text-foreground hover:bg-surface-hover"}`}>
              <HelpCircle className="h-4 w-4" aria-hidden /> Maybe
            </button>
            <button disabled={pending} onClick={() => setDeclining((v) => !v)} className={`${btn} ${mine.reply === "declined" ? "border-danger-border bg-danger-soft text-danger-text" : "border-border bg-surface text-foreground hover:bg-surface-hover"}`}>
              <X className="h-4 w-4" aria-hidden /> Can't attend
            </button>
          </div>
          {mine.reply === "declined" && mine.reason && !declining && <p className="mt-2 text-[13px] text-subtle">Your reason: {mine.reason}</p>}
          {declining && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-[13px] font-medium text-foreground sm:col-span-2">
                Reason for not attending <span className="text-danger-text">*</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  autoFocus
                  placeholder="e.g. On a site visit at Indore that day"
                  className="mt-1 w-full rounded-md border border-border bg-surface p-2.5 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
                />
              </label>
              <div className="text-[13px] font-medium text-foreground">
                Send someone in my place <span className="font-normal text-muted">(optional)</span>
                <div className="mt-1"><PersonPicker people={users} value={standIn} onChange={setStandIn} /></div>
              </div>
              <div className="flex items-end gap-2">
                <button disabled={pending || reason.trim().length < 3} onClick={() => send("declined")} className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-[14px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                  Send reply
                </button>
                <button onClick={() => setDeclining(false)} className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-[14px] font-semibold text-foreground hover:bg-surface-hover">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {people.length === 0 ? (
        <p className="text-[13.5px] text-muted">Nobody is invited yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {people.map((p, i) => (
            <li key={`${p.user_id || p.name}-${i}`} className="flex flex-wrap items-start justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-foreground">{p.name}</p>
                {p.reply === "declined" && (p.reason || p.stand_in) && (
                  <p className="text-[12.5px] text-subtle">
                    {p.reason ? `Reason: ${p.reason}` : ""}
                    {p.stand_in ? `${p.reason ? " · " : ""}Sending ${p.stand_in}` : ""}
                  </p>
                )}
                {p.reply === "tentative" && p.reason && <p className="text-[12.5px] text-subtle">{p.reason}</p>}
              </div>
              <ReplyChip reply={p.reply} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
