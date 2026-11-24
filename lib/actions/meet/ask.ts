"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { getMyMeetScope, getHiddenConfidentialMeetingIds } from "@/lib/utils/meet-scope";

/**
 * Ask Meet: answers questions like "what did we decide about the Indore distributor?" from the
 * meetings the person can see — points, decisions, tasks and minutes. It searches first, then (if
 * Cloudflare Workers AI is set up on the server) writes a short answer from those results only,
 * citing them. Without AI it still returns the matching items. Read-only.
 */

export interface AskSource {
  kind: "Point" | "Decision" | "Task" | "Minutes";
  code: string;
  title: string;
  snippet: string;
  meeting: string;
  date: string | null;
  status: string | null;
  href: string;
}

export interface AskResult {
  answer: string | null;
  aiUsed: boolean;
  sources: AskSource[];
  note?: string;
}

const STOP = new Set(
  "the a an and or of to in on for with about what which who whom when where why how did do does was were is are be been we our us they them it this that these those any all from by at as has have had will would can could should status update latest last meeting meetings point points decision decisions task tasks minutes mom kya hai tha ki ke ko se me".split(" ")
);
const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const clip = (s: string, n = 220) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};

function keywords(q: string): string[] {
  const words = String(q || "")
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));
  return Array.from(new Set(words)).slice(0, 6);
}

async function aiAnswer(question: string, sources: AskSource[]): Promise<string | null> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_TOKEN;
  if (!account || !token || sources.length === 0) return null;
  const model = process.env.MEET_AI_TEXT_MODEL || "@cf/meta/llama-3.1-8b-instruct";
  const context = sources
    .slice(0, 18)
    .map((s, i) => `[${i + 1}] ${s.kind} ${s.code} · ${s.meeting}${s.date ? ` · ${s.date}` : ""}${s.status ? ` · ${s.status}` : ""}\n${s.title}. ${s.snippet}`)
    .join("\n\n");
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        max_tokens: 400,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You answer questions about a company's meetings using ONLY the numbered records given. Answer in 2-5 short sentences of plain English. Cite records like [2]. If the records don't answer the question, say so plainly. Never invent names, dates, numbers or decisions.",
          },
          { role: "user", content: `Records:\n\n${context}\n\nQuestion: ${question}` },
        ],
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text = j?.result?.response || j?.result?.output_text || null;
    return text ? String(text).trim().slice(0, 2000) : null;
  } catch {
    return null;
  }
}

export async function askMeet(question: string): Promise<AskResult> {
  const auth = await requireMeet("MEET_VIEW");
  const q = String(question || "").trim().slice(0, 300);
  if (q.length < 3) return { answer: null, aiUsed: false, sources: [], note: "Type a question." };
  const words = keywords(q);
  if (!words.length) return { answer: null, aiUsed: false, sources: [], note: "Add a word or two about the topic, like a customer, project or place." };

  const isAdmin = auth.isSuperAdmin || auth.isMeetAdmin;
  const [scope, hidden] = await Promise.all([getMyMeetScope(auth.userId), getHiddenConfidentialMeetingIds(auth.userId, isAdmin)]);
  const allowedMeeting = (id?: string | null) => !!id && !hidden.has(id) && (isAdmin || scope.meetingIds.has(id));

  const orFor = (cols: string[]) => words.flatMap((w) => cols.map((c) => `${c}.ilike.%${w.replace(/[%_,()]/g, "")}%`)).join(",");

  const [pRes, dRes, tRes, mRes] = await Promise.all([
    supabaseAdmin
      .from("meet_points")
      .select("id, code, title, description, status, due_date, updated_at, meeting:meet_meetings(id, title)")
      .eq("is_deleted", false)
      .or(orFor(["title", "description"]))
      .order("updated_at", { ascending: false })
      .limit(40),
    supabaseAdmin
      .from("meet_decisions")
      .select("id, code, text, status, decided_at, session_id, session:meet_sessions(id, meeting:meet_meetings(id, title))")
      .or(orFor(["text"]))
      .order("decided_at", { ascending: false })
      .limit(30),
    supabaseAdmin
      .from("meet_tasks")
      .select("id, code, title, description, status, due_date, updated_at, point:meet_points(id, meeting:meet_meetings(id, title))")
      .eq("is_deleted", false)
      .or(orFor(["title", "description"]))
      .order("updated_at", { ascending: false })
      .limit(30),
    supabaseAdmin
      .from("meet_ai_minutes")
      .select("id, overview, created_at, session_id, session:meet_sessions(id, code, scheduled_start, meeting:meet_meetings(id, title))")
      .or(orFor(["overview"]))
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null);
  const score = (text: string) => words.reduce((n, w) => n + (text.toLowerCase().includes(w) ? 1 : 0), 0);

  const sources: (AskSource & { score: number; when: string })[] = [];
  for (const p of (pRes.data || []) as any[]) {
    const m = one(p.meeting);
    if (!allowedMeeting(m?.id)) continue;
    sources.push({
      kind: "Point", code: p.code, title: p.title, snippet: clip(p.description || ""), meeting: m?.title || "", date: day(p.due_date), status: p.status,
      href: `/meet/points/${p.id}`, score: score(`${p.title} ${p.description || ""}`) + 0.5, when: p.updated_at || "",
    });
  }
  for (const d of (dRes.data || []) as any[]) {
    const m = one(one(d.session)?.meeting);
    if (!allowedMeeting(m?.id)) continue;
    sources.push({
      kind: "Decision", code: d.code, title: clip(d.text, 140), snippet: clip(d.text), meeting: m?.title || "", date: day(d.decided_at), status: d.status,
      href: `/meet/sessions/${d.session_id}`, score: score(d.text) + 1, when: d.decided_at || "",
    });
  }
  for (const t of (tRes.data || []) as any[]) {
    const m = one(one(t.point)?.meeting);
    if (!allowedMeeting(m?.id)) continue;
    sources.push({
      kind: "Task", code: t.code, title: t.title, snippet: clip(t.description || ""), meeting: m?.title || "", date: day(t.due_date), status: t.status,
      href: `/meet/my-work?tab=tasks`, score: score(`${t.title} ${t.description || ""}`), when: t.updated_at || "",
    });
  }
  for (const mm of (mRes.data || []) as any[]) {
    const s = one(mm.session);
    const m = one(s?.meeting);
    if (!allowedMeeting(m?.id)) continue;
    sources.push({
      kind: "Minutes", code: s?.code || "", title: `Minutes · ${m?.title || "Meeting"}`, snippet: clip(mm.overview, 260), meeting: m?.title || "", date: day(s?.scheduled_start), status: null,
      href: `/meet/sessions/${mm.session_id}`, score: score(mm.overview || ""), when: mm.created_at || "",
    });
  }

  const ranked = sources
    .sort((a, b) => b.score - a.score || b.when.localeCompare(a.when))
    .slice(0, 20)
    .map(({ score: _s, when: _w, ...rest }) => rest);

  if (!ranked.length) return { answer: null, aiUsed: false, sources: [], note: "Nothing in your meetings mentions that. Try another word." };

  const answer = await aiAnswer(q, ranked);

  return { answer, aiUsed: !!answer, sources: ranked, note: answer ? undefined : "Showing what matched. A written answer appears when the AI service is available." };
}
