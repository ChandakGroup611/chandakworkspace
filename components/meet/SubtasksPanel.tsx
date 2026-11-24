"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { getSubtasks, addSubtask } from "@/lib/actions/meet/collab";
import { getPeopleForPicker } from "@/lib/actions/meet/people";
import PersonPicker, { type PickPerson } from "@/components/meet/PersonPicker";

/** Subtasks under a task (one level). */
export default function SubtasksPanel({ taskId, canAdd }: { taskId: string; canAdd: boolean }) {
  const [list, setList] = useState<Awaited<ReturnType<typeof getSubtasks>>>([]);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [people, setPeople] = useState<PickPerson[]>([]);
  const [pending, start] = useTransition();
  const load = () => getSubtasks(taskId).then(setList).catch(() => null);
  useEffect(() => { load(); }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (canAdd) getPeopleForPicker().then(setPeople).catch(() => null); }, [canAdd]);
  const done = list.filter((t) => t.status === "completed").length;

  return (
    <section className="theme-card-structural space-y-3 p-5" aria-labelledby={`st-${taskId}`}>
      <h2 id={`st-${taskId}`} className="text-[15px] font-semibold text-heading">Subtasks{list.length ? ` · ${done}/${list.length} done` : ""}</h2>
      {list.length === 0 ? (
        <p className="text-[13px] text-muted">No subtasks. Split the work into smaller steps if it helps.</p>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[14px]">
              <Link href={`/meet/tasks/${t.id}`} className={`font-medium hover:underline ${t.status === "completed" ? "text-muted line-through" : "text-foreground"}`}>
                <span className="mr-1.5 text-primary">{t.code}</span>{t.title}
              </Link>
              <span className="text-[12.5px] text-muted">{t.owner || "No owner"} · {t.status.replace(/_/g, " ")}</span>
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <div className="grid gap-2 sm:grid-cols-[1fr_200px_auto]">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New subtask" aria-label="New subtask" className="h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none" />
          <PersonPicker people={people} value={owner} onChange={setOwner} placeholder="Owner" />
          <button
            disabled={pending || title.trim().length < 2}
            onClick={() => start(async () => { const r = await addSubtask({ parentId: taskId, title, ownerId: owner || undefined }); if (!r.success) { toast.error(r.error || "Couldn't add."); return; } setTitle(""); setOwner(""); load(); })}
            className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-[14px] font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
    </section>
  );
}
