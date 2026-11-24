"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { recordDecision } from "@/lib/actions/meet/decisions";
import { createTask } from "@/lib/actions/meet/tasks";

/**
 * Recording a decision as a management action: what was decided, why, who it applies to
 * (everyone, departments or people), who must act on it, and by when. Each person who must act
 * gets an "implement this decision" task, so what was done is tracked like any task.
 * Extra details are kept in core_module_settings ("decision_meta:<id>"), no schema change.
 */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export interface DecisionMeta {
  details: string | null;
  category: string | null;
  priority: string | null;
  applies_to: "everyone" | "departments" | "people";
  department_ids: string[];
  user_ids: string[];
  responsible_ids: string[];
}

export async function readDecisionMeta(id: string): Promise<DecisionMeta | null> {
  await requireMeet("MEET_VIEW");
  const { data } = await supabaseAdmin.from("core_module_settings").select("value_json").eq("module_key", "meet").eq("key", `decision_meta:${id}`).maybeSingle();
  return (data?.value_json as DecisionMeta) || null;
}

export async function getDecisionFormData() {
  const auth = await requireMeet("MEET_VIEW");
  const isAdmin = auth.isSuperAdmin || auth.isMeetAdmin;
  const [sRes, dRes, uRes] = await Promise.all([
    supabaseAdmin
      .from("meet_sessions")
      .select("id, code, scheduled_start, status, meeting:meet_meetings(id, title, code, organizer_id, chair_id, is_deleted)")
      .eq("is_deleted", false)
      .neq("status", "cancelled")
      .order("scheduled_start", { ascending: false })
      .limit(150),
    supabaseAdmin.from("departments").select("id, name").eq("is_deleted", false).order("name"),
    supabaseAdmin.from("user_master").select("id, full_name, email").eq("is_deleted", false).eq("is_active", true).order("full_name").limit(2000),
  ]);
  const sessions = ((sRes.data || []) as any[])
    .map((s) => ({ s, m: one(s.meeting) }))
    .filter(({ m }) => m && !m.is_deleted)
    .map(({ s, m }) => ({
      id: s.id,
      label: `${m.title} · ${new Date(s.scheduled_start).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}`,
      mine: isAdmin || m.organizer_id === auth.userId || m.chair_id === auth.userId,
    }));
  return {
    sessions,
    departments: ((dRes.data || []) as any[]).map((d) => ({ id: d.id, label: d.name })),
    people: ((uRes.data || []) as any[]).map((u) => ({ id: u.id, full_name: u.full_name || u.email || "—", email: u.email || null })),
  };
}

