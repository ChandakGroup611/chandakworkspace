"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { dmsActor, dmsError, isUuid, resolveWorkspaceId } from "@/lib/dms/access";
import { namesFor } from "@/lib/dms/documents";
import { ensureShareSecret, escapeHtml, hashSharePassword, hmac, newLinkToken, newSharePassword, ShareNotConfiguredError, shareConfigured } from "@/lib/dms/share-crypto";
import { mailFrame, queueShareEmail, siteUrl } from "@/lib/dms/share-session";

/**
 * Sharing documents with people outside the company: create, list (share register), revoke,
 * access log and the workspace share policy. Rules are in fn_dms_create_share and friends
 * (supabase/migrations/20261126140000_dms_sharing.sql).
 */

type Result<T = {}> = ({ success: true } & T) | { success: false; error: string };

export interface SharePolicy {
  maxDays: number;
  allowDownload: boolean;
  requirePassword: boolean;
  blockedDomains: string[];
  maxItems: number;
  wrongEmailLimit: number;
  failedCodeLimit: number;
}

export type ShareStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "LOCKED";

export interface ShareRegisterRow {
  id: string;
  title: string | null;
  recipientEmail: string;
  recipientPhone: string | null;
  sharedByName: string;
  sharedByMe: boolean;
  createdAt: string;
  expiresAt: string;
  status: ShareStatus;
  revokedReason: string | null;
  revokedAt: string | null;
  allowDownload: boolean;
  hasPassword: boolean;
  downloadCount: number;
  maxDownloads: number | null;
  viewCount: number;
  lastAccessAt: string | null;
  failedAttempts: number;
  documents: { id: string; title: string }[];
}

export interface ShareAccessRow {
  at: string;
  type: string;
  ok: boolean;
  email: string | null;
  ip: string | null;
  userAgent: string | null;
}

const DEFAULT_POLICY: SharePolicy = {
  maxDays: 30,
  allowDownload: true,
  requirePassword: false,
  blockedDomains: [],
  maxItems: 50,
  wrongEmailLimit: 1,
  failedCodeLimit: 5,
};

async function policyFor(wsId: string): Promise<SharePolicy> {
  const { data } = await supabaseAdmin.from("dms_share_policy").select("*").eq("workspace_id", wsId).maybeSingle();
  if (!data) return DEFAULT_POLICY;
  return {
    maxDays: data.max_days,
    allowDownload: data.allow_download,
    requirePassword: data.require_password,
    blockedDomains: data.blocked_domains || [],
    maxItems: data.max_items,
    wrongEmailLimit: data.wrong_email_limit,
    failedCodeLimit: data.failed_code_limit,
  };
}

export async function fetchSharePolicyAction(workspaceId?: string): Promise<Result<{ policy: SharePolicy; canEdit: boolean; configured: boolean }>> {
  try {
    const actor = await dmsActor();
    const wsId = await resolveWorkspaceId(workspaceId);
    if (!wsId) return { success: false, error: "Workspace not found." };
    await ensureShareSecret();
    return { success: true, policy: await policyFor(wsId), canEdit: actor.base.admin, configured: shareConfigured() };
  } catch (err) {
    return { success: false, error: dmsError(err, "Could not load the share policy.") };
  }
}

export async function saveSharePolicyAction(policy: SharePolicy, workspaceId?: string): Promise<Result> {
  try {
    const actor = await dmsActor();
    const wsId = await resolveWorkspaceId(workspaceId);
    if (!wsId) return { success: false, error: "Workspace not found." };
    const clamp = (n: any, lo: number, hi: number, d: number) => Math.min(Math.max(Number.isFinite(+n) ? Math.round(+n) : d, lo), hi);
    const { error } = await supabaseAdmin.rpc("fn_dms_set_share_policy", {
      p_actor: actor.id,
      p_base: actor.base,
      p_workspace: wsId,
      p_policy: {
        max_days: clamp(policy.maxDays, 1, 365, 30),
        allow_download: !!policy.allowDownload,
        require_password: !!policy.requirePassword,
        blocked_domains: (policy.blockedDomains || []).map((d) => String(d).trim()).filter(Boolean).slice(0, 100),
        max_items: clamp(policy.maxItems, 1, 500, 50),
        wrong_email_limit: clamp(policy.wrongEmailLimit, 1, 10, 1),
        failed_code_limit: clamp(policy.failedCodeLimit, 1, 20, 5),
      },
    });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: dmsError(err, "Could not save the share policy.") };
  }
}

