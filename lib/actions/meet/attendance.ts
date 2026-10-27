"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { requireMeet } from "@/lib/permissions/meet";

function getAttendanceSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    "chandak-meet-attendance-hmac-seed"
  );
}

export async function markAttendance(
  sessionId: string,
  userId: string,
  status: "present" | "late" | "absent" | "excused",
  method: "qr" | "video" | "self" | "manual" = "manual",
  lateMinutes: number = 0
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await getCachedUser();
    if (!user) return { success: false, error: "Authentication required" };
    const actorId = user.id;

    // S2 & E-9: Prevent marking others present without organizer, chair, or manager role
    if (userId !== actorId) {
      const auth = await requireMeet("MEET_SESSION_RUN", {
        sessionId,
        requireOrganizerOrChair: true,
      });
      if (!auth.allowed) {
        return {
          success: false,
          error: "Permission denied: Only session organizers, chairs, or meeting managers can mark attendance for other participants.",
        };
      }
    }

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

    // Audit log
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "session_attendee",
      entity_id: `${sessionId}:${userId}`,
      action: "attendance_marked",
      field: "attendance",
      new_value: status,
      user_id: actorId,
      channel: method === "qr" ? "qr" : "web",
    });

    revalidatePath(`/meet/sessions/${sessionId}`);
    revalidatePath(`/meet/live/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error marking attendance:", err);
    return { success: false, error: err.message };
  }
}

export async function generateSessionCheckInQR(sessionId: string): Promise<{ qrString: string; expiresAt: number; error?: string }> {
  try {
    const auth = await requireMeet("MEET_SESSION_RUN", { sessionId });
    if (!auth.allowed) {
      return { qrString: "", expiresAt: 0, error: auth.error || "Permission denied" };
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 60; // 60s rotating window
    const secret = getAttendanceSecret();
    const hash = crypto.createHmac("sha256", secret).update(`${sessionId}:${expiresAt}`).digest("hex");
    const qrString = `CHANDAK_MEET_QR:${sessionId}:${expiresAt}:${hash.slice(0, 16)}`;
    return { qrString, expiresAt };
  } catch (err: any) {
    return { qrString: "", expiresAt: 0, error: err.message };
  }
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
    if (Date.now() / 1000 > expiresAt + 60) {
      return { success: false, message: "QR code has expired. Please rescan fresh code." };
    }

    // Verify HMAC using dynamic server secret
    const secret = getAttendanceSecret();
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
    const res = await markAttendance(sessionId, user.id, attendanceStatus, "qr", lateMinutes);
    if (!res.success) {
      return { success: false, message: res.error || "Failed to record check-in" };
    }

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
