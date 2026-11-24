"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Plus, X, ShieldCheck, CalendarDays } from "lucide-react";
import { createMeetTask, getOpenPointsForMeeting } from "@/lib/actions/meet/task-new";
import { uploadMeetFile } from "@/lib/actions/meet/files";
import PersonPicker, { type PickPerson } from "@/components/meet/PersonPicker";
import { calculateDueDateFromTAT, calculateTATFromDates, formatPrettyDate } from "@/lib/utils/meet-working-days";

type Data = {
  meetings: { id: string; label: string }[];
  people: PickPerson[];
  point: { id: string; code: string; title: string; meetingId: string; defaultDays: number } | null;
};

const input = "h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none";
const label = "mb-1 block text-[13px] font-semibold text-foreground";
const card = "theme-card-structural space-y-4 p-5";
const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default function NewTaskForm({ data, sessionId, back }: { data: Data; sessionId?: string; back: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingId, setMeetingId] = useState(data.point?.meetingId || "");
  const [points, setPoints] = useState<{ id: string; label: string }[]>(data.point ? [{ id: data.point.id, label: `${data.point.code} ${data.point.title}` }] : []);
  const [pointId, setPointId] = useState(data.point?.id || "");
  const [owner, setOwner] = useState("");
  const [priority, setPriority] = useState("medium");
  const [startDate, setStartDate] = useState(todayStr());
  const [days, setDays] = useState(data.point?.defaultDays || 3);
  const [due, setDue] = useState(() => calculateDueDateFromTAT(todayStr(), data.point?.defaultDays || 3).dueDate);
  const [verify, setVerify] = useState(false);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [item, setItem] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!meetingId) { setPoints([]); return; }
    getOpenPointsForMeeting(meetingId).then((p) => {
      setPoints(p);
      if (!p.some((x) => x.id === pointId)) setPointId("");
    }).catch(() => setPoints([]));
  }, [meetingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const skipped = useMemo(() => calculateTATFromDates(startDate, due).nonWorkingDaysSkipped, [startDate, due]);
  const onDays = (n: number) => { const v = Math.max(1, Math.min(90, n || 1)); setDays(v); setDue(calculateDueDateFromTAT(startDate, v).dueDate); };
  const onStart = (d: string) => { setStartDate(d); if (d) setDue(calculateDueDateFromTAT(d, days).dueDate); };
  const onDue = (d: string) => { setDue(d); if (d && startDate) setDays(calculateTATFromDates(startDate, d).tatDays); };
  const addItem = () => { if (item.trim()) { setChecklist([...checklist, item.trim()]); setItem(""); } };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (meetingId && !pointId) { toast.warning("Pick the point this task is about, or choose 'Not from a meeting'."); return; }
    start(async () => {
      const r = await createMeetTask({ title, description, meetingId: meetingId || undefined, pointId: pointId || undefined, sessionId, ownerId: owner || undefined, priority, startDate, days, dueDate: due, requiresVerification: verify, checklist });
      if (!r.success || !r.id) { toast.error(r.error || "Couldn't create the task."); return; }
      for (const f of files) {
        const fd = new FormData();
        fd.set("entityType", "task"); fd.set("entityId", r.id); fd.set("file", f);
        const u = await uploadMeetFile(fd);
        if (!u.success) toast.error(`${f.name}: ${u.error}`);
      }
      toast.success(`Task ${r.code || ""} created`);
      router.push(back.startsWith("/meet/tasks") ? `/meet/tasks/${r.id}` : back);
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <section className={card}>
          <h2 className="text-[16px] font-semibold text-heading">1. What has to be done</h2>
          <div>
            <label htmlFor="t-title" className={label}>Task <span className="text-danger-text">*</span></label>
            <input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Get the stamped bank clearance letter from SBI" className={input} />
          </div>
          <div>
            <label htmlFor="t-desc" className={label}>Details <span className="font-normal text-muted">(optional)</span></label>
            <textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Instructions, links, what 'done' looks like" className="w-full rounded-md border border-border bg-surface p-3 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none" />
          </div>
        </section>

        <section className={card}>
          <h2 className="text-[16px] font-semibold text-heading">2. Which meeting and point</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="t-mtg" className={label}>Meeting</label>
              <select id="t-mtg" value={meetingId} onChange={(e) => setMeetingId(e.target.value)} className={input}>
                <option value="">Not from a meeting</option>
                {data.meetings.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="t-pt" className={label}>Point {meetingId && <span className="text-danger-text">*</span>}</label>
              <select id="t-pt" value={pointId} onChange={(e) => setPointId(e.target.value)} disabled={!meetingId} className={`${input} disabled:opacity-60`}>
                <option value="">{meetingId ? (points.length ? "Pick a point" : "No open points in this meeting") : "—"}</option>
                {points.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <p className="text-[12.5px] text-muted">Linking it to a point puts it in that meeting's minutes and brings it up at the next meeting.</p>
        </section>

        <section className={card}>
          <h2 className="text-[16px] font-semibold text-heading">3. Checklist <span className="text-[13px] font-normal text-muted">(optional steps)</span></h2>
          <div className="flex gap-2">
            <input value={item} onChange={(e) => setItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} placeholder="Add a step and press Enter" aria-label="Checklist step" className={input} />
            <button type="button" onClick={addItem} className="inline-flex h-10 items-center gap-1 rounded-md border border-border bg-surface px-3 text-[13.5px] font-semibold text-foreground hover:bg-surface-hover"><Plus className="h-4 w-4" aria-hidden /> Add</button>
          </div>
          {checklist.length > 0 && (
            <ol className="space-y-1.5">
              {checklist.map((c, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-md bg-sunken px-3 py-2 text-[14px] text-foreground">
                  <span>{i + 1}. {c}</span>
                  <button type="button" onClick={() => setChecklist(checklist.filter((_, j) => j !== i))} aria-label={`Remove ${c}`} className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={card}>
          <h2 className="text-[16px] font-semibold text-heading">4. Files <span className="text-[13px] font-normal text-muted">(optional)</span></h2>
          <input type="file" multiple onChange={(e) => setFiles([...files, ...Array.from(e.target.files || [])])} className="block w-full text-[13.5px] text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-foreground" />
          {files.length > 0 && (
            <ul className="space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-[13px] text-foreground">
                  <span className="truncate">{f.name}</span>
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-5">
        <section className={card}>
          <h2 className="text-[16px] font-semibold text-heading">Who and by when</h2>
          <div>
            <span className={label}>Owner</span>
            <PersonPicker people={data.people} value={owner} onChange={setOwner} placeholder="Anyone in the company" />
            <p className="mt-1 text-[12px] text-muted">If they aren't in the meeting, they're added to it.</p>
          </div>
          <div>
            <label htmlFor="t-pri" className={label}>Priority</label>
            <select id="t-pri" value={priority} onChange={(e) => setPriority(e.target.value)} className={input}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="t-start" className={label}>Start</label>
              <input id="t-start" type="date" value={startDate} onChange={(e) => onStart(e.target.value)} className={input} />
            </div>
            <div>
              <label htmlFor="t-days" className={label}>Working days</label>
              <input id="t-days" type="number" min={1} max={90} value={days} onChange={(e) => onDays(Number(e.target.value))} className={input} />
            </div>
          </div>
          <div>
            <label htmlFor="t-due" className={label}>Due date</label>
            <input id="t-due" type="date" value={due} min={startDate} onChange={(e) => onDue(e.target.value)} className={input} />
          </div>
          <p className="flex items-start gap-2 rounded-md bg-sunken p-3 text-[13px] text-foreground">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>Due <strong>{formatPrettyDate(due)}</strong>, {days} working day{days === 1 ? "" : "s"} (Mon–Sat){skipped ? `, ${skipped} non-working day${skipped === 1 ? "" : "s"} skipped` : ""}.</span>
          </p>
          <label className="flex items-start gap-2 text-[13.5px] text-foreground">
            <input type="checkbox" checked={verify} onChange={(e) => setVerify(e.target.checked)} className="mt-0.5" />
            <span><span className="inline-flex items-center gap-1 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Needs sign-off</span><span className="block text-[12.5px] text-muted">The organiser or chair confirms it's done before it closes.</span></span>
          </label>
        </section>

        <div className="flex gap-2">
          <button type="button" onClick={() => router.push(back)} className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-border bg-surface text-[14.5px] font-semibold text-foreground hover:bg-surface-hover">Cancel</button>
          <button type="submit" disabled={pending || title.trim().length < 3} className="inline-flex h-11 flex-[2] items-center justify-center rounded-md bg-primary text-[14.5px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
            {pending ? "Creating…" : "Create task"}
          </button>
        </div>
      </aside>
    </form>
  );
}
