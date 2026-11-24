"use client";

import React, { useState } from "react";
import { setMeetSwitch } from "@/lib/actions/meet/switches";

export default function SwitchToggle({ k, label, initial, canEdit }: { k: string; label: string; initial: boolean; canEdit: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flip = async () => {
    if (!canEdit || busy) return;
    const next = !on;
    setBusy(true);
    setError(null);
    setOn(next);
    const r = await setMeetSwitch(k, next);
    if (!r.success) {
      setOn(!next);
      setError(r.error || "Couldn't save");
    }
    setBusy(false);
  };
  return (
    <span className="flex items-center gap-2">
      {error && <span role="alert" className="text-[12.5px] text-danger-text">{error}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${label}: ${on ? "on" : "off"}`}
        onClick={flip}
        disabled={!canEdit || busy}
        title={canEdit ? undefined : "Only a Meet admin can change this"}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed ${on ? "bg-primary" : "bg-border"} ${!canEdit ? "opacity-60" : ""}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </span>
  );
}
