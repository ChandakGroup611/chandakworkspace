import { cookies, headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { hmac, safeEqualHex, sessionCookieName } from "@/lib/dms/share-crypto";

/** Server-side helpers shared by the public share page actions and the share file route. */

export interface ShareRow {
  id: string;
  workspace_id: string;
  recipient_email: string;
  password_hash: string | null;
  allow_view: boolean;
  allow_print: boolean;
  allow_download: boolean;
  max_downloads: number | null;
  download_count: number;
  expires_at: string;
  is_revoked: boolean;
  revoked_reason: string | null;
  title: string | null;
  message: string | null;
  created_by: string | null;
}

const SHARE_COLUMNS =
  "id, workspace_id, recipient_email, password_hash, allow_view, allow_print, allow_download, max_downloads, download_count, expires_at, is_revoked, revoked_reason, title, message, created_by";

export const SESSION_HOURS = 8;

export async function loadShareByToken(rawToken: string): Promise<ShareRow | null> {
  if (!rawToken || rawToken.length < 20 || rawToken.length > 100) return null;
  const { data } = await supabaseAdmin.from("dms_shares").select(SHARE_COLUMNS).eq("token_hash", hmac("token", rawToken)).maybeSingle();
  return (data as ShareRow) || null;
}

export function shareState(share: ShareRow | null): "ok" | "missing" | "expired" | "revoked" {
  if (!share) return "missing";
  if (share.is_revoked) return "revoked";
  if (new Date(share.expires_at).getTime() <= Date.now()) return "expired";
  return "ok";
}

export async function clientInfo(): Promise<{ ip: string; userAgent: string }> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || h.get("x-real-ip") || "").split(",")[0].trim().slice(0, 45) || "unknown";
  return { ip, userAgent: (h.get("user-agent") || "").slice(0, 500) };
}

export async function logShareAttempt(shareId: string, type: string, ok: boolean, email?: string | null) {
  const { ip, userAgent } = await clientInfo();
  await supabaseAdmin.from("dms_share_access_attempts").insert({
    share_id: shareId,
    attempt_type: type.slice(0, 30),
    email_entered: email ? String(email).toLowerCase().trim().slice(0, 255) : null,
    ip_address: ip,
    user_agent: userAgent,
    is_successful: ok,
  });
}

/** Start a session after a successful check: httpOnly cookie, bound to this browser, ends with the share. */
export async function startShareSession(rawToken: string, share: ShareRow, sessionToken: string) {
  const { userAgent } = await clientInfo();
  const end = Math.min(Date.now() + SESSION_HOURS * 3600_000, new Date(share.expires_at).getTime());
  const { error } = await supabaseAdmin.from("dms_share_devices").insert({
    share_id: share.id,
    device_fingerprint_hash: hmac("device", userAgent),
    session_token_hash: hmac("session", sessionToken),
    expires_at: new Date(end).toISOString(),
  });
  if (error) throw error;
  const jar = await cookies();
  jar.set(sessionCookieName(rawToken), sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(end),
  });
}

/** True when this browser holds a live session for this share. */
export async function hasShareSession(rawToken: string, share: ShareRow): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(sessionCookieName(rawToken))?.value;
  if (!raw || raw.length > 100) return false;
  const { data } = await supabaseAdmin
    .from("dms_share_devices")
    .select("id, device_fingerprint_hash")
    .eq("share_id", share.id)
    .eq("session_token_hash", hmac("session", raw))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!data) return false;
  const { userAgent } = await clientInfo();
  return safeEqualHex(data.device_fingerprint_hash, hmac("device", userAgent));
}

export async function endShareSession(rawToken: string, share: ShareRow | null) {
  const jar = await cookies();
  const name = sessionCookieName(rawToken);
  const raw = jar.get(name)?.value;
  if (raw && share) {
    await supabaseAdmin
      .from("dms_share_devices")
      .update({ expires_at: new Date().toISOString() })
      .eq("share_id", share.id)
      .eq("session_token_hash", hmac("session", raw));
  }
  jar.delete(name);
}

export interface ShareFileRow {
  itemId: string;
  documentId: string;
  title: string;
  docTypeCode: string;
  docTypeName: string;
  versionNo: number;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageKey: string;
}

/** Documents in a share that still exist, with their current version. */
export async function loadShareFiles(shareId: string): Promise<ShareFileRow[]> {
  const { data: items, error } = await supabaseAdmin
    .from("dms_share_items")
    .select("id, document_id, dms_documents ( id, title, current_version_no, deleted_at, purged_at, dms_doc_types ( code, name ) )")
    .eq("share_id", shareId)
    .not("document_id", "is", null);
  if (error) throw error;
  const live = (items || [])
    .map((i: any) => ({ item: i, doc: Array.isArray(i.dms_documents) ? i.dms_documents[0] : i.dms_documents }))
    .filter((x) => x.doc && !x.doc.deleted_at && !x.doc.purged_at);
  if (!live.length) return [];

  const { data: versions, error: vErr } = await supabaseAdmin
    .from("dms_document_versions")
    .select("document_id, version_no, file_name, file_size_bytes, mime_type, storage_key")
    .in("document_id", live.map((x) => x.doc.id));
  if (vErr) throw vErr;

  const out: ShareFileRow[] = [];
  for (const { item, doc } of live) {
    const v: any = (versions || []).find((x: any) => x.document_id === doc.id && x.version_no === doc.current_version_no);
    if (!v || !String(v.storage_key || "").startsWith("storage:")) continue;
    const t = Array.isArray(doc.dms_doc_types) ? doc.dms_doc_types[0] : doc.dms_doc_types;
    out.push({
      itemId: item.id,
      documentId: doc.id,
      title: doc.title,
      docTypeCode: t?.code || "DOC",
      docTypeName: t?.name || "Document",
      versionNo: doc.current_version_no,
      fileName: v.file_name,
      fileSizeBytes: Number(v.file_size_bytes || 0),
      mimeType: v.mime_type || "application/octet-stream",
      storageKey: v.storage_key,
    });
  }
  return out;
}

export function watermarkLine(email: string, ip: string): string {
  const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  return `${email} · ${ip} · ${when} IST · Confidential, Chandak Group`;
}

/** Queue an email through the shared email queue and kick the sender. */
export async function queueShareEmail(to: string, subject: string, html: string) {
  const { error } = await supabaseAdmin.from("email_queue").insert({
    recipient_email: to,
    subject,
    body_template: html,
    is_sent: false,
  });
  if (error) throw error;
  import("@/lib/actions/email-queue").then((m) => m.processEmailQueueAsync()).catch(() => {});
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://chandakgroup.tech").replace(/\/+$/, "");
}

export function mailFrame(title: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;padding:20px;color:#1e293b">
<p style="font-size:12px;color:#64748b;margin:0 0 8px">Chandak Group · Document sharing</p>
<h2 style="font-size:18px;margin:0 0 12px">${title}</h2>${bodyHtml}
<p style="font-size:11px;color:#94a3b8;margin-top:24px">If you were not expecting this email, you can ignore it or tell Chandak Group IT.</p></div>`;
}
