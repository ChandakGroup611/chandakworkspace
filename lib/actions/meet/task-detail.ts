"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { sendMeetEmail } from "@/lib/utils/meet-email";
import { addPeopleToMeeting } from "@/lib/utils/meet-people";

/** Task detail page (/meet/tasks/[id]): one task with its point, meeting, checklist, extensions and history. */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export interface TaskDetail {
  task: any;
  point: { id: string; code: string; title: string } | null;
  meeting: { id: string; code: string | null; title: string } | null;
  checklist: { id: string; text: string; is_done: boolean }[];
  extensions: { id: string; at: string; by: string | null; from: string; to: string; reason: string; status: string; remarks: string | null; mine: boolean }[];
  activity: { id: string; at: string; by: string | null; action: string; field: string | null; old_value: string | null; new_value: string | null }[];
  canEdit: boolean;
  canApprove: boolean;
  isOwner: boolean;
}

export async function getTaskDetail(taskId: string): Promise<TaskDetail | null> {
  const auth = await requireMeet("MEET_VIEW", { taskId });
  const userId = auth.userId;
  try {
    const { data: t } = await supabaseAdmin
      .from("meet_tasks")
      .select(`
        *,
        owner:user_master!meet_tasks_owner_id_fkey(id, full_name, email),
        point:meet_points(id, code, title, meeting_id, meeting:meet_meetings(id, code, title, organizer_id, chair_id))
      `)
      .eq("id", taskId)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!t) return null;
    const p = one(t.point);
    const m = one(p?.meeting);

    const [clRes, extRes, actRes] = await Promise.all([
      supabaseAdmin.from("meet_task_checklist").select("id, text, is_done, sort_order").eq("task_id", taskId).order("sort_order", { ascending: true }),
      supabaseAdmin.from("meet_tat_extensions").select("*, by:user_master!meet_tat_extensions_requested_by_fkey(full_name)").eq("entity_type", "task").eq("entity_id", taskId).order("created_at", { ascending: false }),
      supabaseAdmin.from("meet_activity_log").select("id, created_at, action, field, old_value, new_value, user:user_master(full_name)").eq("entity_type", "task").eq("entity_id", taskId).order("created_at", { ascending: false }).limit(100),
    ]);

    const isOrg = m?.organizer_id === userId || m?.chair_id === userId;
    const isAdmin = auth.isSuperAdmin || auth.isMeetAdmin;
    return {
      task: t,
      point: p ? { id: p.id, code: p.code, title: p.title } : null,
      meeting: m ? { id: m.id, code: m.code || null, title: m.title } : null,
      checklist: (clRes.data || []).map((c: any) => ({ id: c.id, text: c.text, is_done: !!c.is_done })),
      extensions: (extRes.data || []).map((e: any) => ({
        id: e.id,
        at: e.created_at,
        by: one(e.by)?.full_name || null,
        from: e.old_due_date,
        to: e.requested_due_date,
        reason: e.reason,
        status: e.status,
        remarks: e.remarks || null,
        mine: e.requested_by === userId,
      })),
      activity: (actRes.data || []).map((a: any) => ({ id: a.id, at: a.created_at, by: one(a.user)?.full_name || null, action: a.action, field: a.field || null, old_value: a.old_value ?? null, new_value: a.new_value ?? null })),
      canEdit: isAdmin || isOrg || t.owner_id === userId,
      canApprove: isAdmin || isOrg,
      isOwner: t.owner_id === userId,
    };
  } catch (err) {
    console.error("[getTaskDetail]", err);
    return null;
  }
}

