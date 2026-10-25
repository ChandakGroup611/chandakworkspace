"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import type { MeetingTask, TaskStatus, PointPriority } from "@/types/meet";

export interface CreateTaskInput {
  point_id: string;
  session_id?: string;
  title: string;
  description?: string;
  owner_id?: string;
  priority?: PointPriority;
  tat_days?: number;
  start_date?: string;
  checklist?: string[];
}

export async function getTasks(filters?: {
  ownerId?: string;
  statusTab?: 'all' | 'overdue' | 'due_soon' | 'open' | 'completed';
  search?: string;
}): Promise<MeetingTask[]> {
  try {
    let query = supabaseAdmin
      .from("meet_tasks")
      .select(`
        *,
        owner:user_master(id, full_name, email, profile_photo),
        checklist:meet_task_checklist(*),
        point:meet_points(
          id, code, title, meeting_id,
          meeting:meet_meetings(id, code, title)
        )
      `)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (filters?.ownerId) {
      query = query.eq("owner_id", filters.ownerId);
    }
    if (filters?.search) {
      query = query.ilike("title", `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching tasks:", error);
      return [];
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    let filtered = (data || []) as MeetingTask[];

    if (filters?.statusTab) {
      switch (filters.statusTab) {
        case "completed":
          filtered = filtered.filter((t) => t.status === "completed");
          break;
        case "overdue":
          filtered = filtered.filter((t) => {
            const effectiveDue = t.revised_due_date || t.due_date;
            return t.status !== "completed" && t.status !== "cancelled" && effectiveDue < todayStr;
          });
          break;
        case "due_soon":
          filtered = filtered.filter((t) => {
            const effectiveDue = t.revised_due_date || t.due_date;
            return t.status !== "completed" && t.status !== "cancelled" && (effectiveDue === todayStr || effectiveDue === tomorrowStr);
          });
          break;
        case "open":
          filtered = filtered.filter((t) => t.status !== "completed" && t.status !== "cancelled");
          break;
      }
    }

    return filtered;
  } catch (err: any) {
    console.error("Unexpected error in getTasks:", err);
    return [];
  }
}

export async function createTask(input: CreateTaskInput) {
  try {
    const { user } = await getCachedUser();
    const userId = user?.id || null;
    const tatDays = input.tat_days || 3;
    const startDate = input.start_date || new Date().toISOString().split("T")[0];

    // Calculate statutory working days due date
    const { data: dateRes } = await supabaseAdmin.rpc("fn_meet_calculate_due_date", {
      p_start_date: startDate,
      p_tat_days: tatDays,
    });

    const dueDate = dateRes || new Date(Date.now() + tatDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: task, error: tErr } = await supabaseAdmin
      .from("meet_tasks")
      .insert({
        point_id: input.point_id,
        session_id: input.session_id || null,
        title: input.title,
        description: input.description || null,
        owner_id: input.owner_id || null,
        priority: input.priority || "medium",
        tat_days: tatDays,
        start_date: startDate,
        due_date: dueDate,
        status: "not_started",
        progress_percent: 0,
        created_by: userId,
      })
      .select()
      .single();

    if (tErr || !task) {
      return { success: false, error: tErr?.message || "Failed to create task" };
    }

    // Insert checklist items if any
    if (input.checklist && input.checklist.length > 0) {
      const checklistRows = input.checklist.map((item, idx) => ({
        task_id: task.id,
        text: item,
        sort_order: idx + 1,
      }));
      await supabaseAdmin.from("meet_task_checklist").insert(checklistRows);
    }

    // Audit log
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "task",
      entity_id: task.id,
      action: "created",
      field: "status",
      new_value: "not_started",
      user_id: userId,
      channel: "web",
    });

    revalidatePath("/meet/my-work");
    if (input.session_id) {
      revalidatePath(`/meet/sessions/${input.session_id}`);
    }
    return { success: true, task };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateTaskStatus(input: {
  taskId: string;
  status: TaskStatus;
  progressPercent?: number;
  completionRemarks?: string;
}) {
  try {
    const { user } = await getCachedUser();
    const userId = user?.id || null;
    const now = new Date().toISOString();

    const { data: currentTask } = await supabaseAdmin
      .from("meet_tasks")
      .select("*, point_id")
      .eq("id", input.taskId)
      .single();

    if (!currentTask) return { success: false, error: "Task not found" };

    const updatePayload: any = {
      status: input.status,
      updated_at: now,
    };

    if (input.progressPercent !== undefined) {
      updatePayload.progress_percent = input.progressPercent;
    }

    if (input.status === "completed") {
      updatePayload.completed_at = now;
      updatePayload.progress_percent = 100;
      if (input.completionRemarks) updatePayload.completion_remarks = input.completionRemarks;

      const effectiveDue = currentTask.revised_due_date || currentTask.due_date;
      const todayStr = now.split("T")[0];

      if (todayStr <= effectiveDue) {
        updatePayload.tat_result = "within_tat";
        updatePayload.delay_days = 0;
      } else {
        updatePayload.tat_result = "breached";
        const diffMs = new Date(todayStr).getTime() - new Date(effectiveDue).getTime();
        updatePayload.delay_days = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));
      }
    }

    const { data: updatedTask, error } = await supabaseAdmin
      .from("meet_tasks")
      .update(updatePayload)
      .eq("id", input.taskId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Activity log
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "task",
      entity_id: input.taskId,
      action: "status_changed",
      field: "status",
      old_value: currentTask.status,
      new_value: input.status,
      user_id: userId,
      channel: "web",
    });

    revalidatePath("/meet/my-work");
    return { success: true, task: updatedTask };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleTaskChecklist(checklistId: string, isDone: boolean) {
  try {
    const { user } = await getCachedUser();
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("meet_task_checklist")
      .update({
        is_done: isDone,
        done_by: isDone ? user?.id : null,
        done_at: isDone ? now : null,
      })
      .eq("id", checklistId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/meet/my-work");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function requestTaskExtension(input: {
  taskId: string;
  requestedDueDate: string;
  reason: string;
}) {
  try {
    const { user } = await getCachedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: task } = await supabaseAdmin
      .from("meet_tasks")
      .select("due_date, revised_due_date")
      .eq("id", input.taskId)
      .single();

    if (!task) return { success: false, error: "Task not found" };

    const oldDue = task.revised_due_date || task.due_date;

    const { data: ext, error } = await supabaseAdmin
      .from("meet_tat_extensions")
      .insert({
        entity_type: "task",
        entity_id: input.taskId,
        requested_by: user.id,
        old_due_date: oldDue,
        requested_due_date: input.requestedDueDate,
        reason: input.reason,
        status: "pending",
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/meet/my-work");
    return { success: true, extension: ext };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function decideTaskExtension(input: {
  extensionId: string;
  approved: boolean;
  remarks?: string;
}) {
  try {
    const { user } = await getCachedUser();
    const now = new Date().toISOString();

    const { data: ext } = await supabaseAdmin
      .from("meet_tat_extensions")
      .select("*")
      .eq("id", input.extensionId)
      .single();

    if (!ext) return { success: false, error: "Extension request not found" };

    const newStatus = input.approved ? "approved" : "rejected";

    await supabaseAdmin
      .from("meet_tat_extensions")
      .update({
        status: newStatus,
        decided_by: user?.id,
        decided_at: now,
        remarks: input.remarks || null,
      })
      .eq("id", input.extensionId);

    if (input.approved && ext.entity_type === "task") {
      await supabaseAdmin
        .from("meet_tasks")
        .update({
          revised_due_date: ext.requested_due_date,
          updated_at: now,
        })
        .eq("id", ext.entity_id);
    }

    revalidatePath("/meet/my-work");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
