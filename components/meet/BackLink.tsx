"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/**
 * "Back" link for Meet detail pages. Goes back in history when the user came from inside the
 * app (so filters on the list they came from are kept); otherwise opens the given page.
 */
export default function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        try {
          // More than one Meet page seen in this tab: going back stays inside the app
          if (Number(sessionStorage.getItem("meet_nav_depth") || "0") > 1 && window.history.length > 1) {
            e.preventDefault();
            router.back();
          }
        } catch {
          /* fall through to href */
        }
      }}
      className="inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-foreground"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden /> {label}
    </Link>
  );
}
