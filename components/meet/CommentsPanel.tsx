"use client";

import React, { useEffect, useState, useTransition } from "react";
import { toast } from "react-toastify";
import { MessageSquare } from "lucide-react";
import { getComments, addComment, type MeetComment } from "@/lib/actions/meet/collab";

/** Comments on a point, task or decision. */
export default function CommentsPanel({ entityType, entityId }: { entityType: "point" | "task" | "decision"; entityId: string }) {
  const [list, setList] = useState<MeetComment[] | null>(null);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const load = () => getComments(entityType, entityId).then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, [entityType, entityId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="theme-card-structural space-y-3 p-5" aria-labelledby={`cm-${entityId}`}>
      <h2 id={`cm-${entityId}`} className="flex items-center gap-2 text-[15px] font-semibold text-heading">
        <MessageSquare className="h-4 w-4" aria-hidden /> Comments {list && list.length > 0 ? `· ${list.length}` : ""}
      </h2>
      {list === null ? (
        <p className="text-[13px] text-muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-[13px] text-muted">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((c) => (
            <li key={c.id} className="rounded-md bg-sunken p-3">
              <p className="text-[12.5px] font-semibold text-foreground">
                {c.by} <span className="font-normal text-muted">· {new Date(c.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-[14px] text-foreground">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addComment(entityType, entityId, text);
            if (!r.success) { toast.error(r.error || "Couldn't post."); return; }
            setText("");
            load();
          });
        }}
        className="space-y-2"
      >
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Write a comment" aria-label="Write a comment" className="w-full rounded-md border border-border bg-surface p-2.5 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none" />
        <button disabled={pending || !text.trim()} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-[13.5px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">Post</button>
      </form>
    </section>
  );
}
