"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { escapeHtml, hmac, maskEmail, newOtp, newSessionToken, safeEqualHex, shareConfigured, verifySharePassword } from "@/lib/dms/share-crypto";
import {
  clientInfo,
  endShareSession,
  hasShareSession,
  loadShareByToken,
  loadShareFiles,
  logShareAttempt,
  mailFrame,
  queueShareEmail,
  shareState,
  startShareSession,
  watermarkLine,
  type ShareRow,
} from "@/lib/dms/share-session";

/**
 * Public share page (/share/[token]). No sign-in: the recipient proves who they are with
 * their email address, a one-time code sent to it, and the link password when there is one.
 * All checks run here with the service role; counters and lock-outs are atomic in
 * fn_dms_share_register_failure (supabase/migrations/20261126140000_dms_sharing.sql).
 */

const OTP_MINUTES = 10;
const OTP_MAX_PER_15_MIN = 5;
const OTP_MIN_GAP_SECONDS = 30;

export interface SharePublicMetadata {
  isValid: boolean;
  isExpired: boolean;
  isLocked: boolean;
  workspaceName?: string;
  title?: string;
  sharedByName?: string;
  message?: string;
  recipientEmailMasked?: string;
  requiresPassword?: boolean;
  hasSession?: boolean;
  allowDownload: boolean;
  expiresAt?: string;
  errorMessage?: string;
}

export interface SharedItemDetail {
  id: string;
  itemType: "DOCUMENT";
  title: string;
  codeOrNumber: string;
  disciplineOrType: string;
  versionOrRev: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  /** "image" previews carry a burned-in watermark; "pdf" is shown inline; "none" has no preview */
  preview: "image" | "pdf" | "none";
  viewUrl: string;
  downloadUrl?: string;
}

export interface ShareContent {
  items: SharedItemDetail[];
  watermarkText: string;
  recipientEmail: string;
  permissions: { allowView: boolean; allowDownload: boolean; allowPrint: boolean };
  downloadsLeft: number | null;
  expiresAt: string;
}

const CLOSED: SharePublicMetadata = { isValid: false, isExpired: false, isLocked: false, allowDownload: false };

function previewKind(mime: string, fileName: string): SharedItemDetail["preview"] {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (mime.startsWith("image/") && mime !== "image/svg+xml") return "image";
  if (["png", "jpg", "jpeg", "webp", "tif", "tiff", "gif"].includes(ext)) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  return "none";
}

async function sharerName(id: string | null): Promise<string> {
  if (!id) return "Chandak Group";
  const { data } = await supabaseAdmin.from("user_master").select("full_name, email").eq("id", id).maybeSingle();
  return data?.full_name || data?.email || "Chandak Group";
}

async function contentFor(rawToken: string, share: ShareRow): Promise<ShareContent> {
  const files = await loadShareFiles(share.id);
  const { ip } = await clientInfo();
  const base = `/api/share/${encodeURIComponent(rawToken)}/file`;
  return {
    items: files.map((f) => ({
      id: f.itemId,
      itemType: "DOCUMENT",
      title: f.title,
      codeOrNumber: f.docTypeCode,
      disciplineOrType: f.docTypeName,
      versionOrRev: `v${f.versionNo}`,
      fileName: f.fileName,
      fileSizeBytes: f.fileSizeBytes,
      mimeType: f.mimeType,
      preview: previewKind(f.mimeType, f.fileName),
      viewUrl: `${base}/${f.itemId}`,
      downloadUrl: share.allow_download ? `${base}/${f.itemId}?download=1` : undefined,
    })),
    watermarkText: watermarkLine(share.recipient_email, ip),
    recipientEmail: share.recipient_email,
    permissions: { allowView: true, allowDownload: !!share.allow_download, allowPrint: !!share.allow_print },
    downloadsLeft: share.allow_download && share.max_downloads ? Math.max(share.max_downloads - (share.download_count || 0), 0) : null,
    expiresAt: share.expires_at,
  };
}

