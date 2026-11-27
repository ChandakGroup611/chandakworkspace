"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Copy, ExternalLink, Link2, ShieldAlert, ShieldOff, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  createShareAction,
  fetchShareAccessLogAction,
  fetchSharePolicyAction,
  fetchShareRegisterAction,
  revokeShareAction,
  saveSharePolicyAction,
  type ShareAccessRow,
  type SharePolicy,
  type ShareRegisterRow,
  type ShareStatus,
} from "@/lib/actions/dms-shares";

/** Share documents outside the company: create dialog, share register with revoke and access log, policy. */

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "–";

const STATUS_STYLE: Record<ShareStatus, string> = {
  ACTIVE: "bg-success-soft text-success-text border-success-border",
  EXPIRED: "bg-sunken text-muted-foreground border-border",
  REVOKED: "bg-sunken text-muted-foreground border-border",
  LOCKED: "bg-danger-soft text-danger-text border-danger-border",
};
const STATUS_LABEL: Record<ShareStatus, string> = { ACTIVE: "Active", EXPIRED: "Expired", REVOKED: "Revoked", LOCKED: "Locked" };

const ATTEMPT_LABEL: Record<string, string> = {
  OTP_SENT: "Code sent",
  SUCCESSFUL_LOGIN: "Opened",
  EMAIL_MISMATCH: "Wrong email entered",
  WRONG_OTP: "Wrong code",
  WRONG_PASSWORD: "Wrong password",
  FILE_VIEW: "Viewed a file",
  FILE_DOWNLOAD: "Downloaded a file",
};

const input = "w-full text-xs rounded-lg bg-surface border border-border px-2.5 py-2 focus:ring-1 focus:ring-ring";

// ---------------------------------------------------------------- create

