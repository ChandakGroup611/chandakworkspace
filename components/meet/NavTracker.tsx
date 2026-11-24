"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Counts page views inside Meet in this tab, so BackLink knows whether "back" stays in the app. */
export default function NavTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const n = Number(sessionStorage.getItem("meet_nav_depth") || "0");
      sessionStorage.setItem("meet_nav_depth", String(n + 1));
    } catch {
      /* storage blocked: BackLink falls back to its href */
    }
  }, [pathname]);
  return null;
}
