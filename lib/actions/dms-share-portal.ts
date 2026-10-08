"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies, headers } from "next/headers";
import crypto from "crypto";

const SERVER_SALT = process.env.SHARE_SECRET_SALT || "chandak-enterprise-dms-secure-salt-2026";

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(`${rawToken}:${SERVER_SALT}`).digest("hex");
}

function hashOtp(otp: string, shareId: string): string {
  return crypto.createHmac("sha256", SERVER_SALT).update(`${otp}:${shareId}`).digest("hex");
}

export interface SharePublicMetadata {
  isValid: boolean;
  isExpired: boolean;
  isLocked: boolean;
  workspaceName?: string;
  projectName?: string;
  recipientEmailMasked?: string;
  allowView: boolean;
  allowComment: boolean;
  allowUploadRevision: boolean;
  allowDownload: boolean;
  expiresAt?: string;
  errorMessage?: string;
}

export interface SharedItemDetail {
  id: string;
  itemType: "DRAWING_REVISION" | "DOCUMENT";
  title: string;
  codeOrNumber: string;
  disciplineOrType: string;
  versionOrRev: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  previewUrl?: string;
  downloadUrl?: string;
  isGfc?: boolean;
  commentsCount?: number;
}

/**
 * Step 1: Safe Landing Fetch (Safe Links Immune - Consumes 0 attempts, unlocks nothing)
 */
export async function fetchSharePublicMetadataAction(rawToken: string): Promise<SharePublicMetadata> {
  try {
    const supabase = await getSupabase();
    const tokenHash = hashToken(rawToken);

    const { data: share, error } = await supabase
      .from("dms_shares")
      .select(`
        id,
        recipient_email,
        failed_otp_attempts,
        failed_password_attempts,
        expires_at,
        is_revoked,
        revoked_reason,
        allow_view,
        allow_comment,
        allow_upload_revision,
        allow_download,
        dms_workspaces (
          name
        )
      `)
      .eq("token_hash", tokenHash)
      .single();

    if (error || !share) {
      return {
        isValid: false,
        isExpired: false,
        isLocked: false,
        allowView: false,
        allowComment: false,
        allowUploadRevision: false,
        allowDownload: false,
        errorMessage: "Secure link is invalid or has expired.",
      };
    }

    const isExpired = new Date(share.expires_at) < new Date();
    const isLocked =
      share.is_revoked ||
      (share.failed_otp_attempts || 0) >= 5 ||
      (share.failed_password_attempts || 0) >= 5;

    if (isLocked) {
      return {
        isValid: false,
        isExpired,
        isLocked: true,
        allowView: false,
        allowComment: false,
        allowUploadRevision: false,
        allowDownload: false,
        errorMessage: "This link has been locked due to excessive failed attempts or administrative revocation.",
      };
    }

    if (isExpired) {
      return {
        isValid: false,
        isExpired: true,
        isLocked: false,
        allowView: false,
        allowComment: false,
        allowUploadRevision: false,
        allowDownload: false,
        errorMessage: "This secure link has expired.",
      };
    }

    // Mask recipient email e.g. a***e@consultant.com
    const emailParts = share.recipient_email.split("@");
    const maskedUser =
      emailParts[0].length > 2
        ? `${emailParts[0][0]}***${emailParts[0][emailParts[0].length - 1]}`
        : `${emailParts[0][0]}*`;
    const maskedEmail = `${maskedUser}@${emailParts[1] || "domain.com"}`;

    return {
      isValid: true,
      isExpired: false,
      isLocked: false,
      workspaceName: (share.dms_workspaces as any)?.name || "Chandak Group Corporate",
      recipientEmailMasked: maskedEmail,
      allowView: !!share.allow_view,
      allowComment: !!share.allow_comment,
      allowUploadRevision: !!share.allow_upload_revision,
      allowDownload: !!share.allow_download,
      expiresAt: share.expires_at,
    };
  } catch (err: any) {
    console.error("[fetchSharePublicMetadataAction] Error:", err);
    return {
      isValid: false,
      isExpired: false,
      isLocked: false,
      allowView: false,
      allowComment: false,
      allowUploadRevision: false,
      allowDownload: false,
      errorMessage: "Could not establish secure connection.",
    };
  }
}

/**
 * Step 2: Request 6-digit Out-of-Band OTP
 */
