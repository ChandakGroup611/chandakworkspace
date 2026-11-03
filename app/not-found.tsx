import React from "react";
import Link from "next/link";
import { Compass, Home, ArrowLeft } from "lucide-react";

const btn = "inline-flex h-9 items-center gap-2 rounded-md px-4 text-[13.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-soft-text">
        <Compass className="h-6 w-6" aria-hidden />
      </div>
      <span className="theme-label mb-2">Error 404</span>
      <h1 className="mb-2 text-[22px] font-semibold text-heading">We couldn&apos;t find that page</h1>
      <p className="mb-7 max-w-md text-[14px] text-muted">
        It may have moved, or it belongs to a module you don&apos;t have open. Check the address, or go back to your workspace.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link href="/" className={`${btn} bg-primary text-primary-foreground hover:bg-primary-hover`}>
          <Home className="h-4 w-4" aria-hidden /> Go to my workspace
        </Link>
        <Link href="/select-module?choose=1" className={`${btn} text-foreground hover:bg-surface-hover`}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Switch module
        </Link>
      </div>
    </div>
  );
}
