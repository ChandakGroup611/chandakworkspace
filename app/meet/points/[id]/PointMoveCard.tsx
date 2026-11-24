"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { reassignPointOwner } from "@/lib/actions/meet/points";
import { getTargetSessions, bringPointBack, sendPointToMeeting } from "@/lib/actions/meet/collab";
import { getPeopleForPicker } from "@/lib/actions/meet/people";
import PersonPicker, { type PickPerson } from "@/components/meet/PersonPicker";

const sel = "h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-foreground focus:border-primary focus:outline-none";
const btn2 = "inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-[14px] font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50";

/** Change owner (anyone), bring the point back to a meeting date, or raise it in another meeting. */
export default function PointMoveCard({ pointId, meetingId }: { pointId: string; meetingId: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [people, setPeople] = useState<PickPerson[]>([]);
  const [owner, setOwner] = useState("");
  const [targets, setTargets] = useState<{ id: string; label: string; sameMeeting: boolean }[]>([]);
  const [back, setBack] = useState("");
  const [other, setOther] = useState("");

  useEffect(() => {
    getPeopleForPicker().then(setPeople).catch(() => null);
    getTargetSessions(meetingId || undefined).then(setTargets).catch(() => null);
  }, [meetingId]);

  const run = (fn: () => Promise<any>, ok: string, after?: (r: any) => void) =>
    start(async () => {
      const r = await fn();
      if (!r?.success) { toast.error(r?.error || "Something went wrong."); return; }
      toast.success(ok);
      after ? after(r) : router.refresh();
    });

  const same = targets.filter((t) => t.sameMeeting);
  const others = targets.filter((t) => !t.sameMeeting);

  return (
    <section className="theme-card-structural space-y-4 p-5" aria-labelledby="pm-h">
      <h2 id="pm-h" className="text-[15px] font-semibold text-heading">Owner and meetings</h2>
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-foreground">Give to someone else <span className="font-normal text-muted">(anyone; they're added to the meeting)</span></p>
        <PersonPicker people={people} value={owner} onChange={setOwner} />
        <button disabled={!owner || pending} onClick={() => run(() => reassignPointOwner({ pointId, newOwnerId: owner }), "Owner changed", () => { setOwner(""); router.refresh(); })} className={btn2}>Change owner</button>
      </div>
      {same.length > 0 && (
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-foreground">Bring it up at a meeting date</p>
          <select value={back} onChange={(e) => setBack(e.target.value)} className={sel} aria-label="Meeting date">
            <option value="">Pick a date</option>
            {same.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <button disabled={!back || pending} onClick={() => run(() => bringPointBack({ pointId, sessionId: back }), "Added to that meeting's points")} className={btn2}>Add to that meeting</button>
        </div>
      )}
      {others.length > 0 && (
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-foreground">Raise it in another meeting <span className="font-normal text-muted">(e.g. escalate to Management Review)</span></p>
          <select value={other} onChange={(e) => setOther(e.target.value)} className={sel} aria-label="Other meeting">
            <option value="">Pick a meeting</option>
            {others.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <button disabled={!other || pending} onClick={() => run(() => sendPointToMeeting({ pointId, sessionId: other }), "Raised in that meeting", (r) => router.push(`/meet/points/${r.newPointId}`))} className={btn2}>Raise there</button>
        </div>
      )}
    </section>
  );
}
