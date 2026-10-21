import React from "react";
import { AlertTriangle, Inbox, Lock, SearchX, Loader2, Info, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Empty / error / no-access / loading states. Every module had its own (or none):
 * blank white tables, raw error strings, spinners in random colours.
 */
type Kind = "empty" | "no-results" | "error" | "no-access";
const ICON: Record<Kind, React.ElementType> = { empty: Inbox, "no-results": SearchX, error: AlertTriangle, "no-access": Lock };
const TONE: Record<Kind, string> = {
  empty: "bg-sunken text-muted",
  "no-results": "bg-sunken text-muted",
  error: "bg-danger-soft text-danger-text",
  "no-access": "bg-warning-soft text-warning-text",
};

export function EmptyState({
  kind = "empty",
  title,
  description,
  action,
  className,
  compact,
}: {
  kind?: Kind;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const Icon = ICON[kind];
  return (
    <div role={kind === "error" ? "alert" : undefined} className={cn("flex flex-col items-center justify-center text-center", compact ? "gap-2 py-8" : "gap-3 py-14", className)}>
      <span className={cn("inline-flex items-center justify-center rounded-full", compact ? "h-10 w-10" : "h-12 w-12", TONE[kind])}>
        <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} aria-hidden />
      </span>
      <div className="max-w-md">
        <p className="text-[14.5px] font-semibold text-heading">{title}</p>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Error with a retry button. Pass the error message from the server; never show stack traces. */
export function ErrorState({ title = "Couldn't load this", message, onRetry, className }: { title?: string; message?: string; onRetry?: () => void; className?: string }) {
  return (
    <EmptyState
      kind="error"
      title={title}
      description={message ?? "Check your connection and try again. If it keeps happening, contact IT support."}
      action={onRetry ? <button type="button" onClick={onRetry} className="inline-flex h-8 items-center rounded-md border border-border-active bg-surface px-3 text-[13px] font-medium hover:bg-surface-hover">Try again</button> : undefined}
      className={className}
    />
  );
}

export function NoAccessState({ module, className }: { module?: string; className?: string }) {
  return (
    <EmptyState
      kind="no-access"
      title="You don't have access to this page"
      description={`Ask your administrator to grant access${module ? ` to ${module}` : ""} in RBAC Access Policies.`}
      className={className}
    />
  );
}

/** Centered loader for whole-page loads. Prefer skeletons for tables and cards. */
export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("flex items-center justify-center gap-2 py-14 text-[13px] text-muted", className)}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

/** Inline banner for page-level messages (validation summary, sync warnings, read-only mode). */
export function InlineAlert({ tone = "info", title, children, action, className }: { tone?: "info" | "success" | "warning" | "danger"; title?: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "danger" ? XCircle : tone === "warning" ? AlertTriangle : Info;
  const cls = {
    info: "border-info-border bg-info-soft text-info-text",
    success: "border-success-border bg-success-soft text-success-text",
    warning: "border-warning-border bg-warning-soft text-warning-text",
    danger: "border-danger-border bg-danger-soft text-danger-text",
  }[tone];
  return (
    <div role={tone === "danger" || tone === "warning" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-[10px] border px-3.5 py-3 text-[13px]", cls, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5")}>{children}</div>}
      </div>
      {action}
    </div>
  );
}
