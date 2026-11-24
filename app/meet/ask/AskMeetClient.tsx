"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2, Sparkles } from "lucide-react";
import { askMeet, type AskResult } from "@/lib/actions/meet/ask";

const KIND_CLS: Record<string, string> = {
  Point: "bg-accent-soft text-accent-soft-text",
  Decision: "bg-success-soft text-success-text",
  Task: "bg-warning-soft text-warning-text",
  Minutes: "bg-sunken text-subtle",
};

const EXAMPLES = [
  "What did we decide about the distributor agreement?",
  "Open points on collections",
  "Tasks pending for the Indore project",
  "When did we last discuss pricing?",
];

export default function AskMeetClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<AskResult | null>(null);
  const [asked, setAsked] = useState("");

  const run = async (question: string) => {
    const text = question.trim();
    if (!text) return;
    setBusy(true);
    setAsked(text);
    router.replace(`/meet/ask?q=${encodeURIComponent(text)}`, { scroll: false });
    try {
      setRes(await askMeet(text));
    } catch {
      setRes({ answer: null, aiUsed: false, sources: [], note: "Couldn't search right now. Try again." });
    } finally {
      setBusy(false);
    }
  };

  // Run once for a ?q= link
  React.useEffect(() => {
    const first = params.get("q");
    if (first) void run(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Turn [2] citations into links to the source
  const renderAnswer = (text: string) =>
    text.split(/(\[\d+\])/g).map((part, i) => {
      const m = part.match(/^\[(\d+)\]$/);
      const src = m ? res?.sources[Number(m[1]) - 1] : null;
      return src ? (
        <Link key={i} href={src.href} className="mx-0.5 inline-flex h-5 items-center rounded bg-accent-soft px-1.5 align-middle text-[11.5px] font-semibold text-accent-soft-text hover:underline">
          {m![1]}
        </Link>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      );
    });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(q);
        }}
        className="flex gap-2"
      >
        <label className="relative flex-1">
          <span className="sr-only">Ask about your meetings</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. What did we decide about the Indore distributor?"
            autoFocus
            className="h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-3 text-[15px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !q.trim()}
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />} Ask
        </button>
      </form>

      {!res && !busy && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                setQ(e);
                void run(e);
              }}
              className="rounded-full border border-border bg-surface px-3.5 py-2 text-[13.5px] text-subtle hover:bg-surface-hover hover:text-foreground"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {busy && (
        <p role="status" className="flex items-center gap-2 text-[14px] text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Looking through your meetings…
        </p>
      )}

      {res && !busy && (
        <div className="space-y-4" aria-live="polite">
          {res.answer ? (
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-muted">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Answer to “{asked}”
              </h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground">{renderAnswer(res.answer)}</p>
              <p className="mt-3 text-[12.5px] text-muted">Written by AI from the items below only. Check the linked items before acting on it.</p>
            </section>
          ) : res.note ? (
            <p className="text-[14px] text-subtle">{res.note}</p>
          ) : null}

          {res.sources.length > 0 && (
            <section aria-labelledby="src-h" className="overflow-hidden rounded-xl border border-border bg-surface">
              <h2 id="src-h" className="border-b border-border px-4 py-3 text-[14px] font-semibold text-heading">
                {res.sources.length} matching item{res.sources.length === 1 ? "" : "s"}
              </h2>
              <ol>
                {res.sources.map((s, i) => (
                  <li key={`${s.kind}-${s.code}-${i}`} className="border-b border-border last:border-0">
                    <Link href={s.href} className="flex gap-3 px-4 py-3 hover:bg-surface-hover">
                      <span className="w-6 shrink-0 pt-0.5 text-[12.5px] font-semibold text-muted">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11.5px] font-semibold ${KIND_CLS[s.kind]}`}>{s.kind}</span>
                          <span className="text-[14px] font-semibold text-foreground">{s.title}</span>
                        </span>
                        {s.snippet && s.snippet !== s.title && <span className="mt-1 block text-[13px] leading-relaxed text-subtle">{s.snippet}</span>}
                        <span className="mt-1 block text-[12.5px] text-muted">
                          {[s.code, s.meeting, s.date, s.status?.replace(/_/g, " ")].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
