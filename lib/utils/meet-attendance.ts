import { supabaseAdmin } from "@/lib/supabase/service_role";

/**
 * Automatic attendance from join time.
 *  - Joining (join page / admitted / starting the meeting) records the time and marks the person
 *    Present (on time or early) or Late (more than the grace minutes after the start).
 *  - When the meeting starts, everyone who hasn't joined and wasn't marked by hand is set to Absent
 *    (people who said they can't attend: Excused); joining later flips them to Late.
 *  - When it ends, the same rule settles anyone still unmarked.
 *  - A host can still change anyone by hand; that is kept (marked_by) and not overwritten.
 * Grace minutes: core_module_settings meet/"attendance_rules" { grace_minutes }, default 5.
 */

export async function graceMinutes(): Promise<number> {
  const { data } = await supabaseAdmin.from("core_module_settings").select("value_json").eq("module_key", "meet").eq("key", "attendance_rules").maybeSingle();
  const g = Number((data?.value_json as any)?.grace_minutes);
  return Number.isFinite(g) && g >= 0 && g <= 120 ? g : 5;
}

export function classifyJoin(joinIso: string, startIso: string, grace: number) {
  const diffMin = Math.round((new Date(joinIso).getTime() - new Date(startIso).getTime()) / 60000);
  if (diffMin > grace) return { attendance: "late" as const, late_minutes: diffMin, early_minutes: 0 };
  return { attendance: "present" as const, late_minutes: 0, early_minutes: diffMin < 0 ? -diffMin : 0 };
}

/** Record that a person joined now (once). Returns what was recorded. */
export async function autoCheckIn(sessionId: string, userId: string, method: string): Promise<{ attendance: string; late_minutes: number } | null> {
  const [{ data: s }, { data: att }] = await Promise.all([
    supabaseAdmin.from("meet_sessions").select("scheduled_start, actual_start").eq("id", sessionId).maybeSingle(),
    supabaseAdmin.from("meet_session_attendees").select("id, check_in_at, role").eq("session_id", sessionId).eq("user_id", userId).maybeSingle(),
  ]);
  if (!s || !att || att.role === "requested" || att.role === "denied" || att.check_in_at) return null;
  const now = new Date().toISOString();
  const c = classifyJoin(now, s.scheduled_start, await graceMinutes());
  await supabaseAdmin
    .from("meet_session_attendees")
    .update({ attendance: c.attendance, late_minutes: c.late_minutes, check_in_at: now, check_in_method: method })
    .eq("id", att.id);
  return { attendance: c.attendance, late_minutes: c.late_minutes };
}

/** Everyone not joined and not marked by hand: Absent (or Excused if they declined). */
export async function settleUnjoined(sessionId: string) {
  const { data } = await supabaseAdmin
    .from("meet_session_attendees")
    .select("id, invite_status, check_in_at, marked_by, role")
    .eq("session_id", sessionId)
    .is("check_in_at", null)
    .is("marked_by", null);
  const rows = ((data || []) as any[]).filter((r) => r.role !== "requested" && r.role !== "denied");
  const declined = rows.filter((r) => r.invite_status === "declined").map((r) => r.id);
  const others = rows.filter((r) => r.invite_status !== "declined").map((r) => r.id);
  if (declined.length) await supabaseAdmin.from("meet_session_attendees").update({ attendance: "excused" }).in("id", declined);
  if (others.length) await supabaseAdmin.from("meet_session_attendees").update({ attendance: "absent" }).in("id", others);
}
