import React from "react";
import Link from "next/link";
import type { AMCHomeData, AMCHomeRow } from "@/lib/actions/amc-home";

/**
 * AMC & Subscriptions home (redesign stage 1): opens on what needs attention instead of totals.
 * Server-rendered; the 30 / 60 / 90 day switch is a link (?win=).
 */

const inr = (n: number) => {
  const v = Math.round(n || 0);
  if (v >= 1e7) return `₹ ${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹ ${(v / 1e5).toFixed(1)} L`;
  return `₹ ${v.toLocaleString("en-IN")}`;
};
const cur = (c: string, n: number) => `${c === "USD" ? "$" : c === "EUR" ? "€" : c === "GBP" ? "£" : c + " "}${Math.round(n).toLocaleString("en-IN")}`;
const inrOnly = (rows: AMCHomeRow[]) => rows.filter((r) => !r.currency || r.currency.toUpperCase() === "INR");
const othersNote = (rows: AMCHomeRow[]) => {
  const m = new Map<string, number>();
  for (const r of rows) if (r.currency && r.currency.toUpperCase() !== "INR") m.set(r.currency.toUpperCase(), (m.get(r.currency.toUpperCase()) || 0) + r.amount);
  return Array.from(m.entries()).map(([c, n]) => `+ ${cur(c, n)}`).join(" ");
};
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
const href = (r: AMCHomeRow) => (r.type === "Subscription" ? `/amc/subscriptions/${r.id}` : `/amc/contracts/${r.id}`);

