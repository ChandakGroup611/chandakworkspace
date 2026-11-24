"use client";

import React from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";

/**
 * Filter bar for the Meet list pages. It's a plain GET form, so filters live in the URL
 * (shareable, back button works). Dropdowns apply as soon as they change.
 */

export interface FilterField {
  name: string;
  label: string;
  type: "select" | "date";
  value?: string;
  options?: { id: string; label: string }[];
  /** Label for the empty option ("Any"). Omit to have no empty option. */
  anyLabel?: string;
}

export default function ListFilters({
  action,
  fields,
  search,
  searchPlaceholder = "Search",
  hidden = {},
  resultLabel,
}: {
  action: string;
  fields: FilterField[];
  search?: string;
  searchPlaceholder?: string;
  hidden?: Record<string, string>;
  resultLabel?: string;
}) {
  const active = fields.some((f) => f.value && f.anyLabel !== undefined) || !!search;
  const submit = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => e.currentTarget.form?.requestSubmit();
  const input = "h-9 rounded-md border border-border bg-surface px-2.5 text-[13.5px] text-foreground focus:border-primary focus:outline-none";
  return (
    <form action={action} method="get" className="theme-card-structural flex flex-wrap items-end gap-2.5 p-3">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label className="relative min-w-[200px] flex-[1_1_220px]">
        <span className="mb-1 block text-[12px] font-medium text-muted">Search</span>
        <Search className="pointer-events-none absolute bottom-2.5 left-2.5 h-4 w-4 text-muted" aria-hidden />
        <input type="search" name="q" defaultValue={search} placeholder={searchPlaceholder} className={`${input} w-full pl-8`} />
      </label>
      {fields.map((f) => (
        <label key={f.name} className="min-w-[140px] flex-[0_1_200px]">
          <span className="mb-1 block text-[12px] font-medium text-muted">{f.label}</span>
          {f.type === "select" ? (
            <select name={f.name} defaultValue={f.value || ""} onChange={submit} className={`${input} w-full`}>
              {f.anyLabel !== undefined && <option value="">{f.anyLabel}</option>}
              {(f.options || []).map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input type="date" name={f.name} defaultValue={f.value || ""} onChange={submit} className={`${input} w-full`} />
          )}
        </label>
      ))}
      <div className="flex items-center gap-2">
        <button type="submit" className="h-9 rounded-md border border-border bg-surface px-3 text-[13.5px] font-semibold text-foreground hover:bg-surface-hover">Apply</button>
        {active && (
          <Link href={action + (hidden.tab ? `?tab=${hidden.tab}` : "")} className="inline-flex h-9 items-center gap-1 px-1 text-[13px] font-medium text-primary hover:underline">
            <X className="h-3.5 w-3.5" aria-hidden /> Clear
          </Link>
        )}
      </div>
      {resultLabel && <p className="basis-full text-[12.5px] text-muted">{resultLabel}</p>}
    </form>
  );
}