/** Progress % and a short note from the owner. */
export async function updateTaskProgress(input: { taskId: string; progress: number; note?: string }): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_VIEW", { taskId: input.taskId });
  const { data: t } = await supabaseAdmin.from("meet_tasks").select("id, owner_id, progress_percent, status, point:meet_points(meeting:meet_meetings(organizer_id, chair_id))").eq("id", input.taskId).maybeSingle();
  if (!t) return { success: false, error: "Task not found." };
  const m = one(one((t as any).point)?.meeting);
  const allowed = auth.isSuperAdmin || auth.isMeetAdmin || t.owner_id === auth.userId || m?.organizer_id === auth.userId || m?.chair_id === auth.userId;
  if (!allowed) return { success: false, error: "Only the owner or the organiser can update this task." };
  const progress = Math.min(100, Math.max(0, Math.round(Number(input.progress) || 0)));
  const patch: any = { progress_percent: progress, updated_at: new Date().toISOString() };
  if (t.status === "not_started" && progress > 0) patch.status = "in_progress";
  const { error } = await supabaseAdmin.from("meet_tasks").update(patch).eq("id", input.taskId);
  if (error) return { success: false, error: error.message };
  await supabaseAdmin.from("meet_activity_log").insert({
    entity_type: "task",
    entity_id: input.taskId,
    action: "progress_updated",
    field: "progress_percent",
    old_value: String(t.progress_percent ?? 0),
    new_value: `${progress}%${input.note?.trim() ? ` · ${input.note.trim().slice(0, 500)}` : ""}`,
    user_id: auth.userId,
    channel: "web",
  });
  revalidatePath(`/meet/tasks/${input.taskId}`);
  return { success: true };
}

/**
 * Give the task to someone else. Anyone in the company can be picked; if they aren't part of
 * the meeting yet, they can be added to it at the same time (so they see the meeting too).
 */
export async function reassignTask(input: { taskId: string; ownerId: string; addToMeeting?: boolean; reason?: string }): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_VIEW", { taskId: input.taskId });
  const { data: t } = await supabaseAdmin
    .from("meet_tasks")
    .select("id, code, title, owner_id, due_date, revised_due_date, point:meet_points(id, code, title, meeting_id, meeting:meet_meetings(id, title, organizer_id, chair_id))")
    .eq("id", input.taskId)
    .maybeSingle();
  if (!t) return { success: false, error: "Task not found." };
  const p = one((t as any).point);
  const m = one(p?.meeting);
  const allowed = auth.isSuperAdmin || auth.isMeetAdmin || m?.organizer_id === auth.userId || m?.chair_id === auth.userId || t.owner_id === auth.userId;
  if (!allowed) return { success: false, error: "Only the organiser, chair, an admin or the current owner can reassign." };
  if (t.owner_id === input.ownerId) return { success: false, error: "They already own this task." };
  const { data: u } = await supabaseAdmin.from("user_master").select("id, full_name").eq("id", input.ownerId).eq("is_deleted", false).maybeSingle();
  if (!u) return { success: false, error: "Pick a person." };

  const { error } = await supabaseAdmin.from("meet_tasks").update({ owner_id: input.ownerId, updated_at: new Date().toISOString() }).eq("id", input.taskId);
  if (error) return { success: false, error: error.message };
  if (input.addToMeeting && m?.id) await addPeopleToMeeting(m.id, [input.ownerId]);

  await supabaseAdmin.from("meet_activity_log").insert({
    entity_type: "task",
    entity_id: input.taskId,
    action: "reassigned",
    field: "owner_id",
    old_value: t.owner_id,
    new_value: `${u.full_name}${input.reason?.trim() ? ` · ${input.reason.trim().slice(0, 300)}` : ""}`,
    user_id: auth.userId,
    channel: "web",
  });
  await sendMeetEmail("Task assigned", {
    entityId: t.id,
    actorId: auth.userId,
    meetingId: m?.id,
    recipients: { "Task owner": [input.ownerId] },
    link: `/meet/tasks/${t.id}`,
    data: { task_code: t.code, task_title: t.title, due_date: t.revised_due_date || t.due_date, point_code: p?.code || "", point_title: p?.title || "", meeting_title: m?.title || "" },
  });
  revalidatePath(`/meet/tasks/${input.taskId}`);
  revalidatePath("/meet/tasks");
  return { success: true };
}
