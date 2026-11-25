import React from "react";
import { cn } from "@/lib/utils";
import { initials } from "./format";

/**
 * Avatar + name that never gets clipped by the next column. v1 cut names to "Komal Pa…"
 * and "Rahil Sha…" because the sticky Actions column was drawn on top of the Assignee column.
 * Full name is always available on hover and to screen readers.
 */
export function UserCell({
  name,
  photo,
  subtitle,
  className,
  emptyLabel = "Unassigned",
}: {
  name?: string | null;
  photo?: string | null;
  subtitle?: string | null;
  className?: string;
  emptyLabel?: string;
}) {
  if (!name) return <span className="text-muted">{emptyLabel}</span>;
  return (
    <span className={cn("inline-flex min-w-0 max-w-full items-center gap-2", className)} title={name}>
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-[11px] font-semibold text-accent-soft-text">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(name)
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-foreground">{name}</span>
        {subtitle && <span className="block truncate text-[11.5px] text-muted">{subtitle}</span>}
      </span>
    </span>
  );
}

/** Up to N overlapping avatars + "+3" for multi-assignee rows. */
export function UserStack({ users, max = 3 }: { users: { name: string; photo?: string | null }[]; max?: number }) {
  if (!users.length) return <span className="text-muted">Unassigned</span>;
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <span className="inline-flex items-center" title={users.map((u) => u.name).join(", ")}>
      {shown.map((u, i) => (
        <span
          key={`${u.name}-${i}`}
          className="-ml-1.5 first:ml-0 inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-accent-soft text-[11px] font-semibold text-accent-soft-text"
        >
          {u.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.photo} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(u.name)
          )}
        </span>
      ))}
      {rest > 0 && <span className="ml-1.5 text-[12px] text-muted tabular">+{rest}</span>}
      <span className="sr-only">{users.map((u) => u.name).join(", ")}</span>
    </span>
  );
}