export async function requestShareOtpAction(params: {
  rawToken: string;
  email: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabase();
    const tokenHash = hashToken(params.rawToken);
    const normalizedEmail = params.email.toLowerCase().trim();

    const { data: share, error } = await supabase
      .from("dms_shares")
      .select("id, recipient_email, is_revoked, expires_at, failed_otp_attempts")
      .eq("token_hash", tokenHash)
      .single();

    if (error || !share) {
      return { success: false, error: "Invalid link or link has expired." };
    }

    if (share.is_revoked || (share.failed_otp_attempts || 0) >= 5) {
      return { success: false, error: "Link is locked." };
    }

    if (share.recipient_email.toLowerCase().trim() !== normalizedEmail) {
      return { success: false, error: "Entered email does not match authorized recipient." };
    }

    // Generate random 6-digit OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHashValue = hashOtp(rawOtp, share.id);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Invalidate old OTPs
    await supabase.from("dms_share_otps").update({ is_used: true }).eq("share_id", share.id);

    // Insert new OTP record
    await supabase.from("dms_share_otps").insert({
      share_id: share.id,
      recipient_email: normalizedEmail,
      otp_hash: otpHashValue,
      expires_at: expiresAt,
      is_used: false,
    });

    // Enqueue email in queue
    await supabase.from("dmac_email_queue").insert({
      recipient_email: normalizedEmail,
      subject: "Your Chandak Group Secure Document Access Code",
      html_body: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2>Chandak Group • Secure Document Portal</h2>
          <p>You requested access to shared project documents.</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; padding: 12px 24px; background: #f1f5f9; border-radius: 8px; display: inline-block; margin: 16px 0;">
            ${rawOtp}
          </div>
          <p style="font-size: 12px; color: #64748b;">This one-time passcode expires in 10 minutes. If you did not initiate this request, please contact Chandak Group IT security.</p>
        </div>
      `,
    });

    return { success: true };
  } catch (err: any) {
    console.error("[requestShareOtpAction] Error:", err);
    return { success: false, error: "Failed to dispatch one-time passcode." };
  }
}

/**
 * Step 3: Verify Dual Challenge (Password + OTP) & Bind Session Token
 */
export async function verifyShareAccessAction(params: {
  rawToken: string;
  email: string;
  password?: string;
  otp: string;
  deviceFingerprint: string;
}): Promise<{
  success: boolean;
  sessionToken?: string;
  items?: SharedItemDetail[];
  watermarkText?: string;
  permissions?: {
    allowView: boolean;
    allowComment: boolean;
    allowUploadRevision: boolean;
    allowDownload: boolean;
  };
  error?: string;
}> {
  try {
    const supabase = await getSupabase();
    const tokenHash = hashToken(params.rawToken);
    const normalizedEmail = params.email.toLowerCase().trim();
    const headerList = await headers();
    const clientIp = headerList.get("x-forwarded-for") || headerList.get("x-real-ip") || "127.0.0.1";

    const { data: share, error } = await supabase
      .from("dms_shares")
      .select(`
        id,
        recipient_email,
        password_hash,
        failed_otp_attempts,
        failed_password_attempts,
        expires_at,
        is_revoked,
        allow_view,
        allow_comment,
        allow_upload_revision,
        allow_download
      `)
      .eq("token_hash", tokenHash)
      .single();

    if (error || !share) {
      return { success: false, error: "Link is invalid or expired." };
    }

    // 1. Lockout Gate
    if (share.is_revoked || (share.failed_otp_attempts || 0) >= 5 || (share.failed_password_attempts || 0) >= 5) {
      return { success: false, error: "Access has been locked due to excessive failed attempts." };
    }

    // 2. Email Match
    if (share.recipient_email.toLowerCase().trim() !== normalizedEmail) {
      await logAccessAttempt(share.id, "EMAIL_MISMATCH", normalizedEmail, clientIp, false);
      return { success: false, error: "Email does not match authorized recipient." };
    }

    // 3. Password Verification (If link is password-protected)
    if (share.password_hash) {
      const inputPassHash = crypto.createHash("sha256").update(`${params.password || ""}:${SERVER_SALT}`).digest("hex");
      if (inputPassHash !== share.password_hash) {
        const newFailedCount = (share.failed_password_attempts || 0) + 1;
        await supabase
          .from("dms_shares")
          .update({
            failed_password_attempts: newFailedCount,
            is_revoked: newFailedCount >= 5,
            revoked_reason: newFailedCount >= 5 ? "EXCEEDED_MAX_FAILED_PASSWORD_ATTEMPTS" : null,
          })
          .eq("id", share.id);

        await logAccessAttempt(share.id, "WRONG_PASSWORD", normalizedEmail, clientIp, false);

        if (newFailedCount >= 5) {
          return { success: false, error: "Account locked: 5 invalid password attempts exceeded." };
        }
        return { success: false, error: `Invalid password. ${5 - newFailedCount} attempts remaining.` };
      }
    }

    // 4. OTP Verification
    const inputOtpHash = hashOtp(params.otp.trim(), share.id);
    const { data: otpRecord } = await supabase
      .from("dms_share_otps")
      .select("id, expires_at, is_used")
      .eq("share_id", share.id)
      .eq("otp_hash", inputOtpHash)
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!otpRecord) {
      const newOtpFailed = (share.failed_otp_attempts || 0) + 1;
      await supabase
        .from("dms_shares")
        .update({
          failed_otp_attempts: newOtpFailed,
          is_revoked: newOtpFailed >= 5,
          revoked_reason: newOtpFailed >= 5 ? "EXCEEDED_MAX_FAILED_OTP_ATTEMPTS" : null,
        })
        .eq("id", share.id);

      await logAccessAttempt(share.id, "WRONG_OTP", normalizedEmail, clientIp, false);

      if (newOtpFailed >= 5) {
        return { success: false, error: "Account locked: 5 invalid OTP attempts exceeded." };
      }
      return { success: false, error: `Invalid or expired OTP. ${5 - newOtpFailed} attempts remaining.` };
    }

    // Mark OTP used
    await supabase.from("dms_share_otps").update({ is_used: true }).eq("id", otpRecord.id);

    // Reset failed attempt counters on successful login
    await supabase
      .from("dms_shares")
      .update({ failed_otp_attempts: 0, failed_password_attempts: 0 })
      .eq("id", share.id);

    // 5. Generate Session Token & Bind Device
    const rawSessionToken = crypto.randomBytes(32).toString("hex");
    const sessionTokenHash = crypto.createHash("sha256").update(rawSessionToken).digest("hex");
    const fpHash = crypto.createHash("sha256").update(params.deviceFingerprint || "unknown").digest("hex");
    const sessionExpiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24 hours

    await supabase.from("dms_share_devices").insert({
      share_id: share.id,
      device_fingerprint_hash: fpHash,
      session_token_hash: sessionTokenHash,
      expires_at: sessionExpiresAt,
    });

    await logAccessAttempt(share.id, "SUCCESSFUL_LOGIN", normalizedEmail, clientIp, true);

    // 6. Fetch Shared Items
    const { data: shareItems } = await supabase
      .from("dms_share_items")
      .select(`
        id,
        document_id,
        drawing_revision_id,
        dms_documents (
          id,
          title,
          original_file_name,
          current_version_no,
          dms_doc_types (code, name),
          dms_document_versions (
            id,
            version_no,
            storage_key,
            file_name,
            file_size_bytes,
            mime_type
          )
        ),
        dmac_drawing_revisions (
          id,
          rev_no,
          is_gfc,
          dmac_drawings (
            id,
            drawing_number,
            title,
            dmac_departments (code, name)
          ),
          dmac_revision_files (
            id,
            file_role,
            storage_key,
            file_name,
            file_size_bytes
          )
        )
      `)
      .eq("share_id", share.id);

    const items: SharedItemDetail[] = (shareItems || []).map((si: any) => {
      if (si.drawing_revision_id && si.dmac_drawing_revisions) {
        const rev = si.dmac_drawing_revisions;
        const drawing = rev.dmac_drawings;
        const primFile = (rev.dmac_revision_files || [])[0] || {};
        return {
          id: rev.id,
          itemType: "DRAWING_REVISION",
          title: drawing?.title || "Drawing Sheet",
          codeOrNumber: drawing?.drawing_number || "DWG-001",
          disciplineOrType: drawing?.dmac_departments?.name || "Architecture",
          versionOrRev: `Rev R${rev.rev_no}`,
          fileName: primFile.file_name || `${drawing?.drawing_number}.pdf`,
          fileSizeBytes: primFile.file_size_bytes || 1024 * 1024,
          mimeType: "application/pdf",
          isGfc: !!rev.is_gfc,
        };
      } else if (si.document_id && si.dms_documents) {
        const doc = si.dms_documents;
        const ver = (doc.dms_document_versions || [])[0] || {};
        return {
          id: doc.id,
          itemType: "DOCUMENT",
          title: doc.title,
          codeOrNumber: doc.dms_doc_types?.code || "DOC",
          disciplineOrType: doc.dms_doc_types?.name || "Document",
          versionOrRev: `v${doc.current_version_no}`,
          fileName: doc.original_file_name,
          fileSizeBytes: ver.file_size_bytes || 512 * 1024,
          mimeType: ver.mime_type || "application/pdf",
        };
      }
      return null as any;
    }).filter(Boolean);

    const timestampIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const watermarkText = `${normalizedEmail} • IP: ${clientIp} • ${timestampIST} • CONFIDENTIAL CHANDAK GROUP`;

    return {
      success: true,
      sessionToken: rawSessionToken,
      items,
      watermarkText,
      permissions: {
        allowView: !!share.allow_view,
        allowComment: !!share.allow_comment,
        allowUploadRevision: !!share.allow_upload_revision,
        allowDownload: !!share.allow_download,
      },
    };
  } catch (err: any) {
    console.error("[verifyShareAccessAction] Error:", err);
    return { success: false, error: "Authentication failed. Please try again." };
  }
}

async function logAccessAttempt(
  shareId: string,
  attemptType: string,
  email: string,
  ip: string,
  isSuccessful: boolean
) {
  try {
    const supabase = await getSupabase();
    await supabase.from("dms_share_access_attempts").insert({
      share_id: shareId,
      attempt_type: attemptType,
      email_entered: email,
      ip_address: ip,
      is_successful: isSuccessful,
    });
  } catch (err) {
    console.warn("Could not log share access attempt:", err);
  }
}
