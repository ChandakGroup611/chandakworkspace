"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function markAttendance(
  sessionId: string,
  userId: string,
  status: "present" | "late" | "absent" | "excused",
  method: "qr" | "video" | "self" | "manual" = "manual",
  lateMinutes: number = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await getCachedUser();
    const actorId = user?.id || null;
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("meet_session_attendees")
      .update({
        attendance: status,
        check_in_at: status === "present" || status === "late" ? now : null,
        check_in_method: method,
        late_minutes: lateMinutes,
        marked_by: actorId,
      })
      .eq("session_id", sessionId)
      .eq("user_id", userId);

    if (error) throw error;

    revalidatePath(`/meet/sessions/${sessionId}`);
    revalidatePath(`/meet/live/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error marking attendance:", err);
    return { success: false, error: err.message };
  }
}

export async function generateSessionCheckInQR(sessionId: string): Promise<{ qrString: string; expiresAt: number }> {
  const expiresAt = Math.floor(Date.now() / 1000) + 60; // 60s rotating window
  const secret = process.env.NEXTAUTH_SECRET || "chandak-meet-secret";
  const hash = crypto.createHmac("sha256", secret).update(`${sessionId}:${expiresAt}`).digest("hex");
  const qrString = `CHANDAK_MEET_QR:${sessionId}:${expiresAt}:${hash.slice(0, 16)}`;
  return { qrString, expiresAt };
}

export async function checkInWithQR(
  sessionId: string,
  qrToken: string
): Promise<{ success: boolean; message: string; status?: string; lateMinutes?: number }> {
  try {
    const { user } = await getCachedUser();
    if (!user) return { success: false, message: "Please log in to check in" };

    const parts = qrToken.split(":");
    if (parts.length !== 4 || parts[0] !== "CHANDAK_MEET_QR") {
      return { success: false, message: "Invalid check-in QR code" };
    }

    const [, tokenSessionId, expiresStr, hashSub] = parts;
    if (tokenSessionId !== sessionId) {
      return { success: false, message: "QR code belongs to a different session" };
    }

    const expiresAt = parseInt(expiresStr, 10);
    if (Date.now() / 1000 > expiresAt + 30) {
      return { success: false, message: "QR code has expired. Please rescan fresh code." };
    }

    // Verify HMAC
    const secret = process.env.NEXTAUTH_SECRET || "chandak-meet-secret";
    const expected = crypto.createHmac("sha256", secret).update(`${sessionId}:${expiresAt}`).digest("hex").slice(0, 16);
    if (hashSub !== expected) {
      return { success: false, message: "Security signature mismatch on QR code" };
    }

    // Check session scheduled start for late calculation (> 5 min late)
    const { data: session } = await supabaseAdmin
      .from("meet_sessions")
      .select("scheduled_start")
      .eq("id", sessionId)
      .single();

    let lateMinutes = 0;
    let attendanceStatus: "present" | "late" = "present";

    if (session?.scheduled_start) {
      const scheduledMs = new Date(session.scheduled_start).getTime();
      const diffMinutes = Math.floor((Date.now() - scheduledMs) / 60000);
      if (diffMinutes > 5) {
        lateMinutes = diffMinutes;
        attendanceStatus = "late";
      }
    }

    // Mark check-in
    await markAttendance(sessionId, user.id, attendanceStatus, "qr", lateMinutes);

    return {
      success: true,
      message: attendanceStatus === "late" ? `Checked in late by ${lateMinutes} minutes` : "Checked in successfully",
      status: attendanceStatus,
      lateMinutes,
    };
  } catch (err: any) {
    console.error("Error checking in with QR:", err);
    return { success: false, message: err.message };
  }
}