export async function createShareAction(params: {
  documentIds: string[];
  recipientEmail: string;
  recipientPhone?: string;
  expiresInDays: number;
  expiresInHours?: number;
  expiresInMinutes?: number;
  allowDownload: boolean;
  maxDownloads?: number | null;
  usePassword: boolean;
  title?: string;
  message?: string;
  workspaceId?: string;
}): Promise<Result<{ shareId: string; url: string; password: string | null; expiresAt: string }>> {
  try {
    await ensureShareSecret();
    if (!shareConfigured()) throw new ShareNotConfiguredError();
    const actor = await dmsActor();
    const wsId = await resolveWorkspaceId(params.workspaceId);
    if (!wsId) return { success: false, error: "Workspace not found." };
    const ids = Array.from(new Set((params.documentIds || []).filter(isUuid)));
    const rawMinutes =
      Math.max(0, Math.round(Number(params.expiresInDays) || 0)) * 1440 +
      Math.max(0, Math.round(Number(params.expiresInHours) || 0)) * 60 +
      Math.max(0, Math.round(Number(params.expiresInMinutes) || 0));
    const totalMinutes = Math.min(Math.max(rawMinutes, 1), 365 * 1440);
    const expiresAt = new Date(Date.now() + totalMinutes * 60_000).toISOString();
    const token = newLinkToken();
    const password = params.usePassword ? newSharePassword() : null;
    const maxDl = params.allowDownload && params.maxDownloads ? Math.max(Math.round(Number(params.maxDownloads)), 1) : null;

    const { data: shareId, error } = await supabaseAdmin.rpc("fn_dms_create_share", {
      p_actor: actor.id,
      p_base: actor.base,
      p_workspace: wsId,
      p_documents: ids,
      p_email: params.recipientEmail,
      p_phone: params.recipientPhone || null,
      p_expires_at: expiresAt,
      p_allow_download: !!params.allowDownload,
      p_allow_print: false,
      p_max_downloads: maxDl,
      p_title: params.title || null,
      p_message: params.message || null,
      p_token_hash: hmac("token", token),
      p_password_hash: password ? hashSharePassword(password) : null,
    });
    if (error) throw error;

    const url = `${siteUrl()}/share/${token}`;
    const [{ data: me }, { data: docs }] = await Promise.all([
      supabaseAdmin.from("user_master").select("full_name, email").eq("id", actor.id).maybeSingle(),
      supabaseAdmin.from("dms_documents").select("title").in("id", ids),
    ]);
    const from = me?.full_name || me?.email || actor.email || "Chandak Group";
    const list = (docs || []).slice(0, 10).map((d: any) => `<li>${escapeHtml(d.title)}</li>`).join("");
    const more = (docs?.length || 0) > 10 ? `<li>and ${docs!.length - 10} more</li>` : "";
    await queueShareEmail(
      String(params.recipientEmail).toLowerCase().trim(),
      `${from} shared ${params.title ? `“${params.title}”` : "documents"} with you`,
      mailFrame(
        `${escapeHtml(from)} shared documents with you`,
        `${params.message ? `<p style="white-space:pre-wrap;border-left:3px solid #cbd5e1;padding-left:10px">${escapeHtml(params.message)}</p>` : ""}
<ul>${list}${more}</ul>
<p><a href="${url}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Open the documents</a></p>
<p style="font-size:12px;color:#64748b">You will be asked for this email address and a one-time code that we send here.${password ? " You also need a password, which the sender will give you separately." : ""} The link works until ${new Date(expiresAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} IST. Do not forward it: it only works for you.</p>`
      )
    );
    return { success: true, shareId: shareId as string, url, password, expiresAt };
  } catch (err) {
    return { success: false, error: dmsError(err, "Could not create the share.") };
  }
}

function statusOf(s: any): ShareStatus {
  if (s.is_revoked) return s.revoked_by ? "REVOKED" : String(s.revoked_reason || "").startsWith("Locked") ? "LOCKED" : "REVOKED";
  if (new Date(s.expires_at).getTime() <= Date.now()) return "EXPIRED";
  return "ACTIVE";
}

