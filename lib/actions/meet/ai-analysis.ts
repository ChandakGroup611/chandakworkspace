"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { streamLLMResponse } from "@/lib/copilot/llm-provider";

/**
 * Meeting analysis for one meeting (all its dates): how it is going, what is at risk, who is
 * overloaded, and a suggested agenda for the next meeting. The numbers and findings are worked
 * out from the data; when an AI key is configured, the AI adds a short plain-English reading of
 * them (it is given only these facts and told not to invent anything).
 */

const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export interface MeetingAnalysis {
  stats: {
    held: number;
    avgAttendance: number | null; // %
    lateRate: number | null; // % of joins that were late
    openPoints: number;
    closedPoints: number;
    overduePoints: number;
    openTasks: number;
    overdueTasks: number;
    onTimeTasks: number | null; // % of finished tasks done within TAT
    decisionsInForce: number;
    decisionsReviewDue: number;
  };
  findings: { level: "risk" | "watch" | "good"; text: string }[];
  owners: { name: string; open: number; overdue: number }[];
  chronic: { id: string; code: string; title: string; carried: number; owner: string }[];
  nextAgenda: string[];
  ai: { text: string; provider: string } | null;
}

export async function getMeetingAnalysis(meetingId: string, withAi = false): Promise<MeetingAnalysis | { error: string }> {
  await requireMeet("MEET_VIEW", { meetingId });
  const t = today();

  const [sessRes, ptsRes] = await Promise.all([
    supabaseAdmin.from("meet_sessions").select("id, status, scheduled_start").eq("meeting_id", meetingId).eq("is_deleted", false).order("scheduled_start", { ascending: false }).limit(200),
    supabaseAdmin
      .from("meet_points")
      .select("id, code, title, status, due_date, carry_forward_count, owner_id, owner:user_master!meet_points_owner_id_fkey(full_name)")
      .eq("meeting_id", meetingId)
      .eq("is_deleted", false)
      .limit(2000),
  ]);
  const sessions = (sessRes.data || []) as any[];
  const heldIds = sessions.filter((s) => !["scheduled", "in_progress", "cancelled"].includes(s.status)).map((s) => s.id);
  const allIds = sessions.map((s) => s.id);
  const points = (ptsRes.data || []) as any[];
  const pointIds = points.map((p) => p.id);

  const [attRes, taskRes, decRes] = await Promise.all([
    heldIds.length
      ? supabaseAdmin.from("meet_session_attendees").select("session_id, attendance, check_in_at, late_minutes").in("session_id", heldIds).not("role", "in", '("requested","denied")')
      : Promise.resolve({ data: [] } as any),
    pointIds.length || allIds.length
      ? supabaseAdmin
          .from("meet_tasks")
          .select("id, status, due_date, revised_due_date, tat_result, owner_id, point_id, session_id, owner:user_master!meet_tasks_owner_id_fkey(full_name)")
          .eq("is_deleted", false)
          .or([pointIds.length ? `point_id.in.(${pointIds.slice(0, 800).join(",")})` : "", allIds.length ? `session_id.in.(${allIds.slice(0, 200).join(",")})` : ""].filter(Boolean).join(","))
          .limit(3000)
      : Promise.resolve({ data: [] } as any),
    allIds.length ? supabaseAdmin.from("meet_decisions").select("id, status, review_date").in("session_id", allIds) : Promise.resolve({ data: [] } as any),
  ]);
  const att = (attRes.data || []) as any[];
  const tasks = (taskRes.data || []) as any[];
  const decs = (decRes.data || []) as any[];

  const isOpenP = (p: any) => p.status !== "closed" && p.status !== "dropped";
  const isOpenT = (x: any) => x.status !== "completed" && x.status !== "cancelled";
  const dueT = (x: any) => x.revised_due_date || x.due_date;
  const openP = points.filter(isOpenP);
  const openT = tasks.filter(isOpenT);
  const overdueP = openP.filter((p) => p.due_date && p.due_date < t);
  const overdueT = openT.filter((x) => dueT(x) && dueT(x) < t);
  const finished = tasks.filter((x) => x.status === "completed" && x.tat_result);
  const onTime = finished.length ? Math.round((finished.filter((x) => x.tat_result === "within_tat").length / finished.length) * 100) : null;

  const present = att.filter((a) => a.check_in_at || a.attendance === "present" || a.attendance === "late");
  const avgAttendance = att.length ? Math.round((present.length / att.length) * 100) : null;
  const joins = att.filter((a) => a.check_in_at);
  const lateRate = joins.length ? Math.round((joins.filter((a) => a.attendance === "late").length / joins.length) * 100) : null;

  const inForce = decs.filter((d) => d.status === "active");
  const reviewDue = inForce.filter((d) => d.review_date && d.review_date <= t);

  // Load per owner
  const load = new Map<string, { name: string; open: number; overdue: number }>();
  const add = (name: string, overdue: boolean) => {
    const r = load.get(name) || { name, open: 0, overdue: 0 };
    r.open++;
    if (overdue) r.overdue++;
    load.set(name, r);
  };
  for (const p of openP) add(one(p.owner)?.full_name || "No owner", !!p.due_date && p.due_date < t);
  for (const x of openT) add(one(x.owner)?.full_name || "No owner", !!dueT(x) && dueT(x) < t);
  const owners = Array.from(load.values()).sort((a, b) => b.overdue - a.overdue || b.open - a.open).slice(0, 8);

  const chronic = openP
    .filter((p) => (p.carry_forward_count || 0) >= 2)
    .sort((a, b) => (b.carry_forward_count || 0) - (a.carry_forward_count || 0))
    .slice(0, 6)
    .map((p) => ({ id: p.id, code: p.code, title: p.title, carried: p.carry_forward_count || 0, owner: one(p.owner)?.full_name || "No owner" }));

  const findings: MeetingAnalysis["findings"] = [];
  if (chronic.length) findings.push({ level: "risk", text: `${chronic.length} point${chronic.length === 1 ? " has" : "s have"} been carried 2 or more times without closing. Decide: close, drop or escalate.` });
  if (overdueT.length) findings.push({ level: "risk", text: `${overdueT.length} task${overdueT.length === 1 ? " is" : "s are"} overdue.` });
  if (overdueP.length) findings.push({ level: "watch", text: `${overdueP.length} open point${overdueP.length === 1 ? " is" : "s are"} past the due date.` });
  const noOwner = openP.filter((p) => !p.owner_id).length;
  if (noOwner) findings.push({ level: "risk", text: `${noOwner} open point${noOwner === 1 ? " has" : "s have"} no owner, so nobody is following ${noOwner === 1 ? "it" : "them"} up.` });
  const heavy = owners.filter((o) => o.name !== "No owner" && o.open >= 6);
  if (heavy.length) findings.push({ level: "watch", text: `${heavy.map((o) => o.name).join(", ")} ${heavy.length === 1 ? "has" : "have"} 6 or more open items. Consider sharing the load.` });
  if (avgAttendance !== null && avgAttendance < 70) findings.push({ level: "watch", text: `Attendance averages ${avgAttendance}%. Check the time slot or who really needs to attend.` });
  if (lateRate !== null && lateRate >= 30) findings.push({ level: "watch", text: `${lateRate}% of people join late. Starting on time or a later slot may help.` });
  if (reviewDue.length) findings.push({ level: "watch", text: `${reviewDue.length} decision${reviewDue.length === 1 ? " is" : "s are"} due for review.` });
  if (onTime !== null && onTime >= 80) findings.push({ level: "good", text: `${onTime}% of finished tasks were done on time.` });
  if (onTime !== null && onTime < 60) findings.push({ level: "risk", text: `Only ${onTime}% of finished tasks were done on time.` });
  if (!findings.length) findings.push({ level: "good", text: "Nothing at risk. Open items are within their dates." });

  const nextAgenda: string[] = [];
  for (const c of chronic.slice(0, 3)) nextAgenda.push(`Decide on ${c.code} "${c.title}" (carried ${c.carried}×, ${c.owner})`);
  if (overdueT.length) nextAgenda.push(`Overdue tasks: ${overdueT.length}, each owner gives a new date or closes`);
  if (reviewDue.length) nextAgenda.push(`Review ${reviewDue.length} decision${reviewDue.length === 1 ? "" : "s"} due for review`);
  if (noOwner) nextAgenda.push(`Give owners to ${noOwner} point${noOwner === 1 ? "" : "s"}`);
  nextAgenda.push("Updates on the other open points");
  nextAgenda.push("Decisions and next steps");

  const stats: MeetingAnalysis["stats"] = {
    held: heldIds.length,
    avgAttendance,
    lateRate,
    openPoints: openP.length,
    closedPoints: points.length - openP.length,
    overduePoints: overdueP.length,
    openTasks: openT.length,
    overdueTasks: overdueT.length,
    onTimeTasks: onTime,
    decisionsInForce: inForce.length,
    decisionsReviewDue: reviewDue.length,
  };

  let ai: MeetingAnalysis["ai"] = null;
  if (withAi && (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)) {
    try {
      let text = "";
      const facts = JSON.stringify({ stats, findings: findings.map((f) => f.text), owners, chronic: chronic.map((c) => ({ title: c.title, carried: c.carried, owner: c.owner })) });
      const r = await streamLLMResponse({
        prompt: `Here are the facts about one recurring company meeting. In 4-6 short sentences of plain English, say how the meeting is going, the biggest risk, who needs support, and the one thing the chair should do next time. Use only these facts; do not invent names or numbers.\n\n${facts}`,
        history: [],
        systemInstruction: "You are a practical meeting coach for Chandak Group. Plain English, no jargon, no headings, never invent facts.",
        onToken: (tok) => {
          text += tok;
        },
      });
      if (r.provider !== "fallback" && text.trim().length > 20) ai = { text: text.trim().slice(0, 2000), provider: r.provider };
    } catch {
      ai = null;
    }
  }

  return { stats, findings, owners, chronic, nextAgenda, ai };
}

export async function isMeetAiConfigured(): Promise<boolean> {
  await requireMeet("MEET_VIEW");
  return !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}
