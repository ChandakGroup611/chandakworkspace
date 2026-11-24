"use client";

import React, { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

/**
 * Pick anyone in the company by typing part of their name or email. People already in the
 * meeting are listed first and marked, so it's clear when someone new would be added.
 */
export interface PickPerson {
  id: string;
  full_name: string;
  email?: string | null;
}

export default function PersonPicker({
  people,
  value,
  onChange,
  inMeetingIds,
  placeholder = "Type a name or email",
  id,
}: {
  people: PickPerson[];
  value: string;
  onChange: (id: string) => void;
  inMeetingIds?: Set<string>;
  placeholder?: string;
  id?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = people.find((p) => p.id === value) || null;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const rows = people.filter((p) => !s || p.full_name.toLowerCase().includes(s) || String(p.email || "").toLowerCase().includes(s));
    const inM = inMeetingIds || new Set<string>();
    return rows.sort((a, b) => Number(inM.has(b.id)) - Number(inM.has(a.id)) || a.full_name.localeCompare(b.full_name)).slice(0, 30);
  }, [q, people, inMeetingIds]);

  if (selected && !open) {
    return (
      <div className="flex h-10 items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 text-[14px] text-foreground">
        <span className="truncate">
          {selected.full_name}
          {inMeetingIds && !inMeetingIds.has(selected.id) && <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-[11.5px] font-semibold text-warning-text">Not in this meeting</span>}
        </span>
        <button type="button" onClick={() => { onChange(""); setOpen(true); }} className="text-muted hover:text-foreground" aria-label="Change person">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden />
      <input
        id={id}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
      />
      {open && (
        <ul role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-surface py-1 shadow-lg">
          {list.length === 0 && <li className="px-3 py-2 text-[13px] text-muted">Nobody matches</li>}
          {list.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={p.id === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(p.id); setQ(""); setOpen(false); }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13.5px] text-foreground hover:bg-surface-hover"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.full_name}</span>
                  {p.email && <span className="block truncate text-[12px] text-muted">{p.email}</span>}
                </span>
                {inMeetingIds?.has(p.id) ? (
                  <span className="shrink-0 text-[11.5px] font-medium text-success-text">In meeting</span>
                ) : p.id === value ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
