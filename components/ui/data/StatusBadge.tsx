import React from "react";
import { AppBadge, type AppBadgeProps } from "../AppBadge";

export type StatusTone = "neutral" | "info" | "accent" | "warning" | "success" | "danger";

/**
 * One meaning per colour across the whole product:
 *   info    = new / not started        accent  = actively being worked
 *   warning = needs attention / waiting on someone with a deadline
 *   success = done                      danger  = overdue, blocked, rejected, breached
 *   neutral = parked / cancelled / unknown
 *
 * v1 pages drew statuses as DASHED outlines in raw colours: "NEW" in red (reads as an
 * error), "Follow Up" yellow-on-white (~1.6:1, unreadable), "Work In Progress" orange.
 */
const DEFAULT_MAP: Record<string, StatusTone> = {
  new: "info", open: "info", "not started": "info", todo: "info", "to do": "info", draft: "neutral",
  "work in progress": "accent", "in progress": "accent", wip: "accent", "in review": "accent", review: "accent", assigned: "accent", "under review": "accent",
  "follow up": "warning", "follow-up": "warning", followup: "warning", pending: "warning", "pending approval": "warning", "awaiting approval": "warning", "waiting on vendor": "warning", "waiting for vendor": "warning", "due soon": "warning", reopened: "warning",
  "on hold": "neutral", hold: "neutral", parked: "neutral", deferred: "neutral", cancelled: "neutral", canceled: "neutral", archived: "neutral",
  completed: "success", complete: "success", done: "success", closed: "success", resolved: "success", approved: "success", delivered: "success", cleared: "success", met: "success",
  overdue: "danger", blocked: "danger", rejected: "danger", escalated: "danger", breached: "danger", failed: "danger", critical: "danger",
};

const key = (s: string) => s.trim().toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ");

/** "WORK_IN_PROGRESS" / "work in progress" → "Work in progress"; keeps mixed-case labels as given. */
export function prettyStatus(label: string) {
  const s = label.trim().replace(/_/g, " ").replace(/\s+/g, " ");
  if (s === s.toUpperCase() || s === s.toLowerCase()) return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return s;
}

export function statusTone(status: string | null | undefined, overrides?: Record<string, StatusTone>): StatusTone {
  if (!status) return "neutral";
  const k = key(status);
  return overrides?.[k] ?? DEFAULT_MAP[k] ?? "neutral";
}

const TONE_TO_VARIANT: Record<StatusTone, AppBadgeProps["variant"]> = {
  neutral: "neutral", info: "info", accent: "accent", warning: "warning", success: "success", danger: "danger",
};

export interface StatusBadgeProps extends Omit<AppBadgeProps, "variant" | "children"> {
  status: string | null | undefined;
  /** Force a tone (e.g. when the API already sends a colour category). */
  tone?: StatusTone;
  /** Per-page additions, keys lower-case: { "sent to client": "accent" } */
  map?: Record<string, StatusTone>;
}

export function StatusBadge({ status, tone, map, ...rest }: StatusBadgeProps) {
  const t = tone ?? statusTone(status, map);
  return (
    <AppBadge variant={TONE_TO_VARIANT[t]} withDot {...rest}>
      {status ? prettyStatus(status) : "—"}
    </AppBadge>
  );
}
