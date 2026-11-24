"use client";

import React, { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Server, Plug, Send, Save } from "lucide-react";
import { saveMeetSmtp, testMeetSmtp, sendMeetSmtpTestEmail, type MeetSmtpForm } from "@/lib/actions/meet/mail-server";

const input = "h-10 w-full rounded-md border border-border bg-surface px-3 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none";
const label = "mb-1 block text-[13px] font-semibold text-foreground";

/** Settings › Email sending: Chandak Meet's own SMTP server. */
export default function MeetMailServerCard({ initial }: { initial: MeetSmtpForm }) {
  const [f, setF] = useState({ ...initial, password: "" });
  const [pending, start] = useTransition();
  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));
  const payload = () => ({ active: f.active, host: f.host, port: Number(f.port), username: f.username, password: f.password, sender_name: f.sender_name, from_email: f.from_email, reply_to: f.reply_to });

  return (
    <section className="theme-card-structural overflow-hidden p-0" aria-labelledby="mail-h">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-sunken px-5 py-4">
        <div className="flex items-center gap-3">
          <Server className="h-5 w-5 text-primary" aria-hidden />
          <div>
            <h2 id="mail-h" className="text-[15px] font-semibold text-heading">Chandak Meet mail server (SMTP)</h2>
            <p className="text-[12.5px] text-muted">Meet emails (invites, reminders, minutes, tasks) go out through this server.</p>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-foreground">
          <input type="checkbox" role="switch" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4" />
          {f.active ? "On" : "Off"}
        </label>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label htmlFor="ms-host" className={label}>SMTP server</label>
          <input id="ms-host" value={f.host} onChange={(e) => set("host", e.target.value)} placeholder="smtp.office365.com" className={input} />
        </div>
        <div>
          <label htmlFor="ms-port" className={label}>Port</label>
          <input id="ms-port" type="number" value={f.port} onChange={(e) => set("port", e.target.value)} placeholder="587" className={input} />
        </div>
        <div>
          <label htmlFor="ms-user" className={label}>Username / email</label>
          <input id="ms-user" value={f.username} onChange={(e) => set("username", e.target.value)} placeholder="meet@chandakgroup.com" autoComplete="off" className={input} />
        </div>
        <div>
          <label htmlFor="ms-pass" className={label}>Password / app password</label>
          <input id="ms-pass" type="password" value={f.password} onChange={(e) => set("password", e.target.value)} placeholder={initial.hasPassword ? "Saved. Type a new one to change it" : "Password"} autoComplete="new-password" className={input} />
        </div>
        <div>
          <label htmlFor="ms-name" className={label}>Sender name</label>
          <input id="ms-name" value={f.sender_name} onChange={(e) => set("sender_name", e.target.value)} placeholder="Chandak Meet" className={input} />
        </div>
        <div>
          <label htmlFor="ms-from" className={label}>From address</label>
          <input id="ms-from" value={f.from_email} onChange={(e) => set("from_email", e.target.value)} placeholder="meet@chandakgroup.com" className={input} />
        </div>
        <div>
          <label htmlFor="ms-reply" className={label}>Reply-to address <span className="font-normal text-muted">(optional)</span></label>
          <input id="ms-reply" value={f.reply_to} onChange={(e) => set("reply_to", e.target.value)} placeholder="Same as From" className={input} />
        </div>
        <div className="rounded-md bg-sunken p-3 text-[12.5px] text-subtle sm:self-end">
          {f.active ? "On: Meet uses this server. If it fails, the email goes through the Workspace server instead." : "Off: Meet emails go through the Workspace mail server."}
          {initial.workspaceServer && <span className="block text-muted">Workspace server: {initial.workspaceServer}</span>}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-sunken px-5 py-3">
        <button type="button" disabled={pending || !f.host} onClick={() => start(async () => { const r = await testMeetSmtp(payload()); r.success ? toast.success("Connected and signed in") : toast.error(r.error || "Couldn't connect"); })} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-[14px] font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50">
          <Plug className="h-4 w-4" aria-hidden /> Test connection
        </button>
        <button type="button" disabled={pending || !initial.host} onClick={() => start(async () => { const r = await sendMeetSmtpTestEmail(); r.success ? toast.success(`Test email sent to ${r.to}`) : toast.error(r.error || "Couldn't send"); })} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-[14px] font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50">
          <Send className="h-4 w-4" aria-hidden /> Send test email
        </button>
        <button type="button" disabled={pending} onClick={() => start(async () => { const r = await saveMeetSmtp(payload()); if (r.success) { toast.success("Saved"); setF((x) => ({ ...x, password: "" })); } else toast.error(r.error || "Couldn't save"); })} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-[14px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
          <Save className="h-4 w-4" aria-hidden /> Save
        </button>
      </div>
    </section>
  );
}
