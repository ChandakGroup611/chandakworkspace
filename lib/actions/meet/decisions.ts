"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { isMeetingHost, NOT_HOST } from "@/lib/utils/meet-host";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import type { MeetingDecision, DecisionStatus } from "@/types/meet";
import { requireMeet } from "@/lib/permissions/meet";
import { getHiddenConfidentialMeetingIds } from "@/lib/utils/meet-scope";

export async function getDecisions(filters?: {
  search?: string;
  status?: string;
  meetingId?: string;
  sessionId?: string;
}): Promise<MeetingDecision[]> {
  try {
    const auth = await requireMeet("MEET_VIEW", filters?.sessionId ? { sessionId: filters.sessionId } : { meetingId: filters?.meetingId });
    if (!auth.allowed) return [];

    let query = supabaseAdmin
      .from("meet_decisions")
      .select(`
        *,
        session:meet_sessions(
          id, code, meeting_id,
          meeting:meet_meetings(id, title, code)
        ),
        point:meet_points(id, code, title)
      `)
      .order("decided_at", { ascending: false });

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters?.search) {
      query = query.ilike("text", `%${filters.search}%`);
    }
    if (filters?.sessionId) {
      query = query.eq("session_id", filters.sessionId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching decisions:", error);
      return [];
    }

    // Hide decisions of confidential meetings the user is not part of (Spec S3)
    const hidden = await getHiddenConfidentialMeetingIds(auth.userId, auth.isSuperAdmin || auth.isMeetAdmin);
    const visible = (data || []).filter((d: any) => !d.session?.meeting_id || !hidden.has(d.session.meeting_id));

    return visible as MeetingDecision[];
  } catch (err: any) {
    console.error("Unexpected error in getDecisions:", err);
    return [];
  }
}

export async function recordDecision(input: {
  sessionId: string;
  pointId?: string;
  text: string;
  decidedBy?: string;
  effectiveFrom?: string;
  reviewDate?: string;
  tags?: string[];
}) {
  try {
    const auth = await requireMeet("MEET_DECISION_MANAGE", { sessionId: input.sessionId });
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }
    if (!(await isMeetingHost(input.sessionId, auth.userId, auth.isSuperAdmin || auth.isMeetAdmin))) {
      return { success: false, error: "Only the organiser, chair or minute taker can record a decision for this meeting." };
    }

    const { user } = await getCachedUser();
    const userId = user?.id || null;

    const { data: decision, error } = await supabaseAdmin
      .from("meet_decisions")
      .insert({
        session_id: input.sessionId,
        point_id: input.pointId || null,
        text: input.text,
        decided_by: input.decidedBy || "Meeting Committee",
        effective_from: input.effectiveFrom || new Date().toISOString().split("T")[0],
        review_date: input.reviewDate || null,
        tags: input.tags || [],
        status: "active",
        created_by: userId,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Activity log
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "decision",
      entity_id: decision.id,
      action: "created",
      field: "status",
      new_value: "active",
      user_id: userId,
      channel: "web",
    });

    revalidatePath("/meet/decisions");
    revalidatePath(`/meet/sessions/${input.sessionId}`);
    return { success: true, decision };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function supersedeDecision(input: {
  oldDecisionId: string;
  sessionId: string;
  text: string;
  decidedBy?: string;
}) {
  try {
    const auth = await requireMeet("MEET_DECISION_MANAGE", { sessionId: input.sessionId });
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }

    const { user } = await getCachedUser();
    const userId = user?.id || null;

    // 1. Create new decision
    const { data: newDec, error: nErr } = await supabaseAdmin
      .from("meet_decisions")
      .insert({
        session_id: input.sessionId,
        text: input.text,
        decided_by: input.decidedBy || "Meeting Committee",
        status: "active",
        created_by: userId,
      })
      .select()
      .single();

    if (nErr || !newDec) return { success: false, error: nErr?.message || "Failed to create replacement decision" };

    // 2. Mark old decision as superseded
    await supabaseAdmin
      .from("meet_decisions")
      .update({
        status: "superseded",
        superseded_by_id: newDec.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.oldDecisionId);

    // Activity log
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "decision",
      entity_id: input.oldDecisionId,
      action: "superseded",
      field: "status",
      old_value: "active",
      new_value: "superseded",
      user_id: userId,
      channel: "web",
    });

    revalidatePath("/meet/decisions");
    return { success: true, decision: newDec };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateDecisionStatus(decisionId: string, status: DecisionStatus, remarks?: string) {
  try {
    const auth = await requireMeet("MEET_DECISION_MANAGE");
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }

    const { user } = await getCachedUser();
    const userId = user?.id || null;

    const { error } = await supabaseAdmin
      .from("meet_decisions")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", decisionId);

    if (error) return { success: false, error: error.message };

    // Valid schema activity log without non-existent remarks column
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "decision",
      entity_id: decisionId,
      action: "status_changed",
      field: "status",
      new_value: remarks ? `${status} (${remarks})` : status,
      user_id: userId,
      channel: "web",
    });

    revalidatePath("/meet/decisions");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getDecisionEligibleSessions() {
  try {
    const auth = await requireMeet("MEET_VIEW");
    if (!auth.allowed) return [];

    const { data, error } = await supabaseAdmin
      .from("meet_sessions")
      .select(`
        id, code, session_no, scheduled_date, status,
        meeting:meet_meetings(id, code, title)
      `)
      .order("scheduled_date", { ascending: false })
      .limit(60);

    if (error) {
      console.error("Error fetching sessions for decisions:", error);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error("Unexpected error in getDecisionEligibleSessions:", err);
    return [];
  }
}
