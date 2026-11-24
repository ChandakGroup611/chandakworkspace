"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string;
  priority?: string;
  type?: "point" | "task" | "session" | "meeting" | "priority";
  className?: string;
}

export function StatusBadge({ status, priority, type = "point", className }: StatusBadgeProps) {
  const activeStatus = priority || status || "unknown";
  let label = activeStatus.replace(/_/g, " ");
  // Capitalize words
  label = label.charAt(0).toUpperCase() + label.slice(1);
  // Plain words for meeting states
  const PLAIN: Record<string, string> = {
    mom_draft: "Ended · minutes pending",
    completed: type === "session" ? "Ended · minutes pending" : "Completed",
    mom_pending_approval: "Minutes waiting for approval",
    mom_published: "Minutes sent",
    published: "Minutes sent",
    in_progress: type === "session" ? "Live now" : "In progress",
  };
  if (PLAIN[activeStatus.toLowerCase()]) label = PLAIN[activeStatus.toLowerCase()];

  let colorClasses = "bg-elevated text-subtle border-border";

  switch (activeStatus.toLowerCase()) {
    // Points & Tasks Statuses
    case "open":
    case "not_started":
    case "scheduled":
      colorClasses = "bg-info-soft text-info-text border-info-border";
      break;
    case "in_progress":
      colorClasses = "bg-warning-soft text-warning-text border-warning-border";
      break;
    case "completed":
    case "closed":
    case "mom_published":
    case "published":
    case "active":
      colorClasses = "bg-success-soft text-success-text border-success-border";
      break;
    case "on_hold":
    case "paused":
    case "tentative":
      colorClasses = "bg-sunken text-muted border-border";
      break;
    case "dropped":
    case "cancelled":
      colorClasses = "bg-danger-soft text-danger-text border-danger-border";
      break;
    case "reopened":
    case "mom_draft":
    case "mom_pending_approval":
      colorClasses = "bg-accent-soft text-accent-soft-text border-border";
      break;

    // Priority
    case "critical":
      colorClasses = "bg-danger-soft text-danger-text border-danger-border font-medium";
      break;
    case "high":
      colorClasses = "bg-warning-soft text-warning-text border-warning-border";
      break;
    case "medium":
      colorClasses = "bg-info-soft text-info-text border-info-border";
      break;
    case "low":
      colorClasses = "bg-elevated text-subtle border-border";
      break;

    // TAT result
    case "within_tat":
      colorClasses = "bg-success-soft text-success-text border-success-border";
      label = "Within TAT";
      break;
    case "breached":
      colorClasses = "bg-danger-soft text-danger-text border-danger-border";
      label = "TAT Breached";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11.5px] font-medium border leading-4 tracking-tight whitespace-nowrap",
        colorClasses,
        className
      )}
    >
      {label}
    </span>
  );
}
