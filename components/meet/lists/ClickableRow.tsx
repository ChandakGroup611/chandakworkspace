"use client";

import React from "react";
import { useRouter } from "next/navigation";

/** A table row that opens its record when clicked anywhere (links and buttons inside still work). */
export default function ClickableRow({ href, className = "", children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      className={`cursor-pointer hover:bg-surface-hover ${className}`}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest("a,button,input,select,textarea,label,[role=menu]")) return;
        if (window.getSelection()?.toString()) return;
        if (e.metaKey || e.ctrlKey) window.open(href, "_blank");
        else router.push(href);
      }}
    >
      {children}
    </tr>
  );
}
