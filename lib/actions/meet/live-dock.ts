"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { createPoint } from "@/lib/actions/meet/points";
import { createTask } from "@/lib/actions/meet/tasks";
import { recordDecision } from "@/lib/actions/meet/decisions";
import { getOrCreateSessionNotes, addNoteBlock } from "@/lib/actions/meet/notes";

/**
 * "Meeting in progress" panel: while a meeting you're part of is running, a small panel stays on
 * every Chandak Meet page so you can add a point, task, note line or decision without leaving the
 * page you're on (the Teams call itself runs in the Teams app or its own tab).
 */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export interface RunningMeeting {
  sessionId: string;
  meetingId: string;
  title: string;
  startedAt: string | null;
  isHost: boolean;
  videoLink: string | null;
  points: { id: string; code: string; title: string }[];
}

export async function getMyRunningMeeting(): Promise<RunningMeeting | null> {
  let auth;
  try {
    auth = await requireMeet("MEET_VIEW");
  } catch {
    return null;
  }
  const userId = auth.userId;
  const { data: running } = await supabaseAdmin
    .from("meet_sessions")
    .select("id, actual_start, video_link, meeting_id, minute_taker_id, meeting:meet_meetings(id, title, organizer_id, chair_id, default_minute_taker_id, video_link)")
    .eq("status", "in_progress")
    .eq("is_deleted", false)
    .order("actual_start", { ascending: false })
    .limit(50);
  if (!running?.length) return null;
  const ids = running.map((r: any) => r.id);
  const { data: att } = await supabaseAdmin.from("meet_session_attendees").select("session_id").eq("user_id", userId).in("session_id", ids).not("role", "in", '("requested","denied")');
  const attending = new Set((att || []).map((a: any) => a.session_id));
  const pick = (running as any[]).find((r) => {
    const m = one(r.meeting);
    return attending.has(r.id) || m?.organizer_id === userId || m?.chair_id === userId || m?.default_minute_taker_id === userId || r.minute_taker_id === userId;
  });
  if (!pick) return null;
  const m = one(pick.meeting);
  const { data: sp } = await supabaseAdmin
    .from("meet_session_points")
    .select("point:meet_points(id, code, title, status, is_deleted)")
    .eq("session_id", pick.id);
  const points = ((sp || []) as any[])
    .map((r) => one(r.point))
    .filter((p) => p && !p.is_deleted && p.status !== "closed" && p.status !== "dropped")
    .map((p) => ({ id: p.id, code: p.code, title: p.title }));
  return {
    sessionId: pick.id,
    meetingId: m?.id || pick.meeting_id,
    title: m?.title || "Meeting",
    startedAt: pick.actual_start || null,
    isHost: m?.organizer_id === userId || m?.chair_id === userId || m?.default_minute_taker_id === userId || pick.minute_taker_id === userId,
    videoLink: pick.video_link || m?.video_link || null,
    points,
  };
}

export async function dockAdd(input: {
  sessionId: string;
  kind: "point" | "task" | "note" | "decision";
  text: string;
  ownerId?: string;
  days?: number;
  pointId?: string;
}): Promise<{ success: boolean; error?: string; code?: string }> {
  await requireMeet("MEET_VIEW", { sessionId: input.sessionId });
  const text = String(input.text || "").trim().slice(0, 500);
  if (text.length < 2) return { success: false, error: "Type something first." };
  const { data: s } = await supabaseAdmin.from("meet_sessions").select("id, meeting_id, status").eq("id", input.sessionId).maybeSingle();
  if (!s) return { success: false, error: "Meeting not found." };
  if (s.status !== "in_progress") return { success: false, error: "This meeting has ended." };
  const days = Math.min(60, Math.max(1, Math.round(Number(input.days) || 3)));

  let res: any;
  if (input.kind === "point") {
    res = await createPoint({ meeting_id: s.meeting_id, session_id: s.id, title: text, owner_id: input.ownerId || undefined, tat_days: days });
    if (res?.success) res.code = res.point?.code;
  } else if (input.kind === "task") {
    res = await createTask({ point_id: input.pointId || null, session_id: s.id, title: text, owner_id: input.ownerId || undefined, tat_days: days });
    if (res?.success) res.code = res.task?.code;
  } else if (input.kind === "decision") {
    res = await recordDecision({ sessionId: s.id, pointId: input.pointId || undefined, text });
    if (res?.success) res.code = res.decision?.code;
  } else {
    const note = await getOrCreateSessionNotes(s.id);
    if (!note) return { success: false, error: "Couldn't open the meeting notes." };
    res = await addNoteBlock({ note_id: note.id, text, point_id: input.pointId || null });
  }
  if (!res?.success) return { success: false, error: res?.error || "Couldn't add it." };
  revalidatePath(`/meet/live/${s.id}`);
  return { success: true, code: res.code };
}
