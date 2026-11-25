"use server";

import { sendMeetEmail } from "@/lib/utils/meet-email";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { isMeetingHost, NOT_HOST } from "@/lib/utils/meet-host";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import type { MeetingPoint, PointPriority, PointType, PointStatus } from "@/types/meet";
import { requireMeet } from "@/lib/permissions/meet";
import { addPeopleToMeeting } from "@/lib/utils/meet-people";

export interface CreatePointInput {
  meeting_id: string;
  session_id: string;
  agenda_item_id?: string;
  title: string;
  description?: string;
  point_type?: PointType;
  category_id?: string;
  department_id?: string;
  project_id?: string;
  milestone_name?: string;
  priority?: PointPriority;
  owner_id?: string;
  tat_days?: number;
  initial_task_title?: string;
}

export async function createPoint(input: CreatePointInput) {
  try {
    const auth = await requireMeet("MEET_POINT_MANAGE", {
      meetingId: input.meeting_id,
      sessionId: input.session_id,
    });
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }

    const { user } = await getCachedUser();
    const userId = user?.id || null;
    const tatDays = input.tat_days || 3;

    // 1. Calculate statutory working days due date
    const { data: dateRes } = await supabaseAdmin.rpc("fn_meet_calculate_due_date", {
      p_start_date: new Date().toISOString().split("T")[0],
      p_tat_days: tatDays,
    });

    const dueDate = dateRes || new Date(Date.now() + tatDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // 2. Insert into meet_points
    const { data: point, error: ptErr } = await supabaseAdmin
      .from("meet_points")
      .insert({
        meeting_id: input.meeting_id,
        origin_session_id: input.session_id,
        current_session_id: input.session_id,
        agenda_item_id: input.agenda_item_id || null,
        project_id: input.project_id || null,
        milestone_name: input.milestone_name || null,
        title: input.title,
        description: input.description || null,
        point_type: input.point_type || "action",
        category_id: input.category_id || null,
        department_id: input.department_id || null,
        priority: input.priority || "medium",
        owner_id: input.owner_id || null,
        raised_by_id: userId,
        tat_days: tatDays,
        due_date: dueDate,
        status: "open",
        progress_percent: 0,
        carry_forward_count: 0,
        is_backup: false,
        created_by: userId,
      })
      .select(`
        *,
        owner:user_master!meet_points_owner_id_fkey(id, full_name, email, profile_photo),
        category:meet_point_categories(id, name, default_tat_days)
      `)
      .single();

    if (ptErr || !point) {
      console.error("Error creating point:", ptErr);
      return { success: false, error: ptErr?.message || "Failed to create point" };
    }

    // Owner not in the meeting yet: add them, so the point is visible to them
    if (input.owner_id) await addPeopleToMeeting(input.meeting_id, [input.owner_id]).catch(() => 0);

    // 3. Link into current session's meet_session_points
    await supabaseAdmin.from("meet_session_points").insert({
      session_id: input.session_id,
      point_id: point.id,
      entry_type: "new",
      status_at_start: "open",
      sort_order: 100,
    });

    // 4. If point_type is 'decision', register in meet_decisions
    if (input.point_type === "decision") {
      await supabaseAdmin.from("meet_decisions").insert({
        session_id: input.session_id,
        point_id: point.id,
        text: input.title,
        decided_by: "Meeting Committee",
        status: "active",
        created_by: userId,
      });
    }

    // 5. Only when a first task was actually given. (Previously every action point was copied
    //    into a task with the same title and no owner, which doubled up in Points & tasks.)
    if (input.initial_task_title && String(input.initial_task_title).trim()) {
      const taskTitle = String(input.initial_task_title).trim();
      await supabaseAdmin.from("meet_tasks").insert({
        point_id: point.id,
        session_id: input.session_id,
        title: taskTitle,
        description: input.description || null,
        owner_id: input.owner_id || null,
        priority: input.priority || "medium",
        tat_days: tatDays,
        start_date: new Date().toISOString().split("T")[0],
        due_date: dueDate,
        status: "not_started",
        created_by: userId,
      });
    }

    // 6. Audit log
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "point",
      entity_id: point.id,
      action: "created",
      field: "status",
      old_value: null,
      new_value: "open",
      user_id: userId,
      channel: "web",
    });

    // 7. Queue assignment notification to owner if specified
    if ((point.owner as any)?.id) {
      await sendMeetEmail("Point assigned", {
        entityId: point.id,
        actorId: userId,
        meetingId: (point as any).meeting_id,
        recipients: { "Point owner": [(point.owner as any).id] },
        link: `/meet/points/${point.id}`,
        data: { point_code: point.code, point_title: point.title, due_date: dueDate, link: `${process.env.NEXT_PUBLIC_SITE_URL || "https://chandakgroup.tech"}/meet/points/${point.id}` },
      });
    }

    revalidatePath(`/meet/sessions/${input.session_id}`);
    revalidatePath(`/meet/live/${input.session_id}`);
    return { success: true, point };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updatePointStatus(input: {
  pointId: string;
  sessionId?: string;
  status: PointStatus;
  progressPercent?: number;
  closureRemarks?: string;
}) {
  try {
    const auth = await requireMeet("MEET_POINT_MANAGE", { sessionId: input.sessionId });
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }
    // The point's owner can update their own point; otherwise only whoever runs the meeting
    {
      const { data: own } = await supabaseAdmin.from("meet_points").select("owner_id, meeting_id").eq("id", input.pointId).maybeSingle();
      const isAdmin = auth.isSuperAdmin || auth.isMeetAdmin;
      let host = false;
      if (input.sessionId) host = await isMeetingHost(input.sessionId, auth.userId, isAdmin);
      else if (own?.meeting_id) {
        const { data: m } = await supabaseAdmin.from("meet_meetings").select("organizer_id, chair_id, default_minute_taker_id").eq("id", own.meeting_id).maybeSingle();
        host = isAdmin || [m?.organizer_id, m?.chair_id, m?.default_minute_taker_id].includes(auth.userId);
      }
      if (!host && own?.owner_id !== auth.userId) return { success: false, error: "Only the point's owner, or whoever runs the meeting, can change its status." };
    }

    const { user } = await getCachedUser();
    const userId = user?.id || null;
    const now = new Date().toISOString();

    const updatePayload: any = {
      status: input.status,
      updated_at: now,
    };

    if (input.progressPercent !== undefined) {
      updatePayload.progress_percent = input.progressPercent;
    }

    if (input.status === "closed" || input.status === "dropped") {
      updatePayload.closed_at = now;
      updatePayload.closed_by = userId;
      updatePayload.progress_percent = input.status === "closed" ? 100 : updatePayload.progress_percent;
      if (input.closureRemarks) {
        updatePayload.closure_remarks = input.closureRemarks;
      }
    } else if (input.status === "reopened") {
      updatePayload.closed_at = null;
      updatePayload.closed_by = null;
    }

    const { data: updatedPoint, error } = await supabaseAdmin
      .from("meet_points")
      .update(updatePayload)
      .eq("id", input.pointId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Update status_at_end on session point link if sessionId is provided
    if (input.sessionId) {
      await supabaseAdmin
        .from("meet_session_points")
        .update({ status_at_end: input.status })
        .eq("session_id", input.sessionId)
        .eq("point_id", input.pointId);
    }

    // If point is closed, also complete child tasks
    if (input.status === "closed") {
      await supabaseAdmin
        .from("meet_tasks")
        .update({
          status: "completed",
          progress_percent: 100,
          completed_at: now,
          tat_result: "within_tat",
        })
        .eq("point_id", input.pointId)
        .not("status", "in", '("completed","cancelled")');
    }

    // Audit log
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "point",
      entity_id: input.pointId,
      action: "status_changed",
      field: "status",
      new_value: input.status,
      user_id: userId,
      channel: "web",
    });

    if (input.sessionId) {
      revalidatePath(`/meet/sessions/${input.sessionId}`);
      revalidatePath(`/meet/live/${input.sessionId}`);
    }
    revalidatePath("/meet/tasks");
    revalidatePath("/meet/points");
    return { success: true, point: updatedPoint };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateSessionPointNotes(input: {
  sessionId: string;
  pointId: string;
  discussionNotes: string;
}) {
  try {
    const auth = await requireMeet("MEET_SESSION_RUN", { sessionId: input.sessionId });
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }

    const { error } = await supabaseAdmin
      .from("meet_session_points")
      .update({ discussion_notes: input.discussionNotes })
      .eq("session_id", input.sessionId)
      .eq("point_id", input.pointId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update point details (P1/P7)
 */
export async function updatePoint(input: {
  pointId: string;
  sessionId?: string;
  title?: string;
  description?: string;
  priority?: PointPriority;
  categoryId?: string;
  ownerId?: string;
  tatDays?: number;
}) {
  try {
    const auth = await requireMeet("MEET_POINT_MANAGE", { sessionId: input.sessionId });
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }

    const { user } = await getCachedUser();
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.description !== undefined) updatePayload.description = input.description;
    if (input.priority !== undefined) updatePayload.priority = input.priority;
    if (input.categoryId !== undefined) updatePayload.category_id = input.categoryId || null;
    if (input.ownerId !== undefined) updatePayload.owner_id = input.ownerId || null;
    if (input.tatDays !== undefined) updatePayload.tat_days = input.tatDays;

    const { data: updatedPoint, error } = await supabaseAdmin
      .from("meet_points")
      .update(updatePayload)
      .eq("id", input.pointId)
      .select(`
        *,
        owner:user_master!meet_points_owner_id_fkey(id, full_name, email, profile_photo),
        category:meet_point_categories(id, name, default_tat_days)
      `)
      .single();

    if (error) return { success: false, error: error.message };

    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "point",
      entity_id: input.pointId,
      action: "updated",
      field: "details",
      new_value: input.title || "updated",
      user_id: user?.id || null,
      channel: "web",
    });

    if (input.sessionId) {
      revalidatePath(`/meet/sessions/${input.sessionId}`);
      revalidatePath(`/meet/live/${input.sessionId}`);
    }
    revalidatePath("/meet/tasks");
    revalidatePath("/meet/points");
    return { success: true, point: updatedPoint };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Reassign point owner and notify the new owner (P7 fix)
 */
