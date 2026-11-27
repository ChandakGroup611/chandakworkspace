"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Link2, ShieldOff, X } from "lucide-react";
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
}: {
  documents: { id: string; title: string }[];
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [policy, setPolicy] = useState<SharePolicy | null>(null);
  const [configured, setConfigured] = useState(true);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [days, setDays] = useState(7);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [allowDownload, setAllowDownload] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState<string>("");
  const [usePassword, setUsePassword] = useState(false);
  const [title, setTitle] = useState(documents.length === 1 ? documents[0].title : "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ url: string; password: string | null; expiresAt: string } | null>(null);

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
      title,
      message,
    });
    setBusy(false);
    if (!r.success) return setError(r.error);
    setCreated({ url: r.url, password: r.password, expiresAt: r.expiresAt });
    onCreated?.();
  };

  const copy = (text: string, what: string) => navigator.clipboard?.writeText(text).then(() => toast.success(`${what} copied.`));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[var(--overlay)]" role="dialog" aria-modal="true" aria-label="Share outside the company">
      <div className="w-full max-w-lg bg-surface border border-border rounded-lg shadow-lg flex flex-col max-h-[92vh] overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sunken">
          <span className="font-semibold text-sm flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" /> Share outside the company
          </span>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-surface">
            <X className="h-4 w-4" />
          </button>
        </div>

        {created ? (
          <div className="p-4 space-y-3 overflow-y-auto">
            <p>
              The link was emailed to <strong>{email.trim().toLowerCase()}</strong>. It works until {fmt(created.expiresAt)} and only after they confirm a code sent to that address.
            </p>
            <div className="space-y-1">
              <span className="font-semibold text-muted-foreground">Link</span>
              <div className="flex gap-2">
                <input readOnly value={created.url} className={`${input} font-mono`} onFocus={(e) => e.currentTarget.select()} />
                <button type="button" onClick={() => copy(created.url, "Link")} className="px-2.5 rounded-lg border border-border" aria-label="Copy link">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {created.password && (
              <div className="p-3 rounded-lg border border-warning-border bg-warning-soft space-y-1.5">
                <span className="font-semibold text-warning-text">Password, shown only now</span>
                <div className="flex gap-2 items-center">
                  <code className="text-base font-mono font-semibold tracking-wider select-all">{created.password}</code>
                  <button type="button" onClick={() => copy(created.password!, "Password")} className="px-2 py-1 rounded border border-border" aria-label="Copy password">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-warning-text">Send it by SMS or phone{phone ? ` to ${phone}` : ""}, not by email, so the link and password never travel together.</p>
              </div>
            )}
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="p-4 space-y-3 overflow-y-auto">
            {!configured && (
              <p className="p-2.5 rounded-lg border border-danger-border bg-danger-soft text-danger-text">
                Sharing is not set up on this server yet (SHARE_SECRET_SALT is missing). Ask IT to add it.
              </p>
            )}
            <div className="text-muted-foreground">
              {documents.length === 1 ? (
                <>Sharing <strong className="text-foreground">{documents[0].title}</strong></>
              ) : (
                <>Sharing {documents.length} documents</>
              )}
            </div>
            <label className="block space-y-1">
              <span className="font-semibold text-muted-foreground">Recipient email</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="name@consultant.com" autoFocus />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="font-semibold text-muted-foreground block">Link works for (days / hrs / mins)</span>
                <div className="grid grid-cols-3 gap-1.5">
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
                <span className="font-semibold text-muted-foreground">Recipient phone (optional)</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} placeholder="+91…" />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="font-semibold text-muted-foreground">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={input} placeholder="What these documents are" />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-muted-foreground">Message (optional)</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={3} className={input} />
            </label>
            <label className={`flex items-start gap-2 ${policy && !policy.allowDownload ? "opacity-50" : ""}`}>
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
            <label className={`flex items-start gap-2 ${policy?.requirePassword ? "opacity-70" : ""}`}>
              <input type="checkbox" checked={usePassword} disabled={!!policy?.requirePassword} onChange={(e) => setUsePassword(e.target.checked)} className="mt-0.5" />
              <span>
                Also require a password{policy?.requirePassword ? " (required by the share policy)" : ""}
                <span className="block text-muted-foreground">We generate it and show it once, for you to send by SMS or phone.</span>
              </span>
            </label>
            {error && <p className="p-2.5 rounded-lg border border-danger-border bg-danger-soft text-danger-text">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-border">
                Cancel
              </button>
              <button type="submit" disabled={busy || !configured} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50">
                {busy ? "Creating…" : "Create link and email it"}
              </button>
            </div>
          </form>
        )}
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
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
        {showSharer && <span>By {s.sharedByMe ? "you" : s.sharedByName}</span>}
        <span>Created {fmt(s.createdAt)}</span>
        <span>{s.status === "ACTIVE" ? "Expires" : "Expiry"} {fmt(s.expiresAt)}</span>
        <span>{s.allowDownload ? `Downloads ${s.downloadCount}${s.maxDownloads ? ` of ${s.maxDownloads}` : ""}` : "View only"}</span>
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
  const rows = (shares || []).filter(
    (s) =>
      (filter === "ALL" || s.status === filter) &&
      (!needle || s.recipientEmail.includes(needle) || (s.title || "").toLowerCase().includes(needle) || s.documents.some((d) => d.title.toLowerCase().includes(needle)))
  );

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
