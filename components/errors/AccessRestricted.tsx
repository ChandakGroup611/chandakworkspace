"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home, Send, CheckCircle2 } from "lucide-react";
import { AppButton } from "@/components/ui/AppButton";

interface AccessRestrictedProps {
  requiredRole?: string;
  requiredPermission?: string;
  moduleName?: string;
  customMessage?: string;
}

export function AccessRestricted({
  requiredRole = "an authorized role",
  requiredPermission,
  moduleName = "this module",
  customMessage
}: AccessRestrictedProps) {
  const [requestSent, setRequestSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Log the 403 app refusal to app_http_errors
    const path = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    fetch("/api/log-http-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: 403,
        method: "GET",
        path,
        source: "app",
        errorMessage: `Access Restricted: Requires ${requiredRole} (${requiredPermission || "N/A"}) in ${moduleName}`,
        module: moduleName
      })
    }).catch(() => {});
  }, [requiredRole, requiredPermission, moduleName]);

  const handleRequestAccess = async () => {
    setIsSubmitting(true);
    try {
      // Send notification or audit entry for access request
      await fetch("/api/log-http-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: 403,
          method: "POST",
          path: window.location.pathname,
          source: "app",
          errorMessage: `User requested access: ${requiredRole} in ${moduleName}`,
          metadata: { requestedRole: requiredRole, module: moduleName, action: "REQUEST_ACCESS" }
        })
      });
      setRequestSent(true);
    } catch {
      // Gracefully show sent state
      setRequestSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const btnBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center animate-in fade-in duration-200">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-sm">
        <ShieldAlert className="h-8 w-8" aria-hidden />
      </div>

      <span className="mb-2 text-xs font-semibold tracking-wider uppercase text-amber-600 dark:text-amber-400">
        Access Restricted
      </span>

      <h1 className="mb-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Permission Required
      </h1>

      <p className="mb-8 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
        {customMessage || (
          <>
            You need <span className="font-semibold text-foreground">{requiredRole}</span> in{" "}
            <span className="font-semibold text-foreground">{moduleName}</span> to view or perform actions in this workspace.
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {!requestSent ? (
          <AppButton
            onClick={handleRequestAccess}
            disabled={isSubmitting}
            variant="primary"
            leftIcon={<Send className="h-4 w-4" aria-hidden />}
          >
            {isSubmitting ? "Submitting request..." : "Request access"}
          </AppButton>
        ) : (
          <div className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Access request sent to administrator
          </div>
        )}

        <AppButton
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = "/";
            }
          }}
          variant="outline"
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

export default AccessRestricted;
