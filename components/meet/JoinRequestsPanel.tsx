"use client";

import React, { useCallback, useEffect, useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { getJoinRequests, decideJoinRequest, type JoinRequest } from "@/lib/actions/meet/join";

/**
 * Host's "Waiting to join" panel. Shows only for the organiser / chair / minute taker, and only
 * when someone is waiting. Checks every 5 seconds.
 */
export default function JoinRequestsPanel({ sessionId }: { sessionId: string }) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await getJoinRequests(sessionId);
      setIsHost(r.isHost);
      setRequests(r.requests);
    } catch {}
  }, [sessionId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const decide = async (ids: string[], decision: "admit" | "deny", key: string) => {
    setBusy(key);
    setError(null);
    const r = await decideJoinRequest(sessionId, ids, decision);
    if (!r.success) setError(r.error || "Couldn't update the request.");
    await load();
    setBusy(null);
  };

  if (!isHost || requests.length === 0) return null;

  return (
    <section
      aria-label="People waiting to join"
      className="mb-4 rounded-xl border border-warning-border bg-warning-soft p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-warning-text">
          <UserPlus className="h-4 w-4" aria-hidden />
          Waiting to join ({requests.length})
        </h2>
        {requests.length > 1 && (
          <button
            type="button"
            onClick={() => decide(requests.map((r) => r.id), "admit", "all")}
            disabled={!!busy}
            className="inline-flex h-8 items-center rounded-md border border-warning-border bg-surface px-3 text-[13px] font-semibold text-foreground hover:bg-surface-hover disabled:opacity-60"
          >
            Admit all
          </button>
        )}
      </div>
      {error && <p role="alert" className="mb-2 text-[13px] text-danger-text">{error}</p>}
      <ul className="space-y-2">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface p-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-bold text-accent-soft-text">
              {r.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-foreground">{r.name}</span>
              <span className="block truncate text-[12.5px] text-muted">{r.email || "Chandak Group"} · not on the invite list</span>
            </span>
            <button
              type="button"
              onClick={() => decide([r.id], "admit", r.id)}
              disabled={!!busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13.5px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Admit
            </button>
            <button
              type="button"
              onClick={() => decide([r.id], "deny", `${r.id}-deny`)}
              disabled={!!busy}
              className="inline-flex h-9 items-center rounded-md border border-border bg-surface px-4 text-[13.5px] font-semibold text-danger-text hover:bg-surface-hover disabled:opacity-60"
            >
              Deny
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
