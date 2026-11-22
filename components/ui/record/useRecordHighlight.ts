"use client";

/**
 * Post-create standard: after a record is saved the user lands on the list and the
 * new row is highlighted for a few seconds and scrolled into view, so "what I just
 * created" is always visible in the same place.
 *
 *   // in the create form, on success:
 *   router.push(recordCreatedHref("/meet/meetings", meeting.id));
 *
 *   // in the list:
 *   const highlightId = useRecordHighlight();
 *   <tr data-record-id={row.id} data-highlight={highlightId === row.id || undefined}>
 *
 * The id travels in `?created=<id>` and is removed from the URL once shown, so a
 * refresh does not highlight it again.
 */
import { useEffect, useState } from "react";

export const CREATED_PARAM = "created";

export function recordCreatedHref(listHref: string, id: string | number) {
  const sep = listHref.includes("?") ? "&" : "?";
  return `${listHref}${sep}${CREATED_PARAM}=${encodeURIComponent(String(id))}`;
}

export function useRecordHighlight(durationMs = 4000): string | null {
  const [id, setId] = useState<string | null>(null);

  // Step 1: read and strip ?created= once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const created = url.searchParams.get(CREATED_PARAM);
    if (!created) return;
    setId(created);
    // Drop the param without a navigation so refresh/back don't re-highlight.
    url.searchParams.delete(CREATED_PARAM);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);

  // Step 2: scroll to it, then clear. Keyed on id so StrictMode double-runs stay correct.
  useEffect(() => {
    if (!id) return;
    const scroll = window.setTimeout(() => {
      document.querySelector(`[data-record-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 150);
    const clear = window.setTimeout(() => setId(null), durationMs);
    return () => { window.clearTimeout(scroll); window.clearTimeout(clear); };
  }, [id, durationMs]);

  return id;
}

/**
 * Drop-in for server-rendered lists: place <RecordHighlighter /> anywhere on the page
 * and give each row/card `data-record-id={id}`. The new record gets `data-highlight`.
 */
export function RecordHighlighter({ durationMs = 4000 }: { durationMs?: number }) {
  const id = useRecordHighlight(durationMs);
  useEffect(() => {
    if (!id) return;
    const el = document.querySelector(`[data-record-id="${CSS.escape(id)}"]`);
    el?.setAttribute("data-highlight", "true");
    return () => el?.removeAttribute("data-highlight");
  }, [id]);
  return null;
}

/**
 * Local version for in-page lists (no navigation): `const [highlightId, flash] = useFlashHighlight();`
 * then `flash(newRecord.id)` after a save; the id clears itself after `durationMs`.
 */
export function useFlashHighlight(durationMs = 4000): [string | null, (id: string | null) => void] {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    const t = window.setTimeout(() => setId(null), durationMs);
    return () => window.clearTimeout(t);
  }, [id, durationMs]);
  return [id, setId];
}
