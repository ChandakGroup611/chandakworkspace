"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "react-toastify";
import { ChevronDown, ChevronUp, Radio, Video } from "lucide-react";
import { getMyRunningMeeting, dockAdd, type RunningMeeting } from "@/lib/actions/meet/live-dock";
import { getPeopleForPicker } from "@/lib/actions/meet/people";
import PersonPicker, { type PickPerson } from "@/components/meet/PersonPicker";

/**
 * Shown on every Chandak Meet page while a meeting you're in is running. Lets you add a point,
 * task, note line or decision from wherever you are, and jump back to the live room.
 * The Teams call runs in Teams (app or its own tab), so Chandak Meet stays usable alongside it.
 */

type Kind = "point" | "task" | "note" | "decision";
const KINDS: { id: Kind; label: string; placeholder: string }[] = [
  { id: "point", label: "Point", placeholder: "New point, e.g. Collections from Indore dealers are late" },
  { id: "task", label: "Task", placeholder: "New task, e.g. Share dealer-wise collection report" },
  { id: "note", label: "Note", placeholder: "A line for the meeting notes" },
  { id: "decision", label: "Decision", placeholder: "What was decided" },
];

export default function LiveDock() {
  const pathname = usePathname() || "";
  const hidden = pathname.startsWith("/meet/live") || pathname.startsWith("/meet/join") || pathname.startsWith("/meet/rooms/");
  const [m, setM] = useState<RunningMeeting | null>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("point");
  const [text, setText] = useState("");
  const [owner, setOwner] = useState("");
  const [days, setDays] = useState(3);
  const [pointId, setPointId] = useState("");
  const [people, setPeople] = useState<PickPerson[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (hidden) return;
    let alive = true;
    const load = () => getMyRunningMeeting().then((r) => alive && setM(r)).catch(() => null);
    load();
    const t = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [hidden, pathname]);

  useEffect(() => {
    if (open && !people.length) getPeopleForPicker().then(setPeople).catch(() => null);
  }, [open, people.length]);

  if (hidden || !m) return null;

  const add = () =>
    start(async () => {
      const r = await dockAdd({ sessionId: m.sessionId, kind, text, ownerId: owner || undefined, days, pointId: pointId || undefined });
      if (!r.success) { toast.error(r.error || "Couldn't add it."); return; }
      toast.success(`${KINDS.find((k) => k.id === kind)!.label} added${r.code ? ` (${r.code})` : ""}`);
      setText("");
      setOwner("");
      if (kind === "point") getMyRunningMeeting().then(setM).catch(() => null);
    });

  const input = "h-9 w-full rounded-md border border-border bg-surface px-2.5 text-[13.5px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none";

  return (
    <div className="fixed bottom-20 right-4 z-40 w-[min(92vw,360px)] overflow-visible rounded-xl border border-border bg-surface shadow-2xl md:bottom-4" role="region" aria-label="Meeting in progress">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-surface-hover">
        <Radio className="h-4 w-4 shrink-0 animate-pulse text-success-text" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold text-success-text">Meeting in progress</span>
          <span className="block truncate text-[13.5px] font-semibold text-foreground">{m.title}</span>
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-muted" aria-hidden /> : <ChevronUp className="h-4 w-4 text-muted" aria-hidden />}
      </button>

      {open && (
        <div className="space-y-3 border-t border-border p-3">
          <div className="flex gap-2">
            <Link href={m.isHost ? `/meet/live/${m.sessionId}` : `/meet/sessions/${m.sessionId}`} className="inline-flex h-8 flex-1 items-center justify-center rounded-md bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover">
              Back to the meeting
            </Link>
            {m.videoLink && (
              <a href={m.videoLink} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-[13px] font-semibold text-foreground hover:bg-surface-hover">
                <Video className="h-3.5 w-3.5" aria-hidden /> Teams
              </a>
            )}
          </div>

          <div role="tablist" aria-label="What to add" className="grid grid-cols-4 gap-1 rounded-md bg-sunken p-1">
            {KINDS.map((k) => (
              <button
                key={k.id}
                role="tab"
                aria-selected={kind === k.id}
                onClick={() => setKind(k.id)}
                className={`rounded px-1 py-1 text-[12.5px] font-semibold ${kind === k.id ? "bg-surface text-heading shadow-sm" : "text-muted hover:text-foreground"}`}
              >
                {k.label}
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder={KINDS.find((k) => k.id === kind)!.placeholder}
            className="w-full rounded-md border border-border bg-surface p-2.5 text-[13.5px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
            aria-label="Text"
          />

          {(kind === "point" || kind === "task") && (
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <div>
                <span className="mb-1 block text-[12px] font-medium text-muted">Owner (anyone)</span>
                <PersonPicker people={people} value={owner} onChange={setOwner} placeholder="Name" />
              </div>
              <label className="text-[12px] font-medium text-muted">
                Days
                <input type="number" min={1} max={60} value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${input} mt-1`} />
              </label>
            </div>
          )}

          {kind !== "point" && m.points.length > 0 && (
            <label className="block text-[12px] font-medium text-muted">
              Under point <span className="font-normal">(optional)</span>
              <select value={pointId} onChange={(e) => setPointId(e.target.value)} className={`${input} mt-1`}>
                <option value="">None</option>
                {m.points.map((p) => <option key={p.id} value={p.id}>{p.code} {p.title}</option>)}
              </select>
            </label>
          )}

          <button disabled={pending || text.trim().length < 2} onClick={add} className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary text-[13.5px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
            {pending ? "Adding…" : `Add ${KINDS.find((k) => k.id === kind)!.label.toLowerCase()}`}
          </button>
          <p className="text-[11.5px] text-muted">Someone not in the meeting can be picked as owner; they're added to the meeting.</p>
        </div>
      )}
    </div>
  );
}
