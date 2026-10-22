"use client";

/**
 * App-wide, promise-based replacement for window.confirm().
 *
 *   if (!(await confirmAction("Delete this vendor? This cannot be undone."))) return;
 *   if (!(await confirmAction({ title: "Revoke access?", description: "…", confirmLabel: "Revoke", tone: "danger" }))) return;
 *
 *   const name = await promptAction({ title: "New city", label: "City name" });   // string | null
 *
 * <ConfirmHost /> is mounted once in WorkspaceShell. A plain message is split into a title (first
 * sentence/question) and description; destructive verbs (delete, remove, revoke…) get the danger tone
 * and a matching button label, so existing confirm("…") strings read well without being rewritten.
 */
import React, { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/enterprise/ConfirmDialog";

export type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};
export type PromptOptions = ConfirmOptions & {
  label: string;
  defaultValue?: string;
  placeholder?: string;
  /** When set, the person picks one of these instead of typing. */
  options?: string[];
};
type Request = ConfirmOptions & { resolve: (ok: boolean, value?: string) => void; input?: Omit<PromptOptions, keyof ConfirmOptions> };

let enqueue: ((r: Request) => void) | null = null;

const DANGER = /\b(delete|remove|revoke|discard|terminate|deactivate|disable|purge|erase|reject|cancel|archive|reset|unlink|clear)\b/i;

function fromMessage(message: string): ConfirmOptions {
  const text = message.replace(/\s+/g, " ").trim();
  const m = text.match(/^(.+?[?.!])\s+(.+)$/);
  const title = (m ? m[1] : text).replace(/^are you sure (you want )?(to )?/i, (x) => (x ? "" : x));
  const cleanTitle = title.charAt(0).toUpperCase() + title.slice(1);
  const verb = text.match(DANGER)?.[1];
  return {
    title: cleanTitle.endsWith("?") || cleanTitle.endsWith(".") || cleanTitle.endsWith("!") ? cleanTitle : `${cleanTitle}?`,
    description: m ? m[2] : undefined,
    tone: verb ? "danger" : "default",
    confirmLabel: verb ? verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase() : "Continue",
  };
}

export function confirmAction(message: string | ConfirmOptions): Promise<boolean> {
  const opts = typeof message === "string" ? fromMessage(message) : { tone: "default" as const, confirmLabel: "Continue", ...message };
  if (!enqueue) {
    // Host not mounted (e.g. an auth route): fall back to the browser dialog so the action still asks first.
    // ui-audit-ignore-next-line fallback only when ConfirmHost isn't mounted
    return Promise.resolve(typeof window !== "undefined" ? window.confirm([opts.title, opts.description].filter(Boolean).join("\n\n")) : false);
  }
  return new Promise<boolean>((resolve) => enqueue!({ ...opts, resolve }));
}

/** Promise-based replacement for window.prompt(). Resolves to the trimmed value, or null when cancelled or empty. */
export function promptAction(opts: PromptOptions): Promise<string | null> {
  const { label, defaultValue, placeholder, options, ...rest } = opts;
  if (!enqueue) {
    // ui-audit-ignore-next-line fallback only when ConfirmHost isn't mounted
    const v = typeof window !== "undefined" ? window.prompt([rest.title, label].filter(Boolean).join("\n\n"), defaultValue ?? "") : null;
    return Promise.resolve(v && v.trim() ? v.trim() : null);
  }
  return new Promise<string | null>((resolve) =>
    enqueue!({
      tone: "default",
      confirmLabel: "Save",
      ...rest,
      input: { label, defaultValue, placeholder, options },
      resolve: (ok, value) => resolve(ok && value && value.trim() ? value.trim() : null),
    })
  );
}

export function ConfirmHost() {
  const [queue, setQueue] = useState<Request[]>([]);
  useEffect(() => {
    enqueue = (r) => setQueue((q) => [...q, r]);
    return () => { enqueue = null; };
  }, []);
  const current = queue[0];
  const [value, setValue] = useState("");
  useEffect(() => {
    setValue(current?.input?.defaultValue ?? current?.input?.options?.[0] ?? "");
  }, [current]);
  // ConfirmDialog calls onConfirm and then onClose; only the first call for a request counts.
  const settle = (ok: boolean) => {
    const r = current;
    if (!r) return;
    r.resolve(ok, value);
    setQueue((q) => (q[0] === r ? q.slice(1) : q));
  };
  return (
    <ConfirmDialog
      open={!!current}
      onClose={() => settle(false)}
      onConfirm={() => settle(true)}
      title={current?.title || "Continue?"}
      description={current?.description}
      confirmLabel={current?.confirmLabel}
      cancelLabel={current?.cancelLabel}
      tone={current?.tone}
    >
      {current?.input ? (
        <div className="space-y-1.5">
          <label htmlFor="confirm-host-input" className="block text-[13px] font-medium text-subtle">{current.input.label}</label>
          {current.input.options ? (
            <select
              id="confirm-host-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[13.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {current.input.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              id="confirm-host-input"
              autoFocus
              value={value}
              placeholder={current.input.placeholder}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) { e.preventDefault(); settle(true); } }}
              className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[13.5px] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </div>
      ) : null}
    </ConfirmDialog>
  );
}
