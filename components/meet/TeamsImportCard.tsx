"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users, FileText } from "lucide-react";
import { importTeamsAttendance, importTeamsTranscript } from "@/lib/actions/meet/teams-sync";

/** On the minutes review: pull attendance and the transcript back from Teams. */
export default function TeamsImportCard({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"att" | "tr" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (kind: "att" | "tr") => {
    setBusy(kind);
    setMsg(null);
    try {
      if (kind === "att") {
        const r = await importTeamsAttendance(sessionId);
        setMsg(r.success ? { ok: true, text: `Attendance updated for ${r.matched} of ${r.total} people Teams saw.` } : { ok: false, text: r.error || "Couldn't import attendance." });
      } else {
        const r = await importTeamsTranscript(sessionId);
        setMsg(
          r.success
            ? { ok: true, text: r.added ? `Added ${r.added} action and decision lines from ${r.lines} transcript lines. They're in the suggestions below.` : `Read ${r.lines} transcript lines; nothing new that sounds like an action or decision.` }
            : { ok: false, text: r.error || "Couldn't import the transcript." }
        );
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const btn =
    "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 text-[13.5px] font-semibold text-foreground hover:bg-surface-hover disabled:opacity-60";

  return (
    <section aria-label="Bring in from Teams" className="mb-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[14.5px] font-semibold text-heading">Bring in from Teams</h2>
          <p className="text-[13px] text-subtle">Mark who attended from the Teams report, and pick action lines out of the transcript.</p>
        </div>
        <button type="button" onClick={() => run("att")} disabled={!!busy} className={btn}>
          {busy === "att" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Users className="h-4 w-4" aria-hidden />} Attendance
        </button>
        <button type="button" onClick={() => run("tr")} disabled={!!busy} className={btn}>
          {busy === "tr" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />} Transcript
        </button>
      </div>
      {msg && (
        <p role="status" className={`mt-3 text-[13.5px] ${msg.ok ? "text-success-text" : "text-warning-text"}`}>
          {msg.text}
        </p>
      )}
    </section>
  );
}
