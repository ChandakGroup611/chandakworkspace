"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { sendPointUpdate } from "@/lib/actions/meet/points-view";

/** "Send an update for the next meeting" — where the update-request email lands. */
export default function PointUpdateForm({ pointId, progress }: { pointId: string; progress: number }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pct, setPct] = useState(progress);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await sendPointUpdate({ pointId, text, progress: pct });
    setBusy(false);
    if (r.success) {
      setText("");
      setMsg({ ok: true, text: "Update sent. It will show at the next meeting." });
      router.refresh();
    } else setMsg({ ok: false, text: r.error || "Couldn't send the update." });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="pu-text" className="block text-[13px] font-semibold text-subtle">What's the latest?</label>
      <textarea
        id="pu-text"
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Legal has the draft, signing by Friday"
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="pu-pct" className="text-[13px] text-subtle">Progress {pct}%</label>
        <input id="pu-pct" type="range" min={0} max={100} step={10} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="w-40" />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13.5px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />} Send update
        </button>
      </div>
      {msg && <p role="status" className={`text-[13.5px] ${msg.ok ? "text-success-text" : "text-danger-text"}`}>{msg.text}</p>}
    </form>
  );
}
