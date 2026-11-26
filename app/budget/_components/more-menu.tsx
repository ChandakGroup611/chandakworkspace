"use client";

import React, { useEffect, useRef } from "react";

/**
 * "More" menu for the Budget header: holds the less-used links (Approvals, Guide,
 * Masters, Admin) so the header shows one main action. Every link is still one
 * click away. Native <details>, plus close on outside click and Escape.
 */
export function MoreMenu({ active, children }: { active?: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      const el = ref.current;
      if (!el || !el.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <details ref={ref} className={`more-menu${active ? " has-current" : ""}`}>
      <summary className="icon-link" aria-label="More: approvals, guide, masters and admin">
        More
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </summary>
      <div className="more-menu-list">{children}</div>
    </details>
  );
}
