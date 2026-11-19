"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { AppBadge } from "@/components/ui/AppBadge";
import { ShieldAlert, ArrowLeft, Send, CheckCircle2 } from "lucide-react";

interface NoAccessCardProps {
  moduleCode?: string;
  reason?: string;
}

export function NoAccessCard({ moduleCode = "WORKSPACE", reason }: NoAccessCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [justification, setJustification] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRequesting(true);
    // Simulate sending request notification to admin
    await new Promise((r) => setTimeout(r, 600));
    setIsRequesting(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <AppCard className="max-w-md w-full p-6 text-center space-y-5">
        <div className="h-12 w-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">
            You do not currently possess an assigned role or permission to view this module.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-lg text-xs font-mono text-muted-foreground">
          <span>Module:</span>
          <span className="font-semibold text-foreground">{moduleCode}</span>
        </div>

        {submitted ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-xs text-foreground space-y-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">
              Access Request Submitted
            </p>
            <p className="text-muted-foreground">
              Your request has been delivered to the module administrator. You will receive an email once approved.
            </p>
          </div>
        ) : (
          <form onSubmit={handleRequest} className="space-y-3 text-left">
            <label className="text-xs font-medium text-muted-foreground">
              Request justification (optional):
            </label>
            <AppInput
              placeholder="e.g. Need access to manage site drawings for Project A"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
            <AppButton
              type="submit"
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
              disabled={isRequesting}
            >
              <Send className="h-4 w-4" />
              <span>{isRequesting ? "Submitting Request..." : "Request Access"}</span>
            </AppButton>
          </form>
        )}

        <div className="pt-2 border-t border-border">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Workspace Overview</span>
          </Link>
        </div>
      </AppCard>
    </div>
  );
}