export async function reassignPointOwner(input: {
  pointId: string;
  newOwnerId: string;
  sessionId?: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string; point?: MeetingPoint }> {
  try {
    const auth = await requireMeet("MEET_POINT_MANAGE", { sessionId: input.sessionId });
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }

    const { user } = await getCachedUser();
    const now = new Date().toISOString();

    // 1. Fetch current point and new owner details
    const [pointRes, newOwnerRes] = await Promise.all([
      supabaseAdmin
        .from("meet_points")
        .select("id, code, title, meeting_id, owner_id, owner:user_master!meet_points_owner_id_fkey(full_name)")
        .eq("id", input.pointId)
        .single(),
      supabaseAdmin
        .from("user_master")
        .select("id, full_name, email")
        .eq("id", input.newOwnerId)
        .single(),
    ]);

    const point = pointRes.data;
    const newOwner = newOwnerRes.data;
    if (!point) return { success: false, error: "Point not found" };
    if (!newOwner) return { success: false, error: "New owner not found" };

    const oldOwnerId = point.owner_id;
    await addPeopleToMeeting(point.meeting_id, [input.newOwnerId]).catch(() => 0);

    // 2. Update point owner
    const { data: updatedPoint, error: updErr } = await supabaseAdmin
      .from("meet_points")
      .update({
        owner_id: input.newOwnerId,
        updated_at: now,
      })
      .eq("id", input.pointId)
      .select(`
        *,
        owner:user_master!meet_points_owner_id_fkey(id, full_name, email, profile_photo),
        category:meet_point_categories(id, name, default_tat_days)
      `)
      .single();

    if (updErr) return { success: false, error: updErr.message };

    // 3. Log activity
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "point",
      entity_id: input.pointId,
      action: "reassigned",
      field: "owner_id",
      old_value: oldOwnerId || "Unassigned",
      new_value: input.newOwnerId,
      user_id: user?.id || null,
      channel: "web",
    });

    // 4. Send notification email to the new owner
    await sendMeetEmail("Point assigned", {
      entityId: input.pointId,
      actorId: user?.id || null,
      meetingId: (point as any).meeting_id,
      recipients: { "Point owner": [input.newOwnerId] },
      link: `/meet/points/${input.pointId}`,
      data: { point_code: point.code, point_title: point.title, link: `${process.env.NEXT_PUBLIC_SITE_URL || "https://chandakgroup.tech"}/meet/points/${input.pointId}` },
    });

    if (input.sessionId) {
      revalidatePath(`/meet/sessions/${input.sessionId}`);
      revalidatePath(`/meet/live/${input.sessionId}`);
    }
    revalidatePath("/meet/tasks");
    revalidatePath("/meet/points");
    return { success: true, point: updatedPoint as any };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete a point (Soft delete)
 */
export async function deletePoint(pointId: string, sessionId?: string) {
  try {
    const auth = await requireMeet("MEET_POINT_MANAGE", { sessionId });
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }

    const { user } = await getCachedUser();
    const { error } = await supabaseAdmin
      .from("meet_points")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pointId);

    if (error) return { success: false, error: error.message };

    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "point",
      entity_id: pointId,
      action: "deleted",
      field: "is_deleted",
      old_value: "false",
      new_value: "true",
      user_id: user?.id || null,
      channel: "web",
    });

    if (sessionId) {
      revalidatePath(`/meet/sessions/${sessionId}`);
      revalidatePath(`/meet/live/${sessionId}`);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
