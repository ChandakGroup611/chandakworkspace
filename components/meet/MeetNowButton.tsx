"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Zap } from "lucide-react";
import { meetNow } from "@/lib/actions/meet/collab";

/** Start a one-off meeting right now and open its live room. */
export default function MeetNowButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await meetNow();
          if (!r.success || !r.sessionId) { toast.error(r.error || "Couldn't start the meeting."); return; }
          router.push(`/meet/live/${r.sessionId}`);
        })
      }
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-[14px] font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50 ${className}`}
    >
      <Zap className="h-4 w-4" aria-hidden /> {pending ? "Starting…" : "Meet now"}
    </button>
  );
}
