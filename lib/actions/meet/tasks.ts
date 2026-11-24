"use server";

import { sendMeetEmail } from "@/lib/utils/meet-email";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import type { MeetingTask, TaskStatus, PointPriority } from "@/types/meet";
import { requireMeet } from "@/lib/permissions/meet";
import { getHiddenConfidentialMeetingIds } from "@/lib/utils/meet-scope";

export interface CreateTaskInput {
  point_id?: string | null;
  session_id?: string;
  project_id?: string;
  milestone_name?: string;
  title: string;
  description?: string;
  owner_id?: string;
  priority?: PointPriority;
  tat_days?: number;
  start_date?: string;
  due_date?: string;
  requires_verification?: boolean;
  checklist?: string[];
}

export async function getTasks(filters?: {
  ownerId?: string;
  statusTab?: 'all' | 'overdue' | 'due_soon' | 'open' | 'completed';
  search?: string;
}): Promise<MeetingTask[]> {
  try {
    const { user } = await getCachedUser();
    if (!user) return [];

    // Check if user has global task management authority.
    // requireMeet throws on denial; a plain task owner must still see their own tasks.
    let isManager = false;
    let isAdmin = false;
    try {
      const auth = await requireMeet("MEET_TASK_MANAGE");
      isManager = auth.allowed;
      isAdmin = auth.isSuperAdmin || auth.isMeetAdmin;
    } catch {
      isManager = false;
    }

    let query = supabaseAdmin
      .from("meet_tasks")
      .select(`
        *,
        owner:user_master!meet_tasks_owner_id_fkey(id, full_name, email, profile_photo),
        checklist:meet_task_checklist(*),
        point:meet_points(
          id, code, title, meeting_id,
          meeting:meet_meetings(id, code, title)
        )
      `)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    // Enforce data scoping: if not manager, user sees only their assigned tasks
    if (!isManager) {
      query = query.eq("owner_id", user.id);
    } else if (filters?.ownerId) {
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

    // Managers must not see tasks from confidential meetings they are not part of (own tasks always visible)
    if (isManager) {
      const hidden = await getHiddenConfidentialMeetingIds(user.id, isAdmin);
      if (hidden.size > 0) {
        filtered = filtered.filter(
          (t: any) => t.owner_id === user.id || !t.point?.meeting_id || !hidden.has(t.point.meeting_id)
        );
      }
    }

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
    const auth = await requireMeet("MEET_TASK_MANAGE", { sessionId: input.session_id });
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }

    const { user } = await getCachedUser();
    const userId = user?.id || null;
    const tatDays = input.tat_days || 3;
    const startDate = input.start_date || new Date().toISOString().split("T")[0];

    let dueDate = input.due_date;
    if (!dueDate) {
      // Calculate statutory working days due date
      const { data: dateRes } = await supabaseAdmin.rpc("fn_meet_calculate_due_date", {
        p_start_date: startDate,
        p_tat_days: tatDays,
      });
      dueDate = dateRes || new Date(Date.now() + tatDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    }

    const { data: task, error: tErr } = await supabaseAdmin
      .from("meet_tasks")
      .insert({
        point_id: input.point_id || null,
        session_id: input.session_id || null,
        project_id: input.project_id || null,
        milestone_name: input.milestone_name || null,
        title: input.title,
        description: input.description || null,
        owner_id: input.owner_id || null,
        priority: input.priority || "medium",
        tat_days: tatDays,
        start_date: startDate,
        due_date: dueDate,
        requires_verification: input.requires_verification ?? false,
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

    // Fetch fully hydrated task with owner, checklist and point
    const { data: fullTask } = await supabaseAdmin
      .from("meet_tasks")
      .select(`
        *,
        owner:user_master!meet_tasks_owner_id_fkey(id, full_name, email, profile_photo),
        checklist:meet_task_checklist(*),
        point:meet_points(
          id, code, title, meeting_id,
          meeting:meet_meetings(id, code, title)
        )
      `)
      .eq("id", task.id)
      .single();

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

    // Notify task owner if assigned
    if ((fullTask as any)?.owner_id || (fullTask as any)?.owner?.id) {
      await sendMeetEmail("Task assigned", {
        entityId: task.id,
        actorId: userId,
        recipients: { "Task owner": [(fullTask as any).owner_id || (fullTask as any).owner?.id] },
        link: `/meet/my-work?tab=tasks`,
        data: {
          task_code: fullTask.code,
          task_title: fullTask.title,
          due_date: dueDate,
          point_code: (fullTask as any)?.point?.code || "",
          meeting_title: (fullTask as any)?.point?.meeting?.title || "",
          link: `${process.env.NEXT_PUBLIC_SITE_URL || "https://chandakgroup.tech"}/meet/my-work?tab=tasks`,
        },
      });
    }

    revalidatePath("/meet/my-work");
    if (input.session_id) {
      revalidatePath(`/meet/sessions/${input.session_id}`);
      revalidatePath(`/meet/live/${input.session_id}`);
    }
    return { success: true, task: fullTask || task };
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
    if (!user) return { success: false, error: "Authentication required" };
    const userId = user.id;
    const now = new Date().toISOString();

    const { data: currentTask } = await supabaseAdmin
      .from("meet_tasks")
      .select("*, point_id")
      .eq("id", input.taskId)
      .single();

    if (!currentTask) return { success: false, error: "Task not found" };

    // RBAC check: Must be task owner OR have MEET_TASK_MANAGE
    if (currentTask.owner_id !== userId) {
      const auth = await requireMeet("MEET_TASK_MANAGE", { taskId: input.taskId });
      if (!auth.allowed) {
        return { success: false, error: "Only the task owner or meeting managers can update task status" };
      }
    }

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
    if (!user) return { success: false, error: "Authentication required" };
    const now = new Date().toISOString();

    const { data: cl } = await supabaseAdmin
      .from("meet_task_checklist")
      .select("task_id, task:meet_tasks(owner_id)")
      .eq("id", checklistId)
      .single();

    if (!cl) return { success: false, error: "Checklist item not found" };

    const taskOwnerId = (cl.task as any)?.owner_id;
    if (taskOwnerId !== user.id) {
      const auth = await requireMeet("MEET_TASK_MANAGE", { taskId: cl.task_id });
      if (!auth.allowed) {
        return { success: false, error: "Only the task owner or manager can complete checklist items" };
      }
    }

    const { error } = await supabaseAdmin
      .from("meet_task_checklist")
      .update({
        is_done: isDone,
        done_by: isDone ? user.id : null,
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
      .select("due_date, revised_due_date, owner_id")
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

    // Activity log
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "task",
      entity_id: input.taskId,
      action: "extension_requested",
      field: "requested_due_date",
      old_value: oldDue,
      new_value: input.requestedDueDate,
      user_id: user.id,
      channel: "web",
    });

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
    const auth = await requireMeet("MEET_EXTENSION_APPROVE");
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied. Only authorized managers or chairs can decide extensions." };
    }

    const { user } = await getCachedUser();
    if (!user) return { success: false, error: "Authentication required" };
    const now = new Date().toISOString();

    const { data: ext } = await supabaseAdmin
      .from("meet_tat_extensions")
      .select("*")
      .eq("id", input.extensionId)
      .single();

    if (!ext) return { success: false, error: "Extension request not found" };

    // Confidential-meeting boundary for the task under extension
    await requireMeet(
      "MEET_EXTENSION_APPROVE",
      ext.entity_type === "point" ? { pointId: ext.entity_id } : { taskId: ext.entity_id }
    );

    // Prevent approving one's own extension request (S2 stop-ship requirement)
    if (ext.requested_by === user.id) {
      return { success: false, error: "Conflict of interest: You cannot approve your own extension request." };
    }

    const newStatus = input.approved ? "approved" : "rejected";

    await supabaseAdmin
      .from("meet_tat_extensions")
      .update({
        status: newStatus,
        decided_by: user.id,
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

    // Activity log
    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "task",
      entity_id: ext.entity_id,
      action: input.approved ? "extension_approved" : "extension_rejected",
      field: "revised_due_date",
      old_value: ext.old_due_date,
      new_value: input.approved ? ext.requested_due_date : ext.old_due_date,
      user_id: user.id,
      channel: "web",
    });

    revalidatePath("/meet/my-work");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete a task (Soft delete)
 */
export async function deleteTask(taskId: string) {
  try {
    const auth = await requireMeet("MEET_TASK_MANAGE", { taskId });
    if (!auth.allowed) {
      return { success: false, error: auth.error || "Permission denied" };
    }

    const { user } = await getCachedUser();
    const { error } = await supabaseAdmin
      .from("meet_tasks")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error) return { success: false, error: error.message };

    await supabaseAdmin.from("meet_activity_log").insert({
      entity_type: "task",
      entity_id: taskId,
      action: "deleted",
      field: "is_deleted",
      old_value: "false",
      new_value: "true",
      user_id: user?.id || null,
      channel: "web",
    });

    revalidatePath("/meet/my-work");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
