"use client";

import React, { useEffect, useState, useTransition } from "react";
import { toast } from "react-toastify";
import { CheckCircle2 } from "lucide-react";
import { getMinutesAcks, acknowledgeMinutes } from "@/lib/actions/meet/collab";

/** "I've read the minutes" for attendees, and who has confirmed. Only once the minutes are sent. */
export default function MinutesAckPanel({ sessionId }: { sessionId: string }) {
  const [d, setD] = useState<Awaited<ReturnType<typeof getMinutesAcks>> | null>(null);
  const [pending, start] = useTransition();
  const load = () => getMinutesAcks(sessionId).then(setD).catch(() => null);
  useEffect(() => { load(); }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d || (!d.canAck && d.acked.length === 0)) return null;
  return (
    <section className="theme-card-structural space-y-2 p-4" aria-labelledby="ack-h">
      <h2 id="ack-h" className="text-[15px] font-semibold text-heading">Read by {d.acked.length} of {d.invited}</h2>
      {d.canAck && !d.mine && (
        <button
          disabled={pending}
          onClick={() => start(async () => { const r = await acknowledgeMinutes(sessionId); if (!r.success) { toast.error(r.error || "Couldn't save."); return; } toast.success("Thanks, noted"); load(); })}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-[13.5px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden /> I've read the minutes
        </button>
      )}
      {d.mine && <p className="text-[13px] font-medium text-success-text">You've confirmed you read these minutes.</p>}
      {d.acked.length > 0 && <p className="text-[12.5px] text-muted">{d.acked.map((a) => a.name).join(", ")}</p>}
    </section>
  );
}
