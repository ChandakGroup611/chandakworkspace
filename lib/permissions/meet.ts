import { getCachedUser } from "@/lib/auth/cached-user";
import { hasPermission } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase/service_role";

export type CanonicalMeetPermissionCode =
  | "MEET_VIEW"
  | "MEET_CREATE"
  | "MEET_UPDATE"
  | "MEET_DELETE"
  | "MEET_SESSION_RUN"
  | "MEET_POINT_MANAGE"
  | "MEET_TASK_MANAGE"
  | "MEET_EXTENSION_APPROVE"
  | "MEET_DECISION_MANAGE"
  | "MEET_MOM_APPROVE"
  | "MEET_MOM_PUBLISH"
  | "MEET_REPORT_VIEW"
  | "MEET_ADMIN";

export type MeetPermissionCode =
  | CanonicalMeetPermissionCode
  | "MEET_RESCHEDULE"
  | "MEET_NOTE_MANAGE"
  | "MEET_MOM_EDIT";

export interface MeetAuthContext {
  meetingId?: string;
  sessionId?: string;
  pointId?: string;
  taskId?: string;
  requireOrganizerOrChair?: boolean;
  requireChair?: boolean;
  requireAdmin?: boolean;
}

export interface MeetAuthResult {
  allowed: boolean;
  error?: string;
  user: any;
  userId: string;
  isSuperAdmin: boolean;
  isMeetAdmin: boolean;
  roleInMeeting?: "organizer" | "chair" | "minute_taker" | "attendee" | "member" | "admin" | null;
}

/**
 * Enterprise Server Guard for Chandak Meet (Spec A4, S2, S3, S5)
 * Enforces authenticated session, Super Admin/Meet Admin bypass, explicit MEET_* permission check,
 * meeting confidentiality boundaries, and role-based execution gates.
 */
export async function requireMeet(
  permissionCode: MeetPermissionCode,
  context?: MeetAuthContext
): Promise<MeetAuthResult> {
  const { user } = await getCachedUser();
  if (!user || !user.id) {
    throw new Error("Unauthorized: Please sign in to access Chandak Meet.");
  }

  const userId = user.id;

  // Resolve canonical permission code for seeded database matrix
  const canonicalCode: CanonicalMeetPermissionCode =
    permissionCode === "MEET_RESCHEDULE"
      ? "MEET_UPDATE"
      : permissionCode === "MEET_NOTE_MANAGE"
      ? "MEET_SESSION_RUN"
      : permissionCode === "MEET_MOM_EDIT"
      ? "MEET_MOM_APPROVE"
      : (permissionCode as CanonicalMeetPermissionCode);

  // 1. Check Super Admin and Meet Admin
  const [isSuperAdmin, isMeetAdmin] = await Promise.all([
    hasPermission(userId, "SUPER_ADMIN"),
    hasPermission(userId, "MEET_ADMIN"),
  ]);

  // If action requires MEET_ADMIN (e.g. settings/masters/sla admin)
  if (context?.requireAdmin || canonicalCode === "MEET_ADMIN") {
    if (!isSuperAdmin && !isMeetAdmin) {
      await logSecurityAudit(userId, "UNAUTHORIZED_ADMIN_ATTEMPT", { permissionCode, canonicalCode, context });
      throw new Error("Forbidden: This action requires Meet Administrator privileges (MEET_ADMIN).");
    }
    return { allowed: true, user, userId, isSuperAdmin, isMeetAdmin, roleInMeeting: "admin" };
  }

  // 2. Check base MEET_* permission (Super Admin & Meet Admin bypass base permission check)
  if (!isSuperAdmin && !isMeetAdmin) {
    const hasPerm = await hasPermission(userId, canonicalCode);
    if (!hasPerm) {
      await logSecurityAudit(userId, "PERMISSION_DENIED", { permissionCode, canonicalCode, context });
      throw new Error(`Forbidden: You lack the required permission (${canonicalCode}) to perform this action.`);
    }
  }

  // 3. Resolve Meeting Context if meetingId or sessionId provided
  let meetingId = context?.meetingId;
  if (!meetingId && context?.sessionId) {
    const { data: sess } = await supabaseAdmin
      .from("meet_sessions")
      .select("meeting_id")
      .eq("id", context.sessionId)
      .maybeSingle();
    meetingId = sess?.meeting_id;
  }

  if (!meetingId && context?.pointId) {
    const { data: pt } = await supabaseAdmin
      .from("meet_points")
      .select("meeting_id")
      .eq("id", context.pointId)
      .maybeSingle();
    meetingId = pt?.meeting_id;
  }

  let roleInMeeting: MeetAuthResult["roleInMeeting"] = isSuperAdmin || isMeetAdmin ? "admin" : null;

  if (meetingId) {
    const [meetingRes, memberRes] = await Promise.all([
      supabaseAdmin
        .from("meet_meetings")
        .select("id, title, organizer_id, chair_id, default_minute_taker_id, is_confidential, department_id")
        .eq("id", meetingId)
        .maybeSingle(),
      supabaseAdmin
        .from("meet_meeting_members")
        .select("role")
        .eq("meeting_id", meetingId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const meeting = meetingRes.data;
    if (meeting) {
      if (meeting.organizer_id === userId) {
        roleInMeeting = "organizer";
      } else if (meeting.chair_id === userId) {
        roleInMeeting = "chair";
      } else if (meeting.default_minute_taker_id === userId) {
        roleInMeeting = "minute_taker";
      } else if (memberRes.data?.role) {
        roleInMeeting = memberRes.data.role as any;
      }

      // Check Confidentiality boundary (Spec A14.5 / S3)
      if (meeting.is_confidential && !isSuperAdmin && !isMeetAdmin) {
        if (!roleInMeeting) {
          await logSecurityAudit(userId, "CONFIDENTIAL_MEETING_BREACH_ATTEMPT", {
            meetingId,
            title: meeting.title,
            permissionCode,
          });
          throw new Error("Forbidden: This meeting is confidential and restricted strictly to authorized participants.");
        }
      }

      // Role gates
      if (context?.requireChair && !isSuperAdmin && !isMeetAdmin) {
        if (roleInMeeting !== "chair" && roleInMeeting !== "organizer") {
          throw new Error("Forbidden: This action can only be approved by the Meeting Chair or Organizer.");
        }
      }

      if (context?.requireOrganizerOrChair && !isSuperAdmin && !isMeetAdmin) {
        if (roleInMeeting !== "organizer" && roleInMeeting !== "chair") {
          throw new Error("Forbidden: Only the Meeting Organizer or Chair can perform this action.");
        }
      }
    }
  }

  return {
    allowed: true,
    user,
    userId,
    isSuperAdmin,
    isMeetAdmin,
    roleInMeeting,
  };
}

/**
 * Log access denial or security rejection in meet_activity_log
 */
async function logSecurityAudit(userId: string, action: string, details: any) {
  try {
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "security",
      entity_id: userId,
      action: action.toLowerCase(),
      field: "authorization",
      old_value: null,
      new_value: JSON.stringify(details),
      user_id: userId,
      channel: "system",
    });
  } catch (e) {
    console.error("Failed to write security audit log:", e);
  }
}