/** Wrong address entered: count it, and when that locks the link tell the person who shared it. */
async function wrongEmail(share: ShareRow, entered: string): Promise<string> {
  await logShareAttempt(share.id, "EMAIL_MISMATCH", false, entered);
  const { data } = await supabaseAdmin.rpc("fn_dms_share_register_failure", { p_share: share.id, p_kind: "EMAIL" });
  const row = Array.isArray(data) ? data[0] : data;
  if (row?.locked) {
    if (share.created_by) {
      const { data: u } = await supabaseAdmin.from("user_master").select("email").eq("id", share.created_by).maybeSingle();
      if (u?.email) {
        const { ip } = await clientInfo();
        await queueShareEmail(
          u.email,
          "A link you shared was locked",
          mailFrame(
            "A link you shared was locked",
            `<p>Someone opened the link you shared with <b>${escapeHtml(share.recipient_email)}</b>${share.title ? ` (“${escapeHtml(share.title)}”)` : ""} and entered a different email address: <b>${escapeHtml(entered)}</b>, from IP ${escapeHtml(ip)}.</p>
<p>The link and its password have been switched off. If this was a mistake, create a new share from the document.</p>`
          )
        ).catch(() => {});
      }
    }
    return "That email address does not match. For safety this link is now locked and the sender has been told.";
  }
  return "That email address does not match the person this was shared with. Another wrong address will lock the link.";
}

async function registerFailure(share: ShareRow, kind: "OTP" | "PASSWORD"): Promise<string> {
  const { data } = await supabaseAdmin.rpc("fn_dms_share_register_failure", { p_share: share.id, p_kind: kind });
  const row = Array.isArray(data) ? data[0] : data;
  if (row?.locked) return "Too many wrong attempts. This link is now locked. Ask the sender for a new one.";
  return kind === "PASSWORD" ? "The password is not right." : "That code is wrong or has expired.";
}

export async function fetchSharePublicMetadataAction(rawToken: string): Promise<SharePublicMetadata> {
  try {
    if (!shareConfigured()) return { ...CLOSED, errorMessage: "Document sharing is not available right now." };
    const share = await loadShareByToken(rawToken);
    const state = shareState(share);
    if (state === "missing") return { ...CLOSED, errorMessage: "This link is not valid." };
    if (state === "revoked") return { ...CLOSED, isLocked: true, errorMessage: "This link has been switched off by the sender or locked after failed attempts." };
    if (state === "expired") return { ...CLOSED, isExpired: true, errorMessage: "This link has expired." };

    const s = share!;
    const { data: ws } = await supabaseAdmin.from("dms_workspaces").select("name").eq("id", s.workspace_id).maybeSingle();
    return {
      isValid: true,
      isExpired: false,
      isLocked: false,
      workspaceName: ws?.name || "Chandak Group",
      title: s.title || undefined,
      sharedByName: await sharerName(s.created_by),
      message: s.message || undefined,
      recipientEmailMasked: maskEmail(s.recipient_email),
      requiresPassword: !!s.password_hash,
      hasSession: await hasShareSession(rawToken, s),
      allowDownload: !!s.allow_download,
      expiresAt: s.expires_at,
    };
  } catch (err) {
    console.error("[share] metadata failed", err);
    return { ...CLOSED, errorMessage: "Could not open this link. Try again in a moment." };
  }
}

