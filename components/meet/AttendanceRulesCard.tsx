"use client";

import React, { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { saveAttendanceGrace } from "@/lib/actions/meet/attendance-rules";

/** Settings › Meeting rules: how attendance is taken from join times. */
export default function AttendanceRulesCard({ grace }: { grace: number }) {
  const [v, setV] = useState(grace);
  const [pending, start] = useTransition();
  return (
    <section className="theme-card-structural space-y-3 p-5" aria-labelledby="att-rules">
      <h2 id="att-rules" className="text-[16px] font-semibold text-heading">Attendance</h2>
      <ul className="list-disc space-y-1 pl-5 text-[13.5px] text-subtle">
        <li>When someone joins (join page, admitted, or starting the meeting), the time is recorded and they're marked <strong>Early</strong> or <strong>On time</strong>, or <strong>Late</strong> after the grace minutes below.</li>
        <li>When the meeting starts, everyone who hasn't joined shows <strong>Absent</strong> (or <strong>Excused</strong> if they said they can't attend). Joining later changes it to Late.</li>
        <li>The organiser, chair or minute taker can still change anyone by hand in the live meeting. That mark is kept.</li>
      </ul>
      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor="grace" className="text-[13px] font-semibold text-foreground">
          Grace minutes before someone counts as late
          <input id="grace" type="number" min={0} max={120} value={v} onChange={(e) => setV(Number(e.target.value))} className="mt-1 block h-10 w-28 rounded-md border border-border bg-surface px-3 text-[14px] text-foreground focus:border-primary focus:outline-none" />
        </label>
        <button
          type="button"
          disabled={pending || v === grace}
          onClick={() => start(async () => { const r = await saveAttendanceGrace(v); if (!r.success) toast.error(r.error || "Couldn't save."); else toast.success("Saved"); })}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-[14px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </section>
  );
}
