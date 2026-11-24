import React from "react";
import Link from "next/link";
import { Zap, CheckCircle2, Clock } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { getAlertRules } from "@/lib/actions/meet/sla";
import { getTeamsConnection } from "@/lib/actions/meet/teams-sync";
import AlertRuleToggle from "./AlertRuleToggle";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Automations · Chandak Meet",
  description: "What Chandak Meet does on its own before, during and after meetings",
};

const IST = "Asia/Kolkata";

/** Built-in automations: each one is real code that already runs. */
const BUILT_IN: { when: string; name: string; detail: string; scheduled?: boolean }[] = [
  { when: "Before", name: "Reminder a day before", detail: "Emails everyone invited 24 hours before the meeting, with the agenda and points carried forward.", scheduled: true },
  { when: "Before", name: "Reminder an hour before", detail: "A last reminder 1 hour before, with the join link and room.", scheduled: true },
  { when: "During", name: "Ask to join", detail: "People who weren't invited can ask; the organiser, chair or minute taker admits or denies them.", },
  { when: "During", name: "Release unused rooms", detail: "If nobody checks in to a booked room, the room is freed for others.", scheduled: true },
  { when: "After", name: "Carry forward open points", detail: "When a meeting ends, every point that isn't closed moves to the next meeting in the series." },
  { when: "After", name: "Draft the minutes", detail: "When a meeting ends, minutes are drafted from the notes, points and decisions, ready to review." },
  { when: "After", name: "Send minutes on approval", detail: "Approving the minutes emails them to everyone who attended or was invited." },
  { when: "After", name: "Overdue points tracked", detail: "Points past their due date open an SLA record and show as overdue until they're closed.", scheduled: true },
];

export default async function AutomationsPage() {
  const auth = await requireMeet("MEET_VIEW");
  const isAdmin = auth.isSuperAdmin || auth.isMeetAdmin;

  const [rules, lastReminder, teams] = await Promise.all([
    getAlertRules(),
    supabaseAdmin
      .from("meet_sessions")
      .select("reminder_1h_sent_at")
      .not("reminder_1h_sent_at", "is", null)
      .order("reminder_1h_sent_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r) => (r.data as any)?.reminder_1h_sent_at as string | undefined, () => undefined),
    getTeamsConnection().catch(() => null),
  ]);

  const lastRun = lastReminder
    ? new Date(lastReminder).toLocaleString("en-IN", { timeZone: IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : null;

  const groups = ["Before", "During", "After"];

  return (
    <div className="space-y-6 pb-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-[24px] font-bold tracking-[-0.01em] text-heading">Automations</h1>
        <p className="mt-1 text-[14px] text-subtle">What Chandak Meet does on its own, so nobody has to chase.</p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-muted">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {lastRun ? `Scheduled jobs last sent a reminder on ${lastRun}` : "Scheduled jobs haven't sent a reminder yet"}
        </p>
      </div>

      {teams && (
        <section aria-labelledby="grp-teams" className="rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 id="grp-teams" className="text-[14.5px] font-semibold text-foreground">Microsoft Teams connection</h2>
              <p className="mt-0.5 text-[13.5px] text-subtle">{teams.message}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                teams.signedIn && teams.missing.length === 0 ? "bg-success-soft text-success-text" : "bg-warning-soft text-warning-text"
              }`}
            >
              {teams.signedIn && teams.missing.length === 0 ? "Ready" : "Needs setup"}
            </span>
          </div>
          {isAdmin && teams.missing.length > 0 && (
            <div className="mt-3 rounded-lg bg-sunken p-3 text-[13px] text-subtle">
              <p className="font-semibold text-foreground">For the Microsoft 365 admin</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                {!teams.configured && <li>Register an app in Microsoft Entra and add its tenant ID, client ID and secret to the server settings.</li>}
                <li>
                  Give the app these Microsoft Graph application permissions and grant admin consent:{" "}
                  <span className="font-mono text-[12.5px] text-foreground">{teams.missing.join(", ")}</span>
                </li>
                <li>Allow the app to read users&apos; Teams meetings with a Teams application access policy.</li>
              </ol>
            </div>
          )}
        </section>
      )}

      {groups.map((g) => (
        <section key={g} aria-labelledby={`grp-${g}`}>
          <h2 id={`grp-${g}`} className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">
            {g} the meeting
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {BUILT_IN.filter((a) => a.when === g).map((a) => (
              <li key={a.name} className="flex items-start gap-3 p-4">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-text">
                  <Zap className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-foreground">{a.name}</span>
                  <span className="mt-0.5 block text-[13.5px] text-subtle">{a.detail}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-semibold text-success-text">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> On
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section aria-labelledby="grp-rules">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <h2 id="grp-rules" className="text-[13px] font-semibold uppercase tracking-wide text-muted">Alert rules</h2>
          {isAdmin && (
            <Link href="/meet/admin" className="text-[13.5px] font-semibold text-primary hover:underline">
              Add or edit rules in Settings
            </Link>
          )}
        </div>
        {rules.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-[13.5px] text-subtle">No alert rules yet.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {rules.map((r: any) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-foreground">{r.name}</span>
                  <span className="mt-0.5 block text-[13px] text-subtle">
                    {(r.channels || ["email"]).join(", ")} · {r.timing || "immediate"}
                    {r.throttle_hours ? ` · at most every ${r.throttle_hours}h` : ""}
                  </span>
                </span>
                <AlertRuleToggle rule={r} canEdit={isAdmin} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
