"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import type { MeetingPoint, PointPriority, PointType, PointStatus } from "@/types/meet";
import { requireMeet } from "@/lib/permissions/meet";

export interface CreatePointInput {
  meeting_id: string;
  session_id: string;
  agenda_item_id?: string;
  title: string;
  description?: string;
  point_type?: PointType;
  category_id?: string;
  department_id?: string;
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
        title: input.title,
        decision_type: "operational",
        decided_by: "Meeting Committee",
        status: "active",
        created_by: userId,
      });
    }

    // 5. If initial task title provided, create child task
    if (input.initial_task_title || input.point_type === "action") {
      const taskTitle = input.initial_task_title || input.title;
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
    if (point.owner?.email) {
      try {
        await supabaseAdmin.from("email_queue").insert({
          to_email: point.owner.email,
          subject: `[Point Assigned] Point ${point.code}: ${point.title}`,
          body_text: `Dear ${point.owner.full_name},

You have been assigned as the owner of Meeting Point ${point.code}: "${point.title}".

Priority: ${point.priority}
Due Date: ${dueDate} (TAT: ${tatDays} working days)

Please review the point details and take necessary action:
${process.env.NEXTAUTH_URL || "https://meet.chandak.com"}/meet/my-work

Chandak Workspace Meet Committee`,
          status: "pending",
          retry_count: 0,
        });
      } catch (qErr) {
        console.warn("Could not queue point assignment email:", qErr);
      }
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
    revalidatePath("/meet/my-work");
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
    revalidatePath("/meet/my-work");
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
        .select("id, code, title, owner_id, owner:user_master!meet_points_owner_id_fkey(full_name)")
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
    if (newOwner.email) {
      try {
        await supabaseAdmin.from("email_queue").insert({
          to_email: newOwner.email,
          subject: `[Point Reassigned] Point ${point.code}: ${point.title}`,
          body_text: `Dear ${newOwner.full_name},

You have been reassigned as the primary owner for Meeting Point ${point.code}: "${point.title}".
Previous Owner: ${(point.owner as any)?.full_name || "Unassigned"}
${input.reason ? `Reason: ${input.reason}\n` : ""}
Please access your workspace to review action items and deadlines:
${process.env.NEXTAUTH_URL || "https://meet.chandak.com"}/meet/my-work

Chandak Workspace Meet Committee`,
          status: "pending",
          retry_count: 0,
        });
      } catch (emailErr) {
        console.warn("Could not queue reassignment email:", emailErr);
      }
    }

    if (input.sessionId) {
      revalidatePath(`/meet/sessions/${input.sessionId}`);
      revalidatePath(`/meet/live/${input.sessionId}`);
    }
    revalidatePath("/meet/my-work");
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