export function DmsShareDialog({
  documents,
  onClose,
  onCreated,
  inline = false,
}: {
  documents: { id: string; title: string }[];
  onClose: () => void;
  onCreated?: () => void;
  inline?: boolean;
}) {
  const [policy, setPolicy] = useState<SharePolicy | null>(null);
  const [configured, setConfigured] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [days, setDays] = useState(7);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [oneTimeView, setOneTimeView] = useState(false);
  const [allowDownload, setAllowDownload] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState<string>("");
  const [usePassword, setUsePassword] = useState(false);
  const [passwordMode, setPasswordMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [manualPassword, setManualPassword] = useState("");
  const [sendPasswordInEmail, setSendPasswordInEmail] = useState(true);
  const [title, setTitle] = useState(documents.length === 1 ? documents[0].title : "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ url: string; password: string | null; expiresAt: string; sentInEmail: boolean } | null>(null);

  useEffect(() => {
    fetchSharePolicyAction().then((r) => {
      if (!r.success) return;
      setPolicy(r.policy);
      setConfigured(r.configured);
      setDays((d) => Math.min(d, r.policy.maxDays));
      if (r.policy.requirePassword) setUsePassword(true);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalMinutes = days * 1440 + hours * 60 + minutes;
    if (totalMinutes < 1) {
      setError("Set a link duration of at least 1 minute.");
      return;
    }
    const maxDays = policy?.maxDays || 30;
    if (totalMinutes > maxDays * 1440) {
      setError(`Link duration cannot exceed ${maxDays} days.`);
      return;
    }
    if (usePassword && passwordMode === "MANUAL" && manualPassword.trim().length < 6) {
      setError("Manual password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setError("");
    const r = await createShareAction({
      documentIds: documents.map((d) => d.id),
      recipientEmail: email,
      recipientPhone: phone,
      expiresInDays: days,
      expiresInHours: hours,
      expiresInMinutes: minutes,
      allowDownload,
      maxDownloads: allowDownload && maxDownloads ? Number(maxDownloads) : null,
      usePassword,
      oneTimeView,
      passwordMode: usePassword ? passwordMode : undefined,
      manualPassword: usePassword && passwordMode === "MANUAL" ? manualPassword.trim() : undefined,
      sendPasswordInEmail: usePassword ? sendPasswordInEmail : undefined,
      title,
      message,
    });
    setBusy(false);
    if (!r.success) return setError(r.error);
    setCreated({
      url: r.url,
      password: r.password,
      expiresAt: r.expiresAt,
      sentInEmail: Boolean(usePassword && sendPasswordInEmail),
    });
    onCreated?.();
  };

  const copy = (text: string, what: string) => navigator.clipboard?.writeText(text).then(() => toast.success(`${what} copied.`));

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border bg-sunken">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <span className="font-semibold text-sm flex items-center gap-2 text-foreground">
          <Link2 className="h-4 w-4 text-primary shrink-0" /> Share outside the company
        </span>
        <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-[11px] font-medium text-muted-foreground">
          {documents.length === 1 ? documents[0].title : `${documents.length} documents`}
        </span>
      </div>
      {inline ? (
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken font-semibold text-foreground cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      ) : (
        <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-surface">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const body = created ? (
    <div className={inline ? "p-5 space-y-4 max-w-3xl" : "p-4 space-y-3 overflow-y-auto"}>
      <p className="text-foreground">
        The link was emailed to <strong>{email.trim().toLowerCase()}</strong>. It works until {fmt(created.expiresAt)}
        {oneTimeView ? " (expires immediately after first view)" : ""} and only after they confirm a code sent to that address.
      </p>
      <div className="space-y-1">
        <span className="font-semibold text-muted-foreground">Link</span>
        <div className="flex gap-2">
          <input readOnly value={created.url} className={`${input} font-mono`} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" onClick={() => copy(created.url, "Link")} className="px-2.5 rounded-lg border border-border hover:bg-sunken" aria-label="Copy link">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {created.password && (
        <div className="p-3 rounded-lg border border-warning-border bg-warning-soft space-y-1.5">
          <span className="font-semibold text-warning-text">
            {created.sentInEmail ? "Password (also sent in the share email)" : "Password, shown only now"}
          </span>
          <div className="flex gap-2 items-center">
            <code className="text-base font-mono font-semibold tracking-wider select-all">{created.password}</code>
            <button type="button" onClick={() => copy(created.password!, "Password")} className="px-2 py-1 rounded border border-border bg-surface" aria-label="Copy password">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          {!created.sentInEmail && (
            <p className="text-warning-text">Send it by SMS or phone{phone ? ` to ${phone}` : ""}, not by email, so the link and password never travel together.</p>
          )}
        </div>
      )}
      <div className="flex justify-end">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold">
          Done
        </button>
      </div>
    </div>
  ) : (
    <form onSubmit={submit} className={inline ? "p-5 space-y-4" : "p-4 space-y-3 overflow-y-auto"}>
      {!configured && (
        <p className="p-2.5 rounded-lg border border-danger-border bg-danger-soft text-danger-text">
          Sharing is not set up on this server yet (SHARE_SECRET_SALT is missing). Ask IT to add it.
        </p>
      )}
      <div className={inline ? "grid grid-cols-1 lg:grid-cols-12 gap-5 items-start" : "space-y-3"}>
        <div className={inline ? "lg:col-span-7 space-y-3.5" : "space-y-3"}>
          <div className={inline ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
            <label className="block space-y-1">
              <span className="font-semibold text-muted-foreground">Recipient email</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="name@consultant.com" autoFocus />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-muted-foreground">Recipient phone (optional)</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} placeholder="+91…" />
            </label>
          </div>

          <div className="space-y-1">
            <span className="font-semibold text-muted-foreground block">Link works for (days / hrs / mins)</span>
            <div className="grid grid-cols-3 gap-2 max-w-sm">
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Days</span>
                <input type="number" min={0} max={policy?.maxDays || 30} value={days} onChange={(e) => setDays(Math.max(0, Number(e.target.value) || 0))} className={input} aria-label="Link duration days" />
              </label>
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Hours</span>
                <input type="number" min={0} max={23} value={hours} onChange={(e) => setHours(Math.min(23, Math.max(0, Number(e.target.value) || 0)))} className={input} aria-label="Link duration hours" />
              </label>
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Mins</span>
                <input type="number" min={0} max={59} value={minutes} onChange={(e) => setMinutes(Math.min(59, Math.max(0, Number(e.target.value) || 0)))} className={input} aria-label="Link duration minutes" />
              </label>
            </div>
          </div>

          <label className="block space-y-1">
            <span className="font-semibold text-muted-foreground">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={input} placeholder="What these documents are" />
          </label>
          <label className="block space-y-1">
            <span className="font-semibold text-muted-foreground">Message (optional)</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={inline ? 4 : 3} className={input} />
          </label>
        </div>

        <div className={inline ? "lg:col-span-5 space-y-3.5" : "space-y-3"}>
          <div className="rounded-lg border border-border bg-sunken/40 p-3.5 space-y-2.5">
            <div className="font-semibold text-foreground">Access &amp; View Options</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer ${!oneTimeView ? "border-primary bg-accent-soft/40" : "border-border bg-surface"}`}>
                <input type="radio" name="viewMode" checked={!oneTimeView} onChange={() => setOneTimeView(false)} className="mt-0.5" />
                <span>
                  <span className="font-semibold block text-foreground">Multiple views</span>
                  <span className="text-[11px] text-muted-foreground">Active until expiry</span>
                </span>
              </label>
              <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer ${oneTimeView ? "border-primary bg-accent-soft/40" : "border-border bg-surface"}`}>
                <input type="radio" name="viewMode" checked={oneTimeView} onChange={() => setOneTimeView(true)} className="mt-0.5" />
                <span>
                  <span className="font-semibold block text-foreground">One-time view only</span>
                  <span className="text-[11px] text-muted-foreground">Expires right after 1st view</span>
                </span>
              </label>
            </div>

            <label className={`flex items-start gap-2 pt-1 ${policy && !policy.allowDownload ? "opacity-50" : ""}`}>
              <input type="checkbox" checked={allowDownload} disabled={!!policy && !policy.allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} className="mt-0.5" />
              <span>
                Allow download{policy && !policy.allowDownload ? " (turned off by the share policy)" : ""}
                <span className="block text-muted-foreground">Without it the recipient can only view, with their email and IP stamped on the page.</span>
              </span>
            </label>
            {allowDownload && (
              <label className="block space-y-1 pl-6">
                <span className="font-semibold text-muted-foreground">Download limit (blank for no limit)</span>
                <input type="number" min={1} value={maxDownloads} onChange={(e) => setMaxDownloads(e.target.value)} className={input} />
              </label>
            )}
          </div>

          <div className="rounded-lg border border-border bg-sunken/40 p-3.5 space-y-2.5">
            <label className={`flex items-start gap-2 ${policy?.requirePassword ? "opacity-70" : ""}`}>
              <input type="checkbox" checked={usePassword} disabled={!!policy?.requirePassword} onChange={(e) => setUsePassword(e.target.checked)} className="mt-0.5" />
              <span>
                <span className="font-semibold text-foreground">Require a password</span>{policy?.requirePassword ? " (required by the share policy)" : ""}
                <span className="block text-muted-foreground">Choose system-generated or manual password.</span>
              </span>
            </label>

            {usePassword && (
              <div className="pl-5 space-y-2.5 border-l-2 border-border">
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="pwMode" checked={passwordMode === "AUTO"} onChange={() => setPasswordMode("AUTO")} />
                    <span className="font-medium">System generated</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="pwMode" checked={passwordMode === "MANUAL"} onChange={() => setPasswordMode("MANUAL")} />
                    <span className="font-medium">Manual password</span>
                  </label>
                </div>
                {passwordMode === "MANUAL" && (
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Enter password (min 6 characters)</span>
                    <input type="text" required minLength={6} value={manualPassword} onChange={(e) => setManualPassword(e.target.value)} className={input} placeholder="Enter password…" />
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={sendPasswordInEmail} onChange={(e) => setSendPasswordInEmail(e.target.checked)} />
                  <span className="text-foreground font-medium">Send password along with share email</span>
                </label>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-warning-border bg-warning-soft/60 p-3 flex items-start gap-2 text-[11px] text-warning-text">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Strict email lock:</strong> Only the exact recipient email can open this link. If forwarded or opened with any different email, the link expires immediately and sends an escalation email back to you.
            </span>
          </div>
        </div>
      </div>

      {error && <p className="p-2.5 rounded-lg border border-danger-border bg-danger-soft text-danger-text">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-border">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border bg-surface hover:bg-sunken font-semibold cursor-pointer">
          Cancel
        </button>
        <button type="submit" disabled={busy || !configured} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 cursor-pointer">
          {busy ? "Creating…" : "Create link and email it"}
        </button>
      </div>
    </form>
  );

  if (inline) {
    return (
      <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden text-xs">
        {header}
        {body}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[var(--overlay)]" role="dialog" aria-modal="true" aria-label="Share outside the company">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-lg shadow-lg flex flex-col max-h-[92vh] overflow-hidden text-xs">
        {header}
        {body}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- register

function RevokeButton({ share, onDone }: { share: ShareRegisterRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  if (share.status !== "ACTIVE") return null;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-danger-text font-semibold">
        <ShieldOff className="h-3 w-3" /> Revoke
      </button>
    );
  return (
    <span className="inline-flex items-center gap-1.5">
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className="text-[11px] rounded border border-border px-1.5 py-1 w-36 bg-surface" />
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await revokeShareAction(share.id, reason);
          setBusy(false);
          if (!r.success) return toast.error(r.error);
          toast.success("Link revoked. It stopped working straight away.");
          onDone();
        }}
        className="px-2 py-1 rounded bg-danger text-white font-semibold disabled:opacity-50"
      >
        Revoke
      </button>
      <button type="button" onClick={() => setOpen(false)} className="px-1.5 py-1 text-muted-foreground">
        Cancel
      </button>
    </span>
  );
}

function AccessLog({ shareId }: { shareId: string }) {
  const [rows, setRows] = useState<ShareAccessRow[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetchShareAccessLogAction(shareId).then((r) => (r.success ? setRows(r.entries) : setError(r.error)));
  }, [shareId]);
  if (error) return <p className="text-danger-text">{error}</p>;
  if (!rows) return <p className="text-muted-foreground">Loading…</p>;
  if (!rows.length) return <p className="text-muted-foreground">Nobody has opened this link yet.</p>;
  return (
    <ul className="space-y-1">
      {rows.map((a, i) => (
        <li key={i} className="flex flex-wrap gap-x-3 text-[11px]">
          <span className="text-muted-foreground w-36 shrink-0">{fmt(a.at)}</span>
          <span className={a.ok ? "" : "text-danger-text font-semibold"}>{ATTEMPT_LABEL[a.type] || a.type}</span>
          {a.email && <span className="text-muted-foreground">{a.email}</span>}
          {a.ip && <span className="text-muted-foreground font-mono">{a.ip}</span>}
        </li>
      ))}
    </ul>
  );
}

function ShareRow({ s, showSharer, onChanged }: { s: ShareRegisterRow; showSharer: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg p-2.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="min-w-0">
          <span className="font-semibold">{s.recipientEmail}</span>
          <span className={`ml-2 inline-block px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${STATUS_STYLE[s.status]}`}>{STATUS_LABEL[s.status]}</span>
          {s.title && <span className="block text-muted-foreground truncate">{s.title}</span>}
        </div>
        <RevokeButton share={s} onDone={onChanged} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground items-center">
        {showSharer && <span>By {s.sharedByMe ? "you" : s.sharedByName}</span>}
        <span>Created {fmt(s.createdAt)}</span>
        <span>{s.status === "ACTIVE" ? "Expires" : "Expiry"} {fmt(s.expiresAt)}</span>
        <span>{s.allowDownload ? `Downloads ${s.downloadCount}${s.maxDownloads ? ` of ${s.maxDownloads}` : ""}` : "View only"}</span>
        {s.oneTimeView && (
          <span className="px-1.5 py-0.5 rounded bg-warning-soft text-warning-text border border-warning-border font-semibold">
            One-time view
          </span>
        )}
        <span>Views {s.viewCount}</span>
        {s.hasPassword && <span>Password</span>}
        {s.failedAttempts > 0 && <span className="text-danger-text">{s.failedAttempts} failed check{s.failedAttempts === 1 ? "" : "s"}</span>}
        {s.lastAccessAt && <span>Last opened {fmt(s.lastAccessAt)}</span>}
      </div>
      {s.revokedReason && s.status !== "ACTIVE" && <p className="text-[11px] text-muted-foreground">{s.revokedReason}</p>}
      <div className="text-[11px]">
        {s.documents.map((d) => d.title).join(", ")}
        <button type="button" onClick={() => setOpen((o) => !o)} className="ml-2 text-primary font-semibold">
          {open ? "Hide access log" : "Access log"}
        </button>
      </div>
      {open && (
        <div className="pt-1.5 border-t border-border">
          <AccessLog shareId={s.id} />
        </div>
      )}
    </div>
  );
}

/** Shares of one document, for the document panel. */
export function DmsDocumentShares({ documentId, refreshKey }: { documentId: string; refreshKey?: number }) {
  const [shares, setShares] = useState<ShareRegisterRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const load = useCallback(() => {
    fetchShareRegisterAction({ documentId, scope: "all" }).then((r) => {
      if (r.success) {
        setShares(r.shares);
        setIsAdmin(r.isAdmin);
      }
    });
  }, [documentId]);
  useEffect(load, [load, refreshKey]);
  if (!shares.length) return null;
  return (
    <div className="space-y-1.5">
      <div className="font-semibold text-foreground">Shared outside the company</div>
      {shares.map((s) => (
        <ShareRow key={s.id} s={s} showSharer={isAdmin} onChanged={load} />
      ))}
    </div>
  );
}

function PolicyEditor({ onClose }: { onClose: () => void }) {
  const [p, setP] = useState<SharePolicy | null>(null);
  const [domains, setDomains] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetchSharePolicyAction().then((r) => {
      if (r.success) {
        setP(r.policy);
        setDomains(r.policy.blockedDomains.join(", "));
      }
    });
  }, []);
  if (!p) return <p className="text-muted-foreground">Loading…</p>;
  const num = (k: keyof SharePolicy) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: Number(e.target.value) });
  return (
    <form
      className="border border-border rounded-lg p-3 space-y-2.5 bg-sunken"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await saveSharePolicyAction({ ...p, blockedDomains: domains.split(/[,\s]+/).filter(Boolean) });
        setBusy(false);
        if (!r.success) return toast.error(r.error);
        toast.success("Share policy saved.");
        onClose();
      }}
    >
      <div className="font-semibold">Share policy</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <label className="space-y-1 block">
          <span className="text-muted-foreground">Longest link (days)</span>
          <input type="number" min={1} max={365} value={p.maxDays} onChange={num("maxDays")} className={input} />
        </label>
        <label className="space-y-1 block">
          <span className="text-muted-foreground">Most documents per link</span>
          <input type="number" min={1} max={500} value={p.maxItems} onChange={num("maxItems")} className={input} />
        </label>
        <label className="space-y-1 block">
          <span className="text-muted-foreground">Wrong emails before lock</span>
          <input type="number" min={1} max={10} value={p.wrongEmailLimit} onChange={num("wrongEmailLimit")} className={input} />
        </label>
        <label className="space-y-1 block">
          <span className="text-muted-foreground">Wrong codes before lock</span>
          <input type="number" min={1} max={20} value={p.failedCodeLimit} onChange={num("failedCodeLimit")} className={input} />
        </label>
      </div>
      <label className="space-y-1 block">
        <span className="text-muted-foreground">Blocked email domains (comma separated)</span>
        <input value={domains} onChange={(e) => setDomains(e.target.value)} className={input} placeholder="gmail.com, yahoo.com" />
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={p.allowDownload} onChange={(e) => setP({ ...p, allowDownload: e.target.checked })} /> Downloads allowed
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={p.requirePassword} onChange={(e) => setP({ ...p, requirePassword: e.target.checked })} /> Every link needs a password
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
          Save policy
        </button>
      </div>
    </form>
  );
}

/** Share register: links you made (administrators can switch to everyone's). */
export function DmsSharesView() {
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [shares, setShares] = useState<ShareRegisterRow[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<"ALL" | ShareStatus>("ALL");
  const [optionFilter, setOptionFilter] = useState<"ALL" | "ONE_TIME" | "VIEW_ONLY" | "DOWNLOAD" | "PASSWORD">("ALL");
  const [q, setQ] = useState("");
  const [editPolicy, setEditPolicy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetchShareRegisterAction({ scope }).then((r) => {
      if (!r.success) return setError(r.error);
      setShares(r.shares);
      setIsAdmin(r.isAdmin);
    });
  }, [scope]);
  useEffect(load, [load]);

  const needle = q.trim().toLowerCase();
  const rows = (shares || []).filter((s) => {
    if (filter !== "ALL" && s.status !== filter) return false;
    if (optionFilter === "ONE_TIME" && !s.oneTimeView) return false;
    if (optionFilter === "VIEW_ONLY" && s.allowDownload) return false;
    if (optionFilter === "DOWNLOAD" && !s.allowDownload) return false;
    if (optionFilter === "PASSWORD" && !s.hasPassword) return false;
    if (
      needle &&
      !s.recipientEmail.includes(needle) &&
      !(s.title || "").toLowerCase().includes(needle) &&
      !s.documents.some((d) => d.title.toLowerCase().includes(needle))
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        {isAdmin && (
          <select value={scope} onChange={(e) => setScope(e.target.value as any)} className="rounded-lg border border-border bg-surface px-2 py-1.5" aria-label="Whose shares">
            <option value="mine">Shared by me</option>
            <option value="all">Everyone&apos;s shares</option>
          </select>
        )}
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="rounded-lg border border-border bg-surface px-2 py-1.5" aria-label="Status">
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="REVOKED">Revoked</option>
          <option value="LOCKED">Locked</option>
        </select>
        <select value={optionFilter} onChange={(e) => setOptionFilter(e.target.value as any)} className="rounded-lg border border-border bg-surface px-2 py-1.5" aria-label="Share option">
          <option value="ALL">All options</option>
          <option value="ONE_TIME">One-time view only</option>
          <option value="VIEW_ONLY">View only</option>
          <option value="DOWNLOAD">Download allowed</option>
          <option value="PASSWORD">Password protected</option>
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find by email, title or document" className="rounded-lg border border-border bg-surface px-2.5 py-1.5 flex-1 min-w-40" />
        {isAdmin && !editPolicy && (
          <button type="button" onClick={() => setEditPolicy(true)} className="px-3 py-1.5 rounded-lg border border-border font-semibold">
            Share policy
          </button>
        )}
      </div>
      {editPolicy && <PolicyEditor onClose={() => setEditPolicy(false)} />}
      {error && <p className="text-danger-text">{error}</p>}
      {!shares ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !rows.length ? (
        <div className="text-center py-10 text-muted-foreground space-y-1">
          <ExternalLink className="h-6 w-6 mx-auto stroke-1" />
          <p>{shares.length ? "No shares match." : "No documents shared outside the company yet. Use Share on a document to send one."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((s) => (
            <ShareRow key={s.id} s={s} showSharer={scope === "all"} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
