"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Paperclip, Upload } from "lucide-react";
import { getMeetFiles, uploadMeetFile, type MeetFile } from "@/lib/actions/meet/files";

const size = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Files attached to a meeting date (pre-reads), a point or a task. */
export default function FilesPanel({ entityType, entityId, title = "Files", canAdd = true }: { entityType: "session" | "point" | "task" | "decision"; entityId: string; title?: string; canAdd?: boolean }) {
  const [list, setList] = useState<MeetFile[] | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  const load = () => getMeetFiles(entityType, entityId).then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, [entityType, entityId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="theme-card-structural space-y-3 p-5" aria-labelledby={`fl-${entityId}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 id={`fl-${entityId}`} className="flex items-center gap-2 text-[15px] font-semibold text-heading"><Paperclip className="h-4 w-4" aria-hidden /> {title}{list?.length ? ` · ${list.length}` : ""}</h2>
        {canAdd && (
          <>
            <input
              ref={ref}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const fd = new FormData();
                fd.set("entityType", entityType);
                fd.set("entityId", entityId);
                fd.set("file", f);
                start(async () => {
                  const r = await uploadMeetFile(fd);
                  if (!r.success) toast.error(r.error || "Upload failed.");
                  else { toast.success("File added"); load(); }
                  if (ref.current) ref.current.value = "";
                });
              }}
            />
            <button type="button" disabled={pending} onClick={() => ref.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[13.5px] font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50">
              <Upload className="h-4 w-4" aria-hidden /> {pending ? "Uploading…" : "Add file"}
            </button>
          </>
        )}
      </div>
      {list === null ? (
        <p className="text-[13px] text-muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-[13px] text-muted">No files yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[14px]">
              {f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{f.name}</a> : <span className="font-medium text-foreground">{f.name}</span>}
              <span className="text-[12.5px] text-muted">{size(f.size)} · {f.by || "Someone"} · {new Date(f.at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
