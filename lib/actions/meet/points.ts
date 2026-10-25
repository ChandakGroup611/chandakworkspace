"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import type { MeetingPoint, PointPriority, PointType, PointStatus } from "@/types/meet";

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
        text: input.title + (input.description ? `: ${input.description}` : ""),
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
