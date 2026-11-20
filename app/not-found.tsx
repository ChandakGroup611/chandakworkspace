"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Compass, Home, ArrowLeft } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";

const btn = "inline-flex h-9 items-center gap-2 rounded-md px-4 text-[13.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer";

export default function NotFound() {
  useEffect(() => {
    // Log 404 to app_http_errors table
    const pathname = window.location.pathname;
    const search = window.location.search;
    fetch("/api/log-http-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: 404,
        method: "GET",
        path: pathname + search,
        source: "app",
        errorMessage: "Page not found (404)",
        referrer: document.referrer || null
      })
    }).catch(() => { });
  }, []);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-soft-text">
        <Compass className="h-6 w-6" aria-hidden />
      </div>
      <span className="theme-label mb-2">Error 404</span>
      <h1 className="mb-2 text-[22px] font-semibold text-heading">We couldn&apos;t find that page</h1>
      <p className="mb-7 max-w-md text-[14px] text-muted">
        The link you followed may be broken or the page may have moved. Check the address, or go back to continue your work.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <AppButton
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = "/";
            }
          }}
          variant="primary"
          leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}
        >
          Go back
        </AppButton>
        <Link href="/">
          <AppButton variant="outline" leftIcon={<Home className="h-4 w-4" aria-hidden />}>
            Go to home
          </AppButton>
        </Link>
      </div>
    </div>
  );
}
