"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Send, CheckCircle2, Clock } from "lucide-react";
import { saveMeetEmail, sendMeetTestEmail, type MeetEmailSetup } from "@/lib/actions/meet/email-setup";
import { MEET_MERGE_TAGS, REMINDER_TIMINGS } from "@/lib/utils/meet-email-config";

const input =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const TAG_LABEL: Record<string, string> = {
  recipient_name: "Their name",
  meeting_title: "Meeting title",
  meeting_code: "Meeting ID",
  session_code: "Session code",
  start_time: "Date and time",
  room: "Room",
  join_link: "Teams link",
  link: "Link to open it",
  organiser_name: "Organiser",
  point_code: "Point code",
  point_title: "Point",
  points_list: "Their open points",
  task_code: "Task code",
  task_title: "Task",
  due_date: "Due date",
  carry_count: "Times carried",
};

const timingLabel = (m: number | null) =>
  m ? REMINDER_TIMINGS.find((t) => t.minutes === m)?.label || `${m} minutes before` : "";

/** Unescape what saveMeetEmail stored so plain-text bodies edit as plain text again. */
const toPlain = (html: string) =>
  /<(?!br\s*\/?>)[a-z][\s\S]*>/i.test(html)
    ? html
    : html.replace(/<br\s*\/?>/gi, "\n").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

