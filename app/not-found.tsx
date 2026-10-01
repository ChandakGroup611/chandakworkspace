import React from "react";
import Link from "next/link";
import { AppButton } from "@/components/ui/AppButton";
import { Compass, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="h-16 w-16 rounded-2xl bg-theme-btn-primary/10 text-theme-icon flex items-center justify-center mb-6 border border-theme-btn-primary/20">
        <Compass className="h-8 w-8 animate-pulse" />
      </div>

      <span className="text-xs font-bold uppercase tracking-widest text-theme-icon mb-2">
        404 — Page Not Found
      </span>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
        The requested resource does not exist
      </h1>

      <p className="text-sm text-muted max-w-md mb-8">
        The page you are looking for may have been moved, renamed, or is unavailable in your current module context.
      </p>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Link href="/">
          <AppButton variant="primary" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span>Return to Workspace</span>
          </AppButton>
        </Link>
        <Link href="/select-module">
          <AppButton variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Switch Module</span>
          </AppButton>
        </Link>
      </div>
    </div>
  );
}