/** Share register. Everyone sees the shares they made; DMS administrators see all of them. */
export async function fetchShareRegisterAction(params: {
  scope?: "mine" | "all";
  documentId?: string;
  workspaceId?: string;
} = {}): Promise<Result<{ shares: ShareRegisterRow[]; isAdmin: boolean }>> {
  try {
    const actor = await dmsActor();
    const wsId = await resolveWorkspaceId(params.workspaceId);
    if (!wsId) return { success: true, shares: [], isAdmin: actor.base.admin };

    let shareIds: string[] | null = null;
    if (isUuid(params.documentId)) {
      const { data: items } = await supabaseAdmin.from("dms_share_items").select("share_id").eq("document_id", params.documentId);
      shareIds = Array.from(new Set((items || []).map((i: any) => i.share_id)));
      if (!shareIds.length) return { success: true, shares: [], isAdmin: actor.base.admin };
    }

    let q = supabaseAdmin
      .from("dms_shares")
      .select(
        "id, title, recipient_email, recipient_phone, created_by, created_at, expires_at, is_revoked, revoked_reason, revoked_at, revoked_by, allow_download, password_hash, download_count, max_downloads, view_count, last_access_at, failed_otp_attempts, failed_password_attempts, failed_email_attempts, dms_share_items ( document_id, dms_documents ( id, title ) )"
      )
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (!(actor.base.admin && params.scope === "all")) q = q.eq("created_by", actor.id);
    if (shareIds) q = q.in("id", shareIds);
    const { data, error } = await q;
    if (error) throw error;

    const names = await namesFor((data || []).map((s: any) => s.created_by));
    return {
      success: true,
      isAdmin: actor.base.admin,
      shares: (data || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        recipientEmail: s.recipient_email,
        recipientPhone: s.recipient_phone,
        sharedByName: names.get(s.created_by) || "Unknown",
        sharedByMe: s.created_by === actor.id,
        createdAt: s.created_at,
        expiresAt: s.expires_at,
        status: statusOf(s),
        revokedReason: s.revoked_reason,
        revokedAt: s.revoked_at,
        allowDownload: !!s.allow_download,
        hasPassword: !!s.password_hash,
        downloadCount: s.download_count || 0,
        maxDownloads: s.max_downloads,
        viewCount: s.view_count || 0,
        lastAccessAt: s.last_access_at,
        failedAttempts: (s.failed_otp_attempts || 0) + (s.failed_password_attempts || 0) + (s.failed_email_attempts || 0),
        documents: (s.dms_share_items || [])
          .map((i: any) => (Array.isArray(i.dms_documents) ? i.dms_documents[0] : i.dms_documents))
          .filter(Boolean)
          .map((d: any) => ({ id: d.id, title: d.title })),
      })),
    };
  } catch (err) {
    return { success: false, error: dmsError(err, "Could not load the share register.") };
  }
}

async function canSeeShare(shareId: string): Promise<{ ok: boolean; actorId: string; base: any }> {
  const actor = await dmsActor();
  const { data } = await supabaseAdmin.from("dms_shares").select("created_by").eq("id", shareId).maybeSingle();
  return { ok: !!data && (data.created_by === actor.id || actor.base.admin), actorId: actor.id, base: actor.base };
}

export async function fetchShareAccessLogAction(shareId: string): Promise<Result<{ entries: ShareAccessRow[] }>> {
  try {
    if (!isUuid(shareId)) return { success: false, error: "Share not found." };
    const { ok } = await canSeeShare(shareId);
    if (!ok) return { success: false, error: "Only the person who shared it or a DMS administrator can see this log." };
    const { data, error } = await supabaseAdmin
      .from("dms_share_access_attempts")
      .select("created_at, attempt_type, is_successful, email_entered, ip_address, user_agent")
      .eq("share_id", shareId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return {
      success: true,
      entries: (data || []).map((a: any) => ({
        at: a.created_at,
        type: a.attempt_type,
        ok: !!a.is_successful,
        email: a.email_entered,
        ip: a.ip_address,
        userAgent: a.user_agent,
      })),
    };
  } catch (err) {
    return { success: false, error: dmsError(err, "Could not load the access log.") };
  }
}

export async function revokeShareAction(shareId: string, reason?: string): Promise<Result> {
  try {
    if (!isUuid(shareId)) return { success: false, error: "Share not found." };
    const actor = await dmsActor();
    const { error } = await supabaseAdmin.rpc("fn_dms_revoke_share", {
      p_actor: actor.id,
      p_base: actor.base,
      p_share: shareId,
      p_reason: reason || null,
    });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: dmsError(err, "Could not revoke the link.") };
  }
}
