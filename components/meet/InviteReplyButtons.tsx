"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Check, X } from "lucide-react";
import { replyToInvite } from "@/lib/actions/meet/rsvp";
import { ReplyChip } from "@/components/meet/RsvpPanel";

/** Accept / Can't attend right in a list row. "Can't attend" asks for a reason. */
export default function InviteReplyButtons({ sessionId, reply, compact = false }: { sessionId: string; reply: string | null; compact?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [changing, setChanging] = useState(false);
  const replied = reply && reply !== "invited";

  const send = (r: "accepted" | "declined") =>
    start(async () => {
      const res = await replyToInvite({ sessionId, reply: r, reason: r === "declined" ? reason : undefined });
      if (!res.success) { toast.error(res.error || "Couldn't save your reply."); return; }
      toast.success(r === "accepted" ? "You're attending" : "Sent. The organiser will see your reason.");
      setAsking(false);
      setChanging(false);
      router.refresh();
    });

  if (replied && !changing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <ReplyChip reply={reply} />
        <button type="button" onClick={() => setChanging(true)} className="text-[12px] font-medium text-primary hover:underline">Change</button>
      </span>
    );
  }
  if (asking) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason"
          aria-label="Reason for not attending"
          className="h-8 w-40 rounded-md border border-border bg-surface px-2 text-[13px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
        />
        <button type="button" disabled={pending || reason.trim().length < 3} onClick={() => send("declined")} className="inline-flex h-8 items-center rounded-md bg-primary px-2.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">Send</button>
        <button type="button" onClick={() => setAsking(false)} className="text-[12px] font-medium text-muted hover:text-foreground">Cancel</button>
      </span>
    );
  }
  const btn = "inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[12.5px] font-semibold disabled:opacity-50";
  return (
    <span className="inline-flex items-center gap-1.5">
      <button type="button" disabled={pending} onClick={() => send("accepted")} className={`${btn} border-success-border bg-success-soft text-success-text hover:opacity-90`}>
        <Check className="h-3.5 w-3.5" aria-hidden /> Accept
      </button>
      <button type="button" disabled={pending} onClick={() => setAsking(true)} className={`${btn} border-border bg-surface text-foreground hover:bg-surface-hover`}>
        <X className="h-3.5 w-3.5" aria-hidden /> {compact ? "Can't" : "Can't attend"}
      </button>
    </span>
  );
}