export default function MeetEmailEditor({ items, canEdit, smtpReady }: { items: MeetEmailSetup[]; canEdit: boolean; smtpReady: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(items[0]?.event || "");
  const item = useMemo(() => items.find((i) => i.event === selected) || items[0], [items, selected]);

  const [form, setForm] = useState(() => formFor(items[0]));
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const bodyRef = React.useRef<HTMLTextAreaElement | null>(null);

  function formFor(i?: MeetEmailSetup) {
    return {
      subject: i?.template?.subject || "",
      body: toPlain(i?.template?.body || ""),
      recipients: i?.rule?.recipients?.length ? i.rule.recipients : i ? [i.roles[0]] : [],
      timing: i?.rule?.timingMinutes || (i?.event === "Reminder 1" ? 1440 : i?.event === "Reminder 2" ? 60 : i?.event === "Reminder 3" ? 15 : 1440),
      active: i ? !!(i.template?.active && i.rule?.active) : false,
    };
  }

  const pick = (ev: string) => {
    setSelected(ev);
    setForm(formFor(items.find((i) => i.event === ev)));
    setMsg(null);
  };

  const insertTag = (tag: string) => {
    const el = bodyRef.current;
    const token = `{{${tag}}}`;
    if (!el) return setForm((f) => ({ ...f, body: f.body + token }));
    const start = el.selectionStart ?? form.body.length;
    const end = el.selectionEnd ?? form.body.length;
    const next = form.body.slice(0, start) + token + form.body.slice(end);
    setForm((f) => ({ ...f, body: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  };

  const save = async () => {
    if (!item) return;
    setBusy("save");
    setMsg(null);
    const r = await saveMeetEmail({
      event: item.event,
      subject: form.subject,
      body: form.body,
      recipients: form.recipients,
      timingMinutes: item.isReminder ? form.timing : null,
      active: form.active,
    });
    setBusy(null);
    setMsg(r.success ? { ok: true, text: form.active ? "Saved. This email is on." : "Saved. This email is off." } : { ok: false, text: r.error || "Couldn't save." });
    if (r.success) router.refresh();
  };

  const test = async () => {
    setBusy("test");
    setMsg(null);
    const r = await sendMeetTestEmail({ subject: form.subject, body: form.body });
    setBusy(null);
    setMsg(r.success ? { ok: true, text: `Test sent to ${r.to} with sample values.` } : { ok: false, text: r.error || "Couldn't send the test." });
  };

  if (!item) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Events */}
      <nav aria-label="Meet emails" className="rounded-xl border border-border bg-surface p-2 lg:self-start">
        <ul className="space-y-0.5">
          {items.map((i) => (
            <li key={i.event}>
              <button
                type="button"
                onClick={() => pick(i.event)}
                aria-current={i.event === item.event ? "true" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left ${
                  i.event === item.event ? "bg-accent-soft text-accent-soft-text" : "text-foreground hover:bg-surface-hover"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{i.event}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {i.isReminder && i.rule?.timingMinutes ? timingLabel(i.rule.timingMinutes) : i.when}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${i.sending ? "bg-success-soft text-success-text" : "bg-sunken text-subtle"}`}>
                  {i.sending ? "On" : "Off"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Editor */}
      <section aria-labelledby="ed-h" className="space-y-5 rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="ed-h" className="flex items-center gap-2 text-[18px] font-semibold text-heading">
              <Mail className="h-5 w-5 text-primary" aria-hidden /> {item.event}
            </h2>
            <p className="mt-0.5 text-[13.5px] text-subtle">{item.when}</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-semibold text-foreground">
            <input
              type="checkbox"
              checked={form.active}
              disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="h-5 w-5 rounded border-border"
            />
            Send this email
          </label>
        </div>

        {!smtpReady && (
          <p role="note" className="rounded-lg bg-warning-soft p-3 text-[13.5px] text-warning-text">
            No SMTP connection is switched on yet (Settings › Communication › Providers), so nothing can be delivered.
          </p>
        )}

        {item.isReminder && (
          <div>
            <label htmlFor="ed-time" className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <Clock className="h-4 w-4" aria-hidden /> When
            </label>
            <select
              id="ed-time"
              value={form.timing}
              disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, timing: Number(e.target.value) }))}
              className={`${input} max-w-xs`}
            >
              {REMINDER_TIMINGS.map((t) => (
                <option key={t.minutes} value={t.minutes}>{t.label} the meeting</option>
              ))}
            </select>
            <p className="mt-1 text-[12.5px] text-muted">Based on each meeting&apos;s start time. Use Reminder 2 and 3 for more reminders at other times.</p>
          </div>
        )}

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-foreground">Send to</legend>
          <div className="flex flex-wrap gap-2">
            {item.roles.map((role) => {
              const on = form.recipients.includes(role);
              return (
                <label
                  key={role}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-[13.5px] font-medium ${
                    on ? "border-primary bg-accent-soft text-accent-soft-text" : "border-border bg-background text-subtle hover:bg-surface-hover"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        recipients: e.target.checked ? [...f.recipients, role] : f.recipients.filter((r) => r !== role),
                      }))
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  {role}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="ed-subj" className="mb-1.5 block text-[13px] font-semibold text-foreground">Subject</label>
          <input
            id="ed-subj"
            value={form.subject}
            disabled={!canEdit}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="e.g. Reminder: {{meeting_title}} at {{start_time}}"
            className={input}
          />
        </div>

        <div>
          <label htmlFor="ed-body" className="mb-1.5 block text-[13px] font-semibold text-foreground">Message</label>
          <textarea
            id="ed-body"
            ref={bodyRef}
            rows={10}
            value={form.body}
            disabled={!canEdit}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder={"Dear {{recipient_name}},\n\n{{meeting_title}} is on {{start_time}} in {{room}}.\nJoin: {{join_link}}\n\nRegards,\nChandak Group"}
            className={`${input} font-mono text-[13.5px] leading-relaxed`}
          />
          <div className="mt-2">
            <span className="text-[12.5px] font-semibold text-muted">Insert:</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {MEET_MERGE_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => insertTag(t)}
                  disabled={!canEdit}
                  title={`{{${t}}}`}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[12.5px] text-foreground hover:bg-surface-hover disabled:opacity-50"
                >
                  {TAG_LABEL[t] || t}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[12px] text-muted">Plain text is fine; line breaks are kept. HTML works too.</p>
          </div>
        </div>

        {msg && (
          <p role="status" className={`flex items-center gap-1.5 text-[13.5px] ${msg.ok ? "text-success-text" : "text-danger-text"}`}>
            {msg.ok && <CheckCircle2 className="h-4 w-4" aria-hidden />} {msg.text}
          </p>
        )}

        {canEdit ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={test}
              disabled={!!busy || !form.body.trim()}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-4 text-[14px] font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50"
            >
              {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />} Send me a test
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!!busy}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save
            </button>
          </div>
        ) : (
          <p className="border-t border-border pt-4 text-[13px] text-muted">Only a Meet admin can change emails.</p>
        )}
      </section>
    </div>
  );
}
