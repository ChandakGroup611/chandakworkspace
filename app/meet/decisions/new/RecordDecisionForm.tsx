"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Paperclip, X } from "lucide-react";
import { createDecisionFull } from "@/lib/actions/meet/decision-new";
import { uploadMeetFile } from "@/lib/actions/meet/files";
import MultiPersonPicker from "@/components/meet/MultiPersonPicker";
import type { PickPerson } from "@/components/meet/PersonPicker";

const input = "h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none";
const label = "mb-1 block text-[13px] font-semibold text-foreground";
const hint = "font-normal text-muted";

const CATEGORIES = ["Policy", "Approval", "Financial", "Operational", "HR", "Sales", "Compliance", "Other"];

export default function RecordDecisionForm({
  sessions,
  departments,
  people,
  defaultSession,
}: {
  sessions: { id: string; label: string; mine: boolean }[];
  departments: { id: string; label: string }[];
  people: PickPerson[];
  defaultSession?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sessionId, setSessionId] = useState(defaultSession && sessions.some((s) => s.id === defaultSession) ? defaultSession : sessions.find((s) => s.mine)?.id || sessions[0]?.id || "");
  const [text, setText] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState("Policy");
  const [priority, setPriority] = useState("normal");
  const [decidedBy, setDecidedBy] = useState("Management");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [reviewDate, setReviewDate] = useState("");
  const [appliesTo, setAppliesTo] = useState<"everyone" | "departments" | "people">("everyone");
  const [deptIds, setDeptIds] = useState<string[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [responsible, setResponsible] = useState<string[]>([]);
  const [days, setDays] = useState(7);
  const [files, setFiles] = useState<File[]>([]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await createDecisionFull({
        sessionId, text, details, category, priority: priority === "normal" ? undefined : priority, decidedBy, effectiveFrom, reviewDate,
        appliesTo, departmentIds: deptIds, userIds, responsibleIds: responsible, actionDays: days,
      });
      if (!r.success || !r.id) { toast.error(r.error || "Couldn't record the decision."); return; }
      for (const f of files) {
        const fd = new FormData();
        fd.set("entityType", "decision");
        fd.set("entityId", r.id);
        fd.set("file", f);
        const u = await uploadMeetFile(fd);
        if (!u.success) toast.error(`${f.name}: ${u.error}`);
      }
      toast.success(`Decision recorded${r.tasks ? `, ${r.tasks} action task${r.tasks === 1 ? "" : "s"} created` : ""}`);
      router.push(`/meet/decisions/${r.id}`);
    });
  };

  const card = "theme-card-structural space-y-4 p-5";
  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <section className={card}>
          <h2 className="text-[16px] font-semibold text-heading">1. The decision</h2>
          <div>
            <label htmlFor="d-text" className={label}>What was decided <span className="text-danger-text">*</span></label>
            <input id="d-text" value={text} onChange={(e) => setText(e.target.value)} required placeholder="e.g. Credit limit for Indore dealers stays at ₹25 lakh till March" className={input} />
          </div>
          <div>
            <label htmlFor="d-det" className={label}>Details <span className={hint}>(why, conditions, exceptions)</span></label>
            <textarea id="d-det" value={details} onChange={(e) => setDetails(e.target.value)} rows={4} className="w-full rounded-md border border-border bg-surface p-3 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="d-cat" className={label}>Type</label>
              <select id="d-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={input}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <div>
              <label htmlFor="d-pri" className={label}>Importance</label>
              <select id="d-pri" value={priority} onChange={(e) => setPriority(e.target.value)} className={input}>
                <option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label htmlFor="d-by" className={label}>Decided by</label>
              <input id="d-by" value={decidedBy} onChange={(e) => setDecidedBy(e.target.value)} placeholder="Management / MD / Committee" className={input} />
            </div>
          </div>
        </section>

        <section className={card}>
          <h2 className="text-[16px] font-semibold text-heading">2. Who it applies to</h2>
          <div role="radiogroup" aria-label="Applies to" className="flex flex-wrap gap-2">
            {([["everyone", "Everyone"], ["departments", "Departments"], ["people", "Specific people"]] as const).map(([id, l]) => (
              <button key={id} type="button" role="radio" aria-checked={appliesTo === id} onClick={() => setAppliesTo(id)}
                className={`h-9 rounded-md border px-3 text-[13.5px] font-semibold ${appliesTo === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground hover:bg-surface-hover"}`}>
                {l}
              </button>
            ))}
          </div>
          {appliesTo === "departments" && (
            <div className="grid max-h-56 gap-1.5 overflow-auto rounded-md border border-border p-3 sm:grid-cols-2">
              {departments.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-[13.5px] text-foreground">
                  <input type="checkbox" checked={deptIds.includes(d.id)} onChange={(e) => setDeptIds(e.target.checked ? [...deptIds, d.id] : deptIds.filter((x) => x !== d.id))} />
                  {d.label}
                </label>
              ))}
            </div>
          )}
          {appliesTo === "people" && <MultiPersonPicker people={people} value={userIds} onChange={setUserIds} />}
        </section>

        <section className={card}>
          <h2 className="text-[16px] font-semibold text-heading">3. Who has to act on it</h2>
          <p className="text-[13px] text-muted">Each person gets a task "Implement this decision". They update it with what was done, and you see it on the decision page.</p>
          <MultiPersonPicker people={people} value={responsible} onChange={setResponsible} placeholder="Add a person responsible" />
          {appliesTo === "people" && userIds.length > 0 && responsible.length === 0 && (
            <button type="button" onClick={() => setResponsible(userIds)} className="text-[13px] font-semibold text-primary hover:underline">Same people as above</button>
          )}
          {responsible.length > 0 && (
            <div className="max-w-[220px]">
              <label htmlFor="d-days" className={label}>Done within <span className={hint}>(working days)</span></label>
              <input id="d-days" type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} className={input} />
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-5">
        <section className={card}>
          <div>
            <label htmlFor="d-s" className={label}>Taken in meeting <span className="text-danger-text">*</span></label>
            <select id="d-s" value={sessionId} onChange={(e) => setSessionId(e.target.value)} className={input} required>
              {sessions.length === 0 && <option value="">No meetings yet</option>}
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="d-ef" className={label}>In force from</label>
              <input id="d-ef" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className={input} />
            </div>
            <div>
              <label htmlFor="d-rv" className={label}>Review on</label>
              <input id="d-rv" type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className={input} />
            </div>
          </div>
        </section>

        <section className={card}>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-heading"><Paperclip className="h-4 w-4" aria-hidden /> Attachments</h2>
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
          <p className="text-[12px] text-muted">Up to 20 MB each, e.g. the approval note or circular.</p>
        </section>

        <button type="submit" disabled={pending || text.trim().length < 3 || !sessionId} className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-[15px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
          {pending ? "Recording…" : "Record decision"}
        </button>
      </aside>
    </form>
  );
}
