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

/* ---------------------------------------------------------- Record a decision */

export async function getDecisionFormData() {
  await requireMeet("MEET_VIEW");
  const since = new Date(Date.now() - 120 * 86400000).toISOString();
  const [sRes, dRes, uRes] = await Promise.all([
    supabaseAdmin
      .from("meet_sessions")
      .select("id, code, scheduled_start, status, meeting:meet_meetings(id, title, code, is_deleted)")
      .eq("is_deleted", false)
      .neq("status", "cancelled")
      .gte("scheduled_start", since)
      .order("scheduled_start", { ascending: false })
      .limit(150),
    supabaseAdmin.from("departments").select("id, name").eq("is_deleted", false).order("name"),
    supabaseAdmin.from("user_master").select("id, full_name, email").eq("is_deleted", false).eq("is_active", true).order("full_name").limit(2000),
  ]);
  const sessions = ((sRes.data || []) as any[])
    .filter((s) => one(s.meeting) && !one(s.meeting).is_deleted)
    .filter((s) => new Date(s.scheduled_start).getTime() <= Date.now() + 86400000)
    .map((s) => ({
      id: s.id,
      meetingId: one(s.meeting).id,
      label: `${one(s.meeting).title} · ${new Date(s.scheduled_start).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}`,
    }));
  return {
    sessions,
    departments: ((dRes.data || []) as any[]).map((d) => ({ id: d.id, name: d.name })),
    people: ((uRes.data || []) as any[]).map((u) => ({ id: u.id, full_name: u.full_name || u.email, email: u.email || null })),
  };
}

export async function getSessionPoints(sessionId: string) {
  await requireMeet("MEET_VIEW", { sessionId });
  const { data } = await supabaseAdmin.from("meet_session_points").select("point:meet_points(id, code, title, is_deleted)").eq("session_id", sessionId);
  return ((data || []) as any[]).map((r) => one(r.point)).filter((p) => p && !p.is_deleted).map((p) => ({ id: p.id, label: `${p.code} ${p.title}` }));
}

export async function recordManagementDecision(input: {
  sessionId: string;
  pointId?: string;
  text: string;
  background?: string;
  kind: string;
  decidedBy?: string;
  effectiveFrom?: string;
  reviewDate?: string;
  appliesTo: "everyone" | "departments" | "people" | "mixed";
  departmentIds?: string[];
  personIds?: string[];
  needsAck?: boolean;
  followUp?: { title: string; ownerId?: string; days?: number } | null;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const auth = await requireMeet("MEET_DECISION_MANAGE", { sessionId: input.sessionId });
  const text = String(input.text || "").trim();
  if (text.length < 5) return { success: false, error: "Write the decision." };
  if (!input.sessionId) return { success: false, error: "Pick the meeting it was taken in." };
  const depts = Array.from(new Set(input.departmentIds || []));
  const persons = Array.from(new Set(input.personIds || []));
  if (input.appliesTo !== "everyone" && !depts.length && !persons.length) return { success: false, error: "Pick the departments or people it applies to." };
  const { recordDecision } = await import("@/lib/actions/meet/decisions");
  const r: any = await recordDecision({
    sessionId: input.sessionId,
    pointId: input.pointId || undefined,
    text,
    decidedBy: String(input.decidedBy || "").trim() || "Management",
    effectiveFrom: input.effectiveFrom || undefined,
    reviewDate: input.reviewDate || undefined,
    tags: [input.kind].filter(Boolean),
  });
  if (!r?.success || !r.decision?.id) return { success: false, error: r?.error || "Couldn't record the decision." };
  const id = r.decision.id as string;
  const { writeDecisionScope, decisionAudience } = await import("@/lib/utils/meet-decision-scope");
  const scope = {
    kind: input.kind || "Other",
    appliesTo: input.appliesTo,
    departmentIds: input.appliesTo === "everyone" ? [] : depts,
    personIds: input.appliesTo === "everyone" ? [] : persons,
    background: String(input.background || "").trim() || null,
    needsAck: !!input.needsAck,
    noted: [],
  };
  await writeDecisionScope(id, scope, auth.userId);

  if (input.followUp?.title?.trim()) {
    await addDecisionTask({ id, title: input.followUp.title, ownerId: input.followUp.ownerId, days: input.followUp.days });
  }

  // "Decision recorded" email (goes out only if that email is written and switched on)
  const audience = input.appliesTo === "everyone" ? [] : await decisionAudience(scope);
  const { data: s } = await supabaseAdmin.from("meet_sessions").select("meeting_id, meeting:meet_meetings(title)").eq("id", input.sessionId).maybeSingle();
  const deptNames = depts.length ? ((await supabaseAdmin.from("departments").select("name").in("id", depts)).data || []).map((d: any) => d.name) : [];
  const { sendMeetEmail } = await import("@/lib/utils/meet-email");
  await sendMeetEmail("Decision recorded", {
    entityId: id,
    sessionId: input.sessionId,
    meetingId: s?.meeting_id,
    actorId: auth.userId,
    recipients: { "People the decision applies to": audience },
    link: `/meet/decisions/${id}`,
    data: {
      decision_code: r.decision.code,
      decision_text: text,
      decision_type: scope.kind,
      applies_to: input.appliesTo === "everyone" ? "everyone" : [...deptNames, persons.length ? `${persons.length} named ${persons.length === 1 ? "person" : "people"}` : ""].filter(Boolean).join(", "),
      effective_from: input.effectiveFrom || new Date().toISOString().slice(0, 10),
      meeting_title: one((s as any)?.meeting)?.title || "",
      link: `${process.env.NEXT_PUBLIC_SITE_URL || "https://chandakgroup.tech"}/meet/decisions/${id}`,
    },
  });
  revalidatePath("/meet/decisions");
  return { success: true, id };
}

/** "Noted" by someone the decision applies to. */
export async function noteDecision(id: string): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_VIEW");
  const { readDecisionScope, writeDecisionScope } = await import("@/lib/utils/meet-decision-scope");
  const scope = await readDecisionScope(id);
  if (!scope) return { success: false, error: "This decision has no audience set." };
  if (scope.noted?.some((n) => n.userId === auth.userId)) return { success: true };
  scope.noted = [...(scope.noted || []), { userId: auth.userId, at: new Date().toISOString() }];
  await writeDecisionScope(id, scope, auth.userId);
  await supabaseAdmin.from("meet_activity_log").insert({ entity_type: "decision", entity_id: id, action: "noted", field: "noted", new_value: "Noted", user_id: auth.userId, channel: "web" });
  revalidatePath(`/meet/decisions/${id}`);
  return { success: true };
}
