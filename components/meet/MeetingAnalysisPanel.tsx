"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Sparkles, Loader2, AlertTriangle, Eye, CheckCircle2 } from "lucide-react";
import { getMeetingAnalysis, isMeetAiConfigured, type MeetingAnalysis } from "@/lib/actions/meet/ai-analysis";

const LEVEL = {
  risk: { icon: AlertTriangle, cls: "text-danger-text", label: "Risk" },
  watch: { icon: Eye, cls: "text-warning-text", label: "Watch" },
  good: { icon: CheckCircle2, cls: "text-success-text", label: "Good" },
} as const;

/** "Meeting analysis": health numbers, findings, who's overloaded, chronic points, suggested next agenda, and an AI reading. */
export default function MeetingAnalysisPanel({ meetingId }: { meetingId: string }) {
  const [a, setA] = useState<MeetingAnalysis | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [aiOn, setAiOn] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    getMeetingAnalysis(meetingId, false)
      .then((r) => ("error" in r ? setErr(r.error) : setA(r)))
      .catch(() => setErr("Couldn't load the analysis."));
    isMeetAiConfigured().then(setAiOn).catch(() => setAiOn(false));
  }, [meetingId]);

  const askAi = () =>
    start(async () => {
      const r = await getMeetingAnalysis(meetingId, true);
      if ("error" in r) setErr(r.error);
      else setA(r);
    });

  if (err) return <p className="text-[13px] text-danger-text">{err}</p>;
  if (!a)
    return (
      <section className="theme-card-structural p-5">
        <p className="flex items-center gap-2 text-[13.5px] text-muted"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Analysing this meeting…</p>
      </section>
    );

  const s = a.stats;
  const pills: { n: string | number; label: string; tone?: "danger" | "warning" }[] = [
    { n: s.held, label: "meetings held" },
    { n: s.avgAttendance === null ? "—" : `${s.avgAttendance}%`, label: "attendance", tone: s.avgAttendance !== null && s.avgAttendance < 70 ? "warning" : undefined },
    { n: s.lateRate === null ? "—" : `${s.lateRate}%`, label: "join late", tone: s.lateRate !== null && s.lateRate >= 30 ? "warning" : undefined },
    { n: s.openPoints, label: "open points" },
    { n: s.overduePoints + s.overdueTasks, label: "overdue items", tone: s.overduePoints + s.overdueTasks > 0 ? "danger" : undefined },
    { n: s.onTimeTasks === null ? "—" : `${s.onTimeTasks}%`, label: "tasks on time" },
    { n: s.decisionsInForce, label: "decisions in force" },
  ];
  const toneCls = (t?: string) => (t === "danger" ? "border-danger-border bg-danger-soft text-danger-text" : t === "warning" ? "border-warning-border bg-warning-soft text-warning-text" : "border-border bg-sunken text-heading");

  return (
    <section className="theme-card-structural space-y-5 p-5" aria-labelledby="ana-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ana-h" className="flex items-center gap-2 text-[16px] font-semibold text-heading">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Meeting analysis
        </h2>
        {aiOn ? (
          <button type="button" onClick={askAi} disabled={pending} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-[13.5px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />} {a.ai ? "Ask AI again" : "Ask AI for its view"}
          </button>
        ) : (
          <span className="text-[12px] text-muted">The AI's own view needs an AI key set up on the server. The findings below work without it.</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {pills.map((p) => (
          <div key={p.label} className={`rounded-lg border p-2.5 text-center ${toneCls(p.tone)}`}>
            <p className="text-[19px] font-bold">{p.n}</p>
            <p className="text-[11.5px] opacity-80">{p.label}</p>
          </div>
        ))}
      </div>

      {a.ai && (
        <div className="rounded-lg border border-border bg-accent-soft p-4">
          <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-accent-soft-text">AI's view</p>
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">{a.ai.text}</p>
          <p className="mt-2 text-[11.5px] text-muted">Written by AI from the numbers on this page. Check before acting on it.</p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-[14px] font-semibold text-foreground">What stands out</h3>
          <ul className="space-y-1.5">
            {a.findings.map((f, i) => {
              const L = LEVEL[f.level];
              return (
                <li key={i} className="flex gap-2 text-[13.5px] text-foreground">
                  <L.icon className={`mt-0.5 h-4 w-4 shrink-0 ${L.cls}`} aria-label={L.label} /> {f.text}
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-[14px] font-semibold text-foreground">Suggested agenda for the next meeting</h3>
          <ol className="list-decimal space-y-1 pl-5 text-[13.5px] text-foreground">
            {a.nextAgenda.map((x, i) => <li key={i}>{x}</li>)}
          </ol>
        </div>
        <div>
          <h3 className="mb-2 text-[14px] font-semibold text-foreground">Who has the most open items</h3>
          {a.owners.length === 0 ? <p className="text-[13px] text-muted">Nothing open.</p> : (
            <ul className="space-y-1">
              {a.owners.map((o) => (
                <li key={o.name} className="flex justify-between gap-2 text-[13.5px]">
                  <span className="text-foreground">{o.name}</span>
                  <span className="text-subtle">{o.open} open{o.overdue ? <span className="font-semibold text-danger-text"> · {o.overdue} overdue</span> : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-[14px] font-semibold text-foreground">Points that keep coming back</h3>
          {a.chronic.length === 0 ? <p className="text-[13px] text-muted">None carried twice or more.</p> : (
            <ul className="space-y-1">
              {a.chronic.map((c) => (
                <li key={c.id} className="text-[13.5px]">
                  <Link href={`/meet/points/${c.id}`} className="text-foreground hover:underline"><span className="text-primary">{c.code}</span> {c.title}</Link>
                  <span className="block text-[12px] text-muted">carried {c.carried}× · {c.owner}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