function DaysChip({ days, pay }: { days: number | null; pay?: boolean }) {
  if (days === null) return null;
  const late = days < 0;
  const soon = days <= 7;
  const cls = late || soon ? "bg-danger-soft text-danger-text" : days <= 30 ? "bg-warning-soft text-warning-text" : "bg-sunken text-subtle";
  const text = late ? `${-days} day${days === -1 ? "" : "s"} late` : days === 0 ? (pay ? "due today" : "today") : `in ${days} day${days === 1 ? "" : "s"}`;
  return <span className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-semibold ${cls}`}>{text}</span>;
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warn" | "danger" }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3.5">
      <div className="text-[13px] text-muted">{label}</div>
      <div className={`mt-1 text-[24px] font-bold tabular-nums ${tone === "danger" ? "text-danger-text" : tone === "warn" ? "text-warning-text" : "text-heading"}`}>{value}</div>
      {sub && <div className="text-[12.5px] text-muted">{sub}</div>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 pb-4 text-[13.5px] text-muted">{children}</p>;
}

export default function AMCHome({ data, win }: { data: AMCHomeData; win: 30 | 60 | 90 }) {
  const renewals = data.renewals.filter((r) => (r.days ?? 999) <= win);
  const in30 = data.renewals.filter((r) => (r.days ?? 999) <= 30);
  const tidy = [
    data.expiredActive.length > 0 && {
      text: `${data.expiredActive.length} past their end date but still marked active`,
      href: data.expiredActive.length === 1 ? href(data.expiredActive[0]) : "/amc/contracts",
      cta: "Fix",
    },
    data.noDocs.length > 0 && {
      text: `${data.noDocs.length} with no PO or agreement uploaded`,
      href: data.noDocs.length === 1 ? href(data.noDocs[0]) : "/amc/contracts",
      cta: "Review",
    },
    data.noPo.length > 0 && {
      text: `${data.noPo.length} with no PO number`,
      href: data.noPo.length === 1 ? href(data.noPo[0]) : "/amc/contracts",
      cta: "Review",
    },
    ...data.seatsTop.slice(0, 2).map((s) => ({ text: `${s.name}: ${s.unused} of ${s.total} seats unused`, href: href(s), cta: "See seats" })),
  ].filter(Boolean) as { text: string; href: string; cta: string }[];

  const maxDept = Math.max(1, ...data.byDepartment.map((d) => d.amount));

  return (
    <div className="space-y-5">
      <p className="text-[15px] text-subtle">
        {in30.length || data.payments.length
          ? `${in30.length} renewal${in30.length === 1 ? "" : "s"} in the next 30 days and ${data.payments.length} payment${data.payments.length === 1 ? "" : "s"} due.`
          : "Nothing renewing or due in the next 30 days."}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Active contracts and subscriptions"
          value={String(data.activeCount)}
          sub={`${inr(data.activeValue)} total value${data.otherCurrencies.length ? ` + ${data.otherCurrencies.map((o) => `${cur(o.currency, o.amount)} in ${o.count} ${o.currency}`).join(", ")}` : ""}`}
        />
        <Tile
          label="Renewing in 30 days"
          value={String(in30.length)}
          sub={in30.length ? `${inr(inrOnly(in30).reduce((s, r) => s + r.amount, 0))} at today's price ${othersNote(in30)}`.trim() : undefined}
          tone={in30.length ? "warn" : undefined}
        />
        <Tile label="Payments due (30 days)" value={inr(data.dueValue)} sub={`${data.overdueCount ? `${data.overdueCount} overdue` : `${data.payments.length} pending`} ${othersNote(data.payments)}`.trim()} tone={data.overdueCount ? "danger" : undefined} />
        <Tile label="Unused seats" value={String(data.unusedSeats)} sub={data.unusedSeats ? `about ${inr(data.unusedSeatsValue)} of spend` : undefined} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="h-renew" className="rounded-xl border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-4">
            <h2 id="h-renew" className="text-[16px] font-semibold text-heading">Renewing soon</h2>
            <nav aria-label="Renewal window" className="flex gap-1">
              {[30, 60, 90].map((d) => (
                <Link
                  key={d}
                  href={d === 30 ? "/amc" : `/amc?win=${d}`}
                  aria-current={win === d ? "page" : undefined}
                  className={`inline-flex h-8 items-center rounded-lg border px-3 text-[13px] font-semibold ${
                    win === d ? "border-primary bg-accent-soft text-accent-soft-text" : "border-border bg-surface text-subtle hover:bg-surface-hover"
                  }`}
                >
                  {d} days
                </Link>
              ))}
            </nav>
          </div>
          {renewals.length === 0 ? (
            <Empty>Nothing renews in the next {win} days.</Empty>
          ) : (
            <ul>
              {renewals.slice(0, 12).map((r) => (
                <li key={r.id} className="border-t border-border">
                  <Link href={href(r)} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-foreground">{r.name}</span>
                      <span className="block truncate text-[12.5px] text-muted">
                        {[r.vendor, r.type, r.owner && `owner ${r.owner}`, `ends ${date(r.date)}`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="hidden w-24 text-right text-[14px] font-semibold tabular-nums sm:block">{!r.currency || r.currency.toUpperCase() === "INR" ? inr(r.amount) : cur(r.currency.toUpperCase(), r.amount)}</span>
                    <DaysChip days={r.days} />
                  </Link>
                </li>
              ))}
              {renewals.length > 12 && <li className="border-t border-border px-4 py-2.5 text-[13px] text-muted">+{renewals.length - 12} more</li>}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          <section aria-labelledby="h-pay" className="rounded-xl border border-border bg-surface">
            <h2 id="h-pay" className="px-4 pb-2 pt-4 text-[16px] font-semibold text-heading">Payments due</h2>
            {data.payments.length === 0 ? (
              <Empty>No payments due in the next 30 days.</Empty>
            ) : (
              <ul>
                {data.payments.slice(0, 6).map((p, i) => (
                  <li key={`${p.id}-${i}`} className="border-t border-border">
                    <Link href={href(p)} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold text-foreground">{p.name}</span>
                        <span className="block truncate text-[12.5px] text-muted">{p.invoice} · due {date(p.date)}</span>
                      </span>
                      <span className="text-[14px] font-semibold tabular-nums">{!p.currency || p.currency.toUpperCase() === "INR" ? inr(p.amount) : cur(p.currency.toUpperCase(), p.amount)}</span>
                      <DaysChip days={p.days} pay />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="h-tidy" className="rounded-xl border border-border bg-surface">
            <h2 id="h-tidy" className="px-4 pb-2 pt-4 text-[16px] font-semibold text-heading">To tidy up</h2>
            {tidy.length === 0 ? (
              <Empty>Everything looks complete.</Empty>
            ) : (
              <ul>
                {tidy.map((t) => (
                  <li key={t.text} className="border-t border-border">
                    <Link href={t.href} className="flex items-center gap-3 px-4 py-3 text-[14px] hover:bg-surface-hover">
                      <span className="min-w-0 flex-1 text-foreground">{t.text}</span>
                      <span className="shrink-0 text-[13px] font-semibold text-primary">{t.cta}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {data.byDepartment.length > 0 && (
        <section aria-labelledby="h-dept" className="rounded-xl border border-border bg-surface p-4">
          <h2 id="h-dept" className="mb-3 text-[16px] font-semibold text-heading">Spend by department <span className="text-[13px] font-normal text-muted">(rupee contracts)</span></h2>
          <ul className="space-y-2.5">
            {data.byDepartment.map((d) => (
              <li key={d.name} className="flex items-center gap-3 text-[13.5px]">
                <span className="w-36 shrink-0 truncate text-subtle">{d.name}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (d.amount / maxDept) * 100)}%` }} />
                </span>
                <span className="w-24 shrink-0 text-right font-semibold tabular-nums">{inr(d.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