export async function requestShareOtpAction(params: { rawToken: string; email: string }): Promise<{ success: boolean; error?: string; locked?: boolean }> {
  try {
    const share = await loadShareByToken(params.rawToken);
    if (shareState(share) !== "ok") return { success: false, locked: true, error: "This link is no longer active." };
    const s = share!;
    const email = String(params.email || "").toLowerCase().trim().slice(0, 255);
    if (!email) return { success: false, error: "Enter your email address." };
    if (email !== s.recipient_email) {
      const error = await wrongEmail(s, email);
      return { success: false, error, locked: error.includes("now locked") };
    }

    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("dms_share_otps")
      .select("created_at")
      .eq("share_id", s.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    if ((recent?.length || 0) >= OTP_MAX_PER_15_MIN) return { success: false, error: "Too many codes requested. Wait 15 minutes and try again." };
    if (recent?.[0] && Date.now() - new Date(recent[0].created_at).getTime() < OTP_MIN_GAP_SECONDS * 1000) {
      return { success: false, error: "A code was just sent. Wait half a minute before asking for another." };
    }

    const otp = newOtp();
    await supabaseAdmin.from("dms_share_otps").update({ is_used: true }).eq("share_id", s.id).eq("is_used", false);
    const { error } = await supabaseAdmin.from("dms_share_otps").insert({
      share_id: s.id,
      recipient_email: email,
      otp_hash: hmac("otp", `${s.id}:${otp}`),
      expires_at: new Date(Date.now() + OTP_MINUTES * 60_000).toISOString(),
      is_used: false,
      attempt_count: 0,
    });
    if (error) throw error;

    await queueShareEmail(
      email,
      `${otp} is your Chandak Group document code`,
      mailFrame(
        "Your one-time code",
        `<p>Use this code to open the documents shared with you:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px;background:#f1f5f9;border-radius:8px;display:inline-block;padding:10px 20px">${otp}</p>
<p style="font-size:12px;color:#64748b">It works once and expires in ${OTP_MINUTES} minutes. Chandak Group will never ask you for this code.</p>`
      )
    );
    await logShareAttempt(s.id, "OTP_SENT", true, email);
    return { success: true };
  } catch (err) {
    console.error("[share] otp failed", err);
    return { success: false, error: "Could not send the code. Try again in a moment." };
  }
}

export async function verifyShareAccessAction(params: {
  rawToken: string;
  email: string;
  password?: string;
  otp: string;
}): Promise<{ success: boolean; error?: string; locked?: boolean; content?: ShareContent }> {
  try {
    const share = await loadShareByToken(params.rawToken);
    if (shareState(share) !== "ok") return { success: false, locked: true, error: "This link is no longer active." };
    const s = share!;
    const email = String(params.email || "").toLowerCase().trim().slice(0, 255);
    if (email !== s.recipient_email) {
      const error = await wrongEmail(s, email);
      return { success: false, error, locked: error.includes("now locked") };
    }

    if (s.password_hash && !verifySharePassword(String(params.password || ""), s.password_hash)) {
      await logShareAttempt(s.id, "WRONG_PASSWORD", false, email);
      const error = await registerFailure(s, "PASSWORD");
      return { success: false, error, locked: error.includes("now locked") };
    }

    const { data: otpRow } = await supabaseAdmin
      .from("dms_share_otps")
      .select("id, otp_hash, attempt_count")
      .eq("share_id", s.id)
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const code = String(params.otp || "").replace(/\D/g, "").slice(0, 6);
    if (!otpRow || code.length !== 6 || !safeEqualHex(otpRow.otp_hash, hmac("otp", `${s.id}:${code}`))) {
      if (otpRow) {
        // A code survives three wrong tries, then a new one is needed
        const tries = (otpRow.attempt_count || 0) + 1;
        await supabaseAdmin.from("dms_share_otps").update({ attempt_count: tries, is_used: tries >= 3 }).eq("id", otpRow.id);
      }
      await logShareAttempt(s.id, "WRONG_OTP", false, email);
      const error = await registerFailure(s, "OTP");
      return { success: false, error, locked: error.includes("now locked") };
    }

    // Use the code once; a parallel request that loses this race gets nothing
    const { data: used } = await supabaseAdmin
      .from("dms_share_otps")
      .update({ is_used: true })
      .eq("id", otpRow.id)
      .eq("is_used", false)
      .select("id");
    if (!used?.length) return { success: false, error: "That code has already been used. Ask for a new one." };

    await supabaseAdmin.from("dms_shares").update({ failed_otp_attempts: 0, failed_password_attempts: 0, last_access_at: new Date().toISOString() }).eq("id", s.id);
    await startShareSession(params.rawToken, s, newSessionToken());
    await logShareAttempt(s.id, "SUCCESSFUL_LOGIN", true, email);
    await supabaseAdmin.rpc("fn_dms_audit", {
      p_actor: null,
      p_action: "SHARE_OPENED",
      p_entity_type: "SHARE",
      p_entity_id: s.id,
      p_details: { recipient: email, ip: (await clientInfo()).ip },
    });
    return { success: true, content: await contentFor(params.rawToken, s) };
  } catch (err) {
    console.error("[share] verify failed", err);
    return { success: false, error: "Could not check your details. Try again in a moment." };
  }
}

/** Reopen the documents in a browser that already passed the checks (page reload). */
export async function fetchShareContentAction(rawToken: string): Promise<{ success: boolean; error?: string; content?: ShareContent }> {
  try {
    const share = await loadShareByToken(rawToken);
    if (shareState(share) !== "ok") return { success: false, error: "This link is no longer active." };
    if (!(await hasShareSession(rawToken, share!))) return { success: false, error: "Please verify your email again." };
    return { success: true, content: await contentFor(rawToken, share!) };
  } catch (err) {
    console.error("[share] content failed", err);
    return { success: false, error: "Could not load the documents." };
  }
}

export async function endShareSessionAction(rawToken: string): Promise<{ success: boolean }> {
  try {
    await endShareSession(rawToken, await loadShareByToken(rawToken));
  } catch {
    /* signing out never fails visibly */
  }
  return { success: true };
}
