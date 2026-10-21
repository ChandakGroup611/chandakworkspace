import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Record detail pages (Requirement details, Ticket, Vehicle, Drawing, Vendor, User…).
 * Anatomy: back link → title + code + status → meta line → actions on the right,
 * then a 2-column body: main content (tabs) + right "Details" card of key/values.
 */

export function DetailHeader({
  backHref,
  backLabel = "Back",
  code,
  title,
  status,
  meta,
  actions,
}: {
  backHref?: string;
  backLabel?: string;
  /** Business reference, e.g. "TKT-2041", "MH-12-AB-1234", "DRG-A-104 R3" */
  code?: string;
  title: string;
  status?: React.ReactNode;
  /** Short facts under the title: "Created 16 Oct 2026 by Priya · Head Office" */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {backHref && (
          <Link href={backHref} className="mb-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-soft-text hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> {backLabel}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {code && <span className="font-mono text-[12.5px] font-medium text-accent-soft-text">{code}</span>}
          <h1 className="min-w-0 text-[22px] font-semibold leading-tight tracking-[-0.01em] text-heading">{title}</h1>
          {status}
        </div>
        {meta && <p className="mt-1 text-[13px] text-muted">{meta}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Main + side layout. Side column collapses under main below lg. */
export function DetailLayout({ main, side, className }: { main: React.ReactNode; side?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]", className)}>
      <div className="min-w-0 space-y-5">{main}</div>
      {side && <aside className="space-y-5">{side}</aside>}
    </div>
  );
}

export interface KV { label: string; value: React.ReactNode; full?: boolean }

/**
 * Label/value list. v1 detail pages used bold uppercase labels with the value in the same
 * weight, so nothing stood out. Labels are muted 12.5px; values are 13.5px foreground.
 * Empty values show "—" instead of disappearing (which shifted the layout).
 */
export function KeyValueGrid({ items, cols = 2, className }: { items: KV[]; cols?: 1 | 2 | 3; className?: string }) {
  const grid = { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" }[cols];
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", grid, className)}>
      {items.map((it) => (
        <div key={it.label} className={cn("min-w-0", it.full && "col-span-full")}>
          <dt className="text-[12.5px] text-muted">{it.label}</dt>
          <dd className="mt-0.5 break-words text-[13.5px] text-foreground">
            {it.value === null || it.value === undefined || it.value === "" ? <span className="text-muted">—</span> : it.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Titled card for the detail side column / sections. */
export function DetailCard({ title, actions, children, className }: { title: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("theme-card-structural", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-[14px] font-semibold text-heading">{title}</h2>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
