import React from "react";
import Link from "next/link";
import { getOutlookStatus } from "@/lib/actions/meet/outlook";

/**
 * Under a meeting's title: is it a real Teams meeting, is it in Outlook, did the room accept?
 * Server component; renders nothing for finished or cancelled sessions.
 */
export default async function OutlookStatusLine({ sessionId, status, editHref }: { sessionId: string; status?: string; editHref?: string }) {
  if (status && !["scheduled", "in_progress"].includes(status)) return null;
  const st = await getOutlookStatus(sessionId).catch(() => null);
  if (!st) return null;

  const green = "bg-success-soft text-success-text";
  const amber = "bg-warning-soft text-warning-text";
  const red = "bg-danger-soft text-danger-text";
  const grey = "bg-sunken text-subtle";
  const chips: { text: string; cls: string }[] = [];

  if (st.teams === "real") chips.push({ text: "✓ Teams meeting", cls: green });
  else if (st.teams === "plain") chips.push({ text: "Plain Teams link", cls: grey });
  else if (st.teams === "own") chips.push({ text: "Own meeting link", cls: grey });

  chips.push(st.inOutlook ? { text: "✓ In Outlook", cls: green } : { text: "Not in Outlook yet", cls: grey });

  if (st.room) {
    const r = st.room;
    chips.push(
      r.state === "accepted"
        ? { text: `✓ ${r.name} accepted`, cls: green }
        : r.state === "pending"
        ? { text: `${r.name} · waiting for reply`, cls: amber }
        : r.state === "declined"
        ? { text: `✕ ${r.name} declined`, cls: red }
        : r.state === "cancelled"
        ? { text: `${r.name} · booking cancelled`, cls: grey }
        : { text: `${r.name} · held in Meet only`, cls: grey }
    );
  }

  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-1.5" aria-label="Teams and room status">
        {chips.map((c) => (
          <li key={c.text} className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold ${c.cls}`}>
            {c.text}
          </li>
        ))}
      </ul>
      {st.room?.state === "declined" && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-danger-border bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger-text">
          <span className="min-w-0 flex-1">{st.room.name} turned down the booking in Outlook; it is probably taken at that time.</span>
          {editHref && (
            <Link href={editHref} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover">
              Pick another room
            </Link>
          )}
        </div>
      )}
      {!st.connected && st.teams !== "real" && (
        <p className="text-[12.5px] text-muted">Microsoft 365 isn&apos;t connected yet, so meetings get a plain Teams link and rooms are held in Chandak Meet only.</p>
      )}
      {st.connected && st.error && <p className="text-[12.5px] text-warning-text">Couldn&apos;t add it to Outlook: {st.error}</p>}
    </div>
  );
}
