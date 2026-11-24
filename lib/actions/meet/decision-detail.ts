"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { getHiddenConfidentialMeetingIds } from "@/lib/utils/meet-scope";
import { createTask } from "@/lib/actions/meet/tasks";

/** Decision page: where it came from, what replaced it, and what to do next. */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export interface DecisionDetail {
  d: any;
  meeting: { id: string; title: string; code: string | null } | null;
  session: { id: string; code: string | null; date: string } | null;
  point: { id: string; code: string; title: string; status: string } | null;
  replacedBy: { id: string; code: string; text: string } | null;
  replaces: { id: string; code: string; text: string }[];
  tasks: { id: string; code: string; title: string; status: string; owner: string | null; due: string | null }[];
  activity: { id: string; at: string; by: string | null; action: string; value: string | null }[];
  canManage: boolean;
}

export async function getDecisionDetail(id: string): Promise<DecisionDetail | null> {
  const auth = await requireMeet("MEET_VIEW");
  const { data: d } = await supabaseAdmin
    .from("meet_decisions")
    .select("*, session:meet_sessions(id, code, scheduled_start, meeting_id, meeting:meet_meetings(id, title, code, organizer_id, chair_id)), point:meet_points(id, code, title, status)")
    .eq("id", id)
    .maybeSingle();
  if (!d) return null;
  const s = one(d.session);
  const m = one(s?.meeting);
  const hidden = await getHiddenConfidentialMeetingIds(auth.userId, auth.isSuperAdmin || auth.isMeetAdmin);
  if (m?.id && hidden.has(m.id)) return null;

  const [repBy, reps, act, tasks] = await Promise.all([
    d.superseded_by_id ? supabaseAdmin.from("meet_decisions").select("id, code, text").eq("id", d.superseded_by_id).maybeSingle() : Promise.resolve({ data: null } as any),
    supabaseAdmin.from("meet_decisions").select("id, code, text").eq("superseded_by_id", id),
    supabaseAdmin.from("meet_activity_log").select("id, created_at, action, new_value, user:user_master(full_name)").eq("entity_type", "decision").eq("entity_id", id).order("created_at", { ascending: false }).limit(50),
    // Follow-up tasks are logged against the decision
    supabaseAdmin.from("meet_activity_log").select("new_value").eq("entity_type", "decision").eq("entity_id", id).eq("action", "follow_up_task"),
  ]);
  const taskIds = ((tasks.data || []) as any[]).map((r) => String(r.new_value || "").split(" ")[0]).filter((x) => /^[0-9a-f-]{36}$/i.test(x));
  const { data: trows } = taskIds.length
    ? await supabaseAdmin.from("meet_tasks").select("id, code, title, status, due_date, revised_due_date, owner:user_master!meet_tasks_owner_id_fkey(full_name)").in("id", taskIds).eq("is_deleted", false)
    : { data: [] as any[] };

  return {
    d,
    meeting: m ? { id: m.id, title: m.title, code: m.code || null } : null,
    session: s ? { id: s.id, code: s.code || null, date: s.scheduled_start } : null,
    point: one(d.point) ? { id: one(d.point).id, code: one(d.point).code, title: one(d.point).title, status: one(d.point).status } : null,
    replacedBy: (repBy as any).data || null,
    replaces: (reps.data || []) as any[],
    tasks: ((trows || []) as any[]).map((t) => ({ id: t.id, code: t.code, title: t.title, status: t.status, owner: one(t.owner)?.full_name || null, due: t.revised_due_date || t.due_date || null })),
    activity: ((act.data || []) as any[]).filter((a) => a.action !== "follow_up_task").map((a) => ({ id: a.id, at: a.created_at, by: one(a.user)?.full_name || null, action: a.action, value: a.new_value || null })),
    canManage: auth.isSuperAdmin || auth.isMeetAdmin || m?.organizer_id === auth.userId || m?.chair_id === auth.userId,
  };
}

export async function setDecisionReview(input: { id: string; reviewDate: string | null; note?: string }): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_DECISION_MANAGE");
  if (input.reviewDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.reviewDate)) return { success: false, error: "Pick a date." };
  const { error } = await supabaseAdmin.from("meet_decisions").update({ review_date: input.reviewDate, updated_at: new Date().toISOString() }).eq("id", input.id);
  if (error) return { success: false, error: error.message };
  await supabaseAdmin.from("meet_activity_log").insert({
    entity_type: "decision", entity_id: input.id, action: input.reviewDate ? "review_set" : "reviewed",
    field: "review_date", new_value: input.reviewDate ? `Review on ${input.reviewDate}${input.note ? ` · ${input.note}` : ""}` : `Reviewed${input.note ? ` · ${input.note}` : ""}`,
    user_id: auth.userId, channel: "web",
  });
  revalidatePath(`/meet/decisions/${input.id}`);
  revalidatePath("/meet/decisions");
  return { success: true };
}

export async function withdrawDecision(input: { id: string; reason: string }): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_DECISION_MANAGE");
  const reason = String(input.reason || "").trim();
  if (reason.length < 3) return { success: false, error: "Give a reason." };
  const { error } = await supabaseAdmin.from("meet_decisions").update({ status: "revoked", updated_at: new Date().toISOString() }).eq("id", input.id);
  if (error) return { success: false, error: error.message };
  await supabaseAdmin.from("meet_activity_log").insert({ entity_type: "decision", entity_id: input.id, action: "withdrawn", field: "status", new_value: `Withdrawn · ${reason.slice(0, 300)}`, user_id: auth.userId, channel: "web" });
  revalidatePath(`/meet/decisions/${input.id}`);
  revalidatePath("/meet/decisions");
  return { success: true };
}

export async function addDecisionTask(input: { id: string; title: string; ownerId?: string; days?: number }): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_VIEW");
  const { data: d } = await supabaseAdmin.from("meet_decisions").select("id, code, point_id, session_id").eq("id", input.id).maybeSingle();
  if (!d) return { success: false, error: "Decision not found." };
  const r: any = await createTask({ point_id: d.point_id || null, session_id: d.session_id || undefined, title: String(input.title || "").trim(), owner_id: input.ownerId || undefined, tat_days: input.days || 3, description: `Follow-up on decision ${d.code}` });
  if (!r?.success) return { success: false, error: r?.error || "Couldn't create the task." };
  await supabaseAdmin.from("meet_activity_log").insert({ entity_type: "decision", entity_id: d.id, action: "follow_up_task", field: "task", new_value: `${r.task.id} ${r.task.code}`, user_id: auth.userId, channel: "web" });
  revalidatePath(`/meet/decisions/${d.id}`);
  return { success: true };
}
