"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

/** "Open" plus a ⋯ menu of more actions for a list row. */
export default function RowMenu({ open, items }: { open: string; items: { label: string; href: string; danger?: boolean }[] }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!show) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setShow(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [show]);
  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      <Link href={open} className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-[13px] font-semibold text-foreground hover:bg-surface-hover">Open</Link>
      {items.length > 0 && (
        <button type="button" aria-label="More actions" aria-expanded={show} onClick={() => setShow((v) => !v)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-hover">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
      {show && (
        <div role="menu" className="absolute right-0 top-9 z-30 w-48 overflow-hidden rounded-md border border-border bg-surface py-1 text-left shadow-lg">
          {items.map((i) => (
            <Link key={i.label} role="menuitem" href={i.href} className={`block px-3 py-2 text-[13.5px] hover:bg-surface-hover ${i.danger ? "text-danger-text" : "text-foreground"}`}>
              {i.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
