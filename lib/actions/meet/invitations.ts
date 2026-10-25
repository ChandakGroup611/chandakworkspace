"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import type { MeetInvitation, RSVPResponse } from "@/types/meet";

export async function getSessionInvitations(sessionId: string): Promise<{
  invitations: MeetInvitation[];
  counts: {
    accepted: number;
    maybe: number;
    declined: number;
    proposed: number;
    pending: number;
    total: number;
  };
  currentUserInvite?: MeetInvitation | null;
}> {
  try {
    const { user } = await getCachedUser();
    const userId = user?.id;

    const { data, error } = await supabaseAdmin
      .from("meet_invitations")
      .select(`
        *,
        user:user_master!meet_invitations_user_id_fkey(id, full_name, email, profile_photo),
        delegate:user_master!meet_invitations_delegate_user_id_fkey(id, full_name, email)
      `)
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error fetching session invitations:", error);
      return {
        invitations: [],
        counts: { accepted: 0, maybe: 0, declined: 0, proposed: 0, pending: 0, total: 0 },
      };
    }

    const invitations = (data || []) as MeetInvitation[];
    const counts = {
      accepted: invitations.filter((i) => i.response === "accepted").length,
      maybe: invitations.filter((i) => i.response === "tentative").length,
      declined: invitations.filter((i) => i.response === "declined").length,
      proposed: invitations.filter((i) => i.response === "proposed").length,
      pending: invitations.filter((i) => i.response === "pending").length,
      total: invitations.length,
    };

    const currentUserInvite = invitations.find((i) => i.user_id === userId) || null;

    return {
      invitations,
      counts,
      currentUserInvite,
    };
  } catch (err: any) {
    console.error("Unexpected error in getSessionInvitations:", err);
    return {
      invitations: [],
      counts: { accepted: 0, maybe: 0, declined: 0, proposed: 0, pending: 0, total: 0 },
    };
  }
}

export async function respondToInvitation(
  sessionId: string,
  response: RSVPResponse,
  payload?: {
    note?: string;
    delegate_user_id?: string;
    proposed_start?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await getCachedUser();
    if (!user) return { success: false, error: "Authentication required" };

    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("meet_invitations")
      .upsert(
        {
          session_id: sessionId,
          user_id: user.id,
          response,
          responded_at: now,
          note: payload?.note || null,
          delegate_user_id: payload?.delegate_user_id || null,
          proposed_start: payload?.proposed_start || null,
          channel: "app",
          updated_at: now,
        },
        { onConflict: "session_id,user_id" }
      );

    if (error) throw error;

    // If declined with reason/delegate, also mark attendance excused
    if (response === "declined") {
      await supabaseAdmin
        .from("meet_session_attendees")
        .update({
          attendance: "excused",
          invite_status: "declined",
        })
        .eq("session_id", sessionId)
        .eq("user_id", user.id);

      // If delegate chosen, also invite delegate
      if (payload?.delegate_user_id) {
        try {
          await supabaseAdmin
            .from("meet_session_attendees")
            .insert({
              session_id: sessionId,
              user_id: payload.delegate_user_id,
              role: "attendee",
              invite_status: "invited",
              attendance: "absent",
            });
        } catch {
          // Ignore duplicate or constraint conflicts
        }
      }
    } else if (response === "accepted") {
      await supabaseAdmin
        .from("meet_session_attendees")
        .update({
          invite_status: "accepted",
        })
        .eq("session_id", sessionId)
        .eq("user_id", user.id);
    }

    revalidatePath(`/meet/sessions/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error responding to invitation:", err);
    return { success: false, error: err.message };
  }
}

export async function moveMeetingToProposedTime(
  sessionId: string,
  newStartIso: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await getCachedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: session } = await supabaseAdmin
      .from("meet_sessions")
      .select("*, meeting:meet_meetings(*)")
      .eq("id", sessionId)
      .single();

    if (!session) return { success: false, error: "Session not found" };

    const newStart = new Date(newStartIso);
    const durationMs = (session.meeting?.default_duration_minutes || 60) * 60 * 1000;
    const newEnd = new Date(newStart.getTime() + durationMs);

    // Update session times
    await supabaseAdmin
      .from("meet_sessions")
      .update({
        scheduled_start: newStart.toISOString(),
        scheduled_end: newEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // Reset pending/accepted answers except explicit declines
    await supabaseAdmin
      .from("meet_invitations")
      .update({
        response: "pending",
        responded_at: null,
        proposed_start: null,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId)
      .neq("response", "declined");

    // Log activity
    await supabaseAdmin.from("meet_activity_log").insert({
      meeting_id: session.meeting_id,
      session_id: sessionId,
      actor_id: user.id,
      action: "RESCHEDULED",
      entity_type: "session",
      entity_id: sessionId,
      details: {
        new_start: newStart.toISOString(),
        new_end: newEnd.toISOString(),
        reason: "Accepted proposed time",
      },
    });

    revalidatePath(`/meet/sessions/${sessionId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error moving meeting to proposed time:", err);
    return { success: false, error: err.message };
  }
}

export async function sendRSVPReminders(sessionId: string): Promise<{ success: boolean; remindedCount: number; error?: string }> {
  try {
    const { data: nonResponders } = await supabaseAdmin
      .from("meet_invitations")
      .select("id, user_id, reminder_count")
      .eq("session_id", sessionId)
      .eq("response", "pending");

    const count = nonResponders?.length || 0;
    if (count > 0) {
      for (const nr of nonResponders!) {
        await supabaseAdmin
          .from("meet_invitations")
          .update({
            reminder_count: (nr.reminder_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", nr.id);
      }
    }

    return { success: true, remindedCount: count };
  } catch (err: any) {
    console.error("Error sending RSVP reminders:", err);
    return { success: false, remindedCount: 0, error: err.message };
  }
}