export async function createDecisionFull(input: {
  sessionId: string;
  text: string;
  details?: string;
  category?: string;
  priority?: string;
  decidedBy?: string;
  effectiveFrom?: string;
  reviewDate?: string;
  appliesTo: "everyone" | "departments" | "people";
  departmentIds?: string[];
  userIds?: string[];
  responsibleIds?: string[];
  actionDays?: number;
}): Promise<{ success: boolean; error?: string; id?: string; tasks?: number }> {
  const auth = await requireMeet("MEET_VIEW", { sessionId: input.sessionId });
  const text = String(input.text || "").trim().slice(0, 500);
  if (text.length < 3) return { success: false, error: "Write the decision." };
  if (!input.sessionId) return { success: false, error: "Pick the meeting it was taken in." };
  if (input.appliesTo === "departments" && !(input.departmentIds || []).length) return { success: false, error: "Pick at least one department." };
  if (input.appliesTo === "people" && !(input.userIds || []).length) return { success: false, error: "Pick at least one person." };
  const ok = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined);

  const r: any = await recordDecision({
    sessionId: input.sessionId,
    text,
    decidedBy: String(input.decidedBy || "").trim() || "Management",
    effectiveFrom: ok(input.effectiveFrom),
    reviewDate: ok(input.reviewDate),
    tags: [input.category, input.priority].filter(Boolean) as string[],
  });
  if (!r?.success || !r.decision) return { success: false, error: r?.error || "Couldn't record the decision." };
  const dec = r.decision;

  const responsible = Array.from(new Set((input.responsibleIds || []).filter(Boolean)));
  const meta: DecisionMeta = {
    details: String(input.details || "").trim().slice(0, 5000) || null,
    category: input.category || null,
    priority: input.priority || null,
    applies_to: input.appliesTo,
    department_ids: input.appliesTo === "departments" ? input.departmentIds || [] : [],
    user_ids: input.appliesTo === "people" ? input.userIds || [] : [],
    responsible_ids: responsible,
  };
  await supabaseAdmin.from("core_module_settings").upsert(
    { module_key: "meet", key: `decision_meta:${dec.id}`, value_json: meta, updated_by: auth.userId, updated_at: new Date().toISOString() },
    { onConflict: "module_key,key" }
  );

  // One "implement this decision" task per responsible person
  let tasks = 0;
  for (const uid of responsible) {
    const t: any = await createTask({
      point_id: null,
      session_id: input.sessionId,
      title: `Implement ${dec.code}: ${text}`.slice(0, 300),
      description: `Action on decision ${dec.code}.${meta.details ? `\n\n${meta.details}` : ""}\n\nUpdate the progress with what was done.`,
      owner_id: uid,
      priority: (input.priority === "critical" ? "critical" : input.priority === "high" ? "high" : "medium") as any,
      tat_days: Math.min(90, Math.max(1, Math.round(Number(input.actionDays) || 7))),
    });
    if (t?.success && t.task?.id) {
      tasks++;
      await supabaseAdmin.from("meet_activity_log").insert({ entity_type: "decision", entity_id: dec.id, action: "follow_up_task", field: "task", new_value: `${t.task.id} ${t.task.code}`, user_id: auth.userId, channel: "web" });
    }
  }

  revalidatePath("/meet/decisions");
  return { success: true, id: dec.id, tasks };
}

/** Who acts on the decision and what they've done (from their tasks). */
export async function getDecisionImplementation(decisionId: string) {
  await requireMeet("MEET_VIEW");
  const { data: links } = await supabaseAdmin.from("meet_activity_log").select("new_value").eq("entity_type", "decision").eq("entity_id", decisionId).eq("action", "follow_up_task");
  const ids = ((links || []) as any[]).map((l) => String(l.new_value || "").split(" ")[0]).filter((x) => /^[0-9a-f-]{36}$/i.test(x));
  if (!ids.length) return [];
  const [{ data: tasks }, { data: notes }] = await Promise.all([
    supabaseAdmin.from("meet_tasks").select("id, code, title, status, progress_percent, due_date, revised_due_date, completed_at, completion_remarks, owner:user_master!meet_tasks_owner_id_fkey(full_name)").in("id", ids).eq("is_deleted", false),
    supabaseAdmin.from("meet_activity_log").select("entity_id, new_value, created_at").eq("entity_type", "task").in("entity_id", ids).in("action", ["progress_updated", "status_changed"]).order("created_at", { ascending: false }),
  ]);
  const last = new Map<string, { text: string; at: string }>();
  for (const n of (notes || []) as any[]) if (!last.has(n.entity_id)) last.set(n.entity_id, { text: String(n.new_value || "").replace(/_/g, " "), at: n.created_at });
  return ((tasks || []) as any[]).map((t) => ({
    id: t.id,
    code: t.code,
    title: t.title,
    owner: one(t.owner)?.full_name || "No owner",
    status: t.status,
    progress: Number(t.progress_percent) || 0,
    due: t.revised_due_date || t.due_date || null,
    lastUpdate: t.completion_remarks || last.get(t.id)?.text || null,
    lastAt: last.get(t.id)?.at || t.completed_at || null,
  }));
}
