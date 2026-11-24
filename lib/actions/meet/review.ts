"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { isActionLikeText } from "@/lib/utils/meet-notes";
import type { MeetAIMinutes } from "@/types/meet";

/**
 * AI minutes review (Chandak Meet redesign, stage 5).
 * Builds the review screen from what already exists: the drafted minutes (meet_ai_minutes),
 * the session's points / tasks / decisions, and the shared meeting notes. Note lines that look
 * like an action or a decision and aren't linked yet become suggestions the minute taker can
 * Accept (convertBlockToItem), Edit or Discard (marks the note line "not an action").
 */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

const DECISION_RE = /\b(decided|agreed|approved|finali[sz]ed|resolved that|we keep|will remain|no change|tay hua|final hai)\b/i;

export interface ReviewSuggestion {
  blockId: string;
  text: string;
  author: string | null;
  kind: "task" | "decision" | "point";
  pointId: string | null;
  ownerId: string | null;
  ownerName: string | null;
  tatDays: number;
}

export interface MinutesReview {
  session: {
    id: string;
    code: string | null;
    status: string;
    scheduledStart: string;
    meetingId: string | null;
    meetingTitle: string;
    meetingCode: string | null;
  };
  canEdit: boolean;
  canApprove: boolean;
  minutes: MeetAIMinutes | null;
  counts: { points: number; tasks: number; decisions: number; noteLines: number; present: number; invited: number };
  suggestions: ReviewSuggestion[];
  points: { id: string; code: string; title: string; status: string; carried: boolean; owner: string | null }[];
  people: { id: string; name: string }[];
  nextSession: { id: string; scheduledStart: string } | null;
}

export async function getMinutesReview(sessionId: string): Promise<MinutesReview | null> {
  const auth = await requireMeet("MEET_VIEW", { sessionId });
  const userId = auth.userId;

  const { data: s } = await supabaseAdmin
    .from("meet_sessions")
    .select("id, code, status, scheduled_start, minute_taker_id, meeting_id, meeting:meet_meetings(id, title, code, organizer_id, chair_id, default_minute_taker_id)")
    .eq("id", sessionId)
    .eq("is_deleted", false)
    .maybeSingle();
  if (!s) return null;
  const m = one((s as any).meeting);

  const [minRes, spRes, taskRes, decRes, notesRes, attRes, nextRes] = await Promise.all([
    supabaseAdmin.from("meet_ai_minutes").select("*").eq("session_id", sessionId).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin
      .from("meet_session_points")
      .select("entry_type, status_at_end, point:meet_points(id, code, title, status, owner:user_master!meet_points_owner_id_fkey(full_name))")
      .eq("session_id", sessionId),
    supabaseAdmin.from("meet_tasks").select("id", { count: "exact", head: true }).eq("session_id", sessionId).eq("is_deleted", false),
    supabaseAdmin.from("meet_decisions").select("id", { count: "exact", head: true }).eq("session_id", sessionId),
    supabaseAdmin
      .from("meet_notes")
      .select("blocks:meet_note_blocks(id, position, type, text, done, point_id, linked_id, not_action, deleted_at, author:user_master(full_name))")
      .eq("session_id", sessionId)
      .eq("kind", "session")
      .maybeSingle(),
    supabaseAdmin
      .from("meet_session_attendees")
      .select("user_id, attendance, check_in_at, role, user:user_master!meet_session_attendees_user_id_fkey(id, full_name)")
      .eq("session_id", sessionId)
      .not("role", "in", '("requested","denied")'),
    m?.id
      ? supabaseAdmin
          .from("meet_sessions")
          .select("id, scheduled_start")
          .eq("meeting_id", m.id)
          .eq("is_deleted", false)
          .eq("status", "scheduled")
          .gt("scheduled_start", (s as any).scheduled_start)
          .order("scheduled_start", { ascending: true })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);

  const people = (attRes.data || [])
    .map((a: any) => one(a.user))
    .filter(Boolean)
    .map((u: any) => ({ id: u.id, name: u.full_name || "Someone" }));

  const points = (spRes.data || [])
    .map((r: any) => {
      const p = one(r.point);
      if (!p) return null;
      const status = r.status_at_end || p.status;
      return {
        id: p.id,
        code: p.code,
        title: p.title,
        status,
        carried: status !== "closed" && status !== "dropped",
        owner: one(p.owner)?.full_name || null,
      };
    })
    .filter(Boolean) as MinutesReview["points"];

  const blocks: any[] = ((notesRes.data as any)?.blocks || []).filter((b: any) => !b.deleted_at);

  // "@Rohit" or a full name in the line picks the owner; "3d" / "3 days" picks the TAT
  const findOwner = (text: string) => {
    const lower = text.toLowerCase();
    for (const p of people) {
      const first = p.name.split(/\s+/)[0]?.toLowerCase();
      if (!first) continue;
      if (lower.includes(`@${first}`) || lower.includes(p.name.toLowerCase())) return p;
    }
    return null;
  };

  const suggestions: ReviewSuggestion[] = blocks
    .filter((b) => !b.linked_id && !b.not_action && !b.done && b.type !== "heading")
    .filter((b) => b.type === "todo" || isActionLikeText(b.text) || DECISION_RE.test(b.text))
    .sort((a, b) => a.position - b.position)
    .slice(0, 40)
    .map((b) => {
      const owner = findOwner(b.text);
      const tat = Number((b.text.match(/\b(\d{1,2})\s*(d|days?|din)\b/i) || [])[1]) || 3;
      const kind: ReviewSuggestion["kind"] = DECISION_RE.test(b.text) && b.type !== "todo" ? "decision" : "task";
      return {
        blockId: b.id,
        text: String(b.text).trim(),
        author: one(b.author)?.full_name || null,
        kind,
        pointId: b.point_id || points[0]?.id || null,
        ownerId: owner?.id || null,
        ownerName: owner?.name || null,
        tatDays: Math.min(Math.max(tat, 1), 60),
      };
    });

  const isAdmin = auth.isSuperAdmin || auth.isMeetAdmin;
  const isOrgOrChair = m?.organizer_id === userId || m?.chair_id === userId;
  const isMinuteTaker = (s as any).minute_taker_id === userId || m?.default_minute_taker_id === userId;

  const att = attRes.data || [];
  return {
    session: {
      id: s.id,
      code: (s as any).code || null,
      status: (s as any).status,
      scheduledStart: (s as any).scheduled_start,
      meetingId: m?.id || null,
      meetingTitle: m?.title || "Meeting",
      meetingCode: m?.code || null,
    },
    canEdit: isAdmin || isOrgOrChair || isMinuteTaker,
    canApprove: isAdmin || isOrgOrChair,
    minutes: (minRes.data as MeetAIMinutes) || null,
    counts: {
      points: points.length,
      tasks: taskRes.count || 0,
      decisions: decRes.count || 0,
      noteLines: blocks.length,
      present: att.filter((a: any) => a.check_in_at || a.attendance === "present" || a.attendance === "late").length,
      invited: att.length,
    },
    suggestions,
    points,
    people,
    nextSession: (nextRes as any)?.data ? { id: (nextRes as any).data.id, scheduledStart: (nextRes as any).data.scheduled_start } : null,
  };
}
