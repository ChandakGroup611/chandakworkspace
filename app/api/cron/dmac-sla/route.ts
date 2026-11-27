import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { queueBusinessEvent } from "@/lib/actions/notification-engine";
import { notifyDrawingEvent, projectReviewers } from "@/lib/dmac/notify";
import { processDueDrawingCoordinationTasksAndSlaAction } from "@/lib/actions/drawing-coordination";

/**
 * DMAC drawing review SLA job.
 *   GET /api/cron/dmac-sla               escalate drawings past their working-day target (once per day each)
 *   GET /api/cron/dmac-sla?mode=digest   one daily summary per reviewer and designer of what waits on them
 * Working days come from v_dmac_drawings_live_status (Sundays and dmac_holiday_calendar excluded).
 * Called with "Authorization: Bearer $CRON_SECRET", like the other cron routes.
 */

export const dynamic = "force-dynamic";

function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

function todayIST(): string {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

async function isWorkingDay(day: string): Promise<boolean> {
  if (new Date(`${day}T00:00:00Z`).getUTCDay() === 0) return false;
  const { data } = await supabaseAdmin
    .from("dmac_holiday_calendar")
    .select("id")
    .eq("holiday_date", day)
    .is("project_id", null)
    .limit(1);
  return !data || data.length === 0;
}

type LiveRow = {
  drawing_id: string;
  project_id: string;
  drawing_number: string;
  title: string;
  current_status: string;
  display_rev: string;
  days_in_current_state: number;
  is_overdue: boolean;
  design_owner_id: string | null;
  engineering_reviewer_id: string | null;
};

async function escalate(today: string) {
  const { data: rows, error } = await supabaseAdmin
    .from("v_dmac_drawings_live_status")
    .select("drawing_id, current_status, days_in_current_state, is_overdue")
    .eq("is_overdue", true)
    .in("current_status", ["UNDER_REVIEW", "RETURNED"])
    .limit(500);
  if (error) throw error;

  const ids = (rows || []).map((r: any) => r.drawing_id);
  if (!ids.length) return { overdue: 0, escalated: 0 };
  const { data: marks } = await supabaseAdmin.from("dmac_drawings").select("id, last_escalated_on").in("id", ids);
  const already = new Set((marks || []).filter((m: any) => m.last_escalated_on === today).map((m: any) => m.id));

  let escalated = 0;
  for (const r of (rows || []) as LiveRow[]) {
    if (already.has(r.drawing_id)) continue;
    // Mark first so a second run the same day can't send it twice
    const { data: marked, error: markErr } = await supabaseAdmin
      .from("dmac_drawings")
      .update({ last_escalated_on: today })
      .eq("id", r.drawing_id)
      .or(`last_escalated_on.is.null,last_escalated_on.lt.${today}`)
      .select("id");
    if (markErr || !marked?.length) continue;
    await notifyDrawingEvent(r.current_status === "UNDER_REVIEW" ? "Review Overdue" : "Revision Overdue", r.drawing_id, null, {
      days: r.days_in_current_state,
    });
    escalated++;
  }
  return { overdue: rows?.length || 0, escalated };
}

async function digest(today: string) {
  const { data: rows, error } = await supabaseAdmin
    .from("v_dmac_drawings_live_status")
    .select("drawing_id, project_id, drawing_number, title, current_status, display_rev, days_in_current_state, is_overdue, design_owner_id, engineering_reviewer_id")
    .in("current_status", ["UNDER_REVIEW", "RETURNED"])
    .limit(2000);
  if (error) throw error;
  const live = (rows || []) as LiveRow[];
  if (!live.length) return { recipients: 0 };

  const projectIds = [...new Set(live.map((r) => r.project_id))];
  const { data: projects } = await supabaseAdmin
    .from("dmac_projects")
    .select("id, name, legacy_design_project_id")
    .in("id", projectIds);
  const projectById = new Map((projects || []).map((p: any) => [p.id, p]));

  const { data: revs } = await supabaseAdmin
    .from("dmac_drawing_revisions")
    .select("drawing_id, submitted_by")
    .in("drawing_id", live.map((r) => r.drawing_id))
    .eq("is_superseded", false);
  const submitterOf = new Map((revs || []).map((r: any) => [r.drawing_id, r.submitted_by]));

  // What waits on each person: reviews for reviewers, returned sheets for their designers
  const perUser = new Map<string, LiveRow[]>();
  const add = (uid: string | null | undefined, r: LiveRow) => {
    if (!uid) return;
    const list = perUser.get(uid) || [];
    if (!list.some((x) => x.drawing_id === r.drawing_id)) list.push(r);
    perUser.set(uid, list);
  };
  const reviewersByProject = new Map<string, string[]>();
  for (const pid of projectIds) {
    reviewersByProject.set(pid, await projectReviewers(projectById.get(pid)?.legacy_design_project_id || null));
  }
  for (const r of live) {
    if (r.current_status === "UNDER_REVIEW") {
      if (r.engineering_reviewer_id) add(r.engineering_reviewer_id, r);
      else (reviewersByProject.get(r.project_id) || []).forEach((uid) => add(uid, r));
    } else {
      add(submitterOf.get(r.drawing_id), r);
      if (r.design_owner_id !== submitterOf.get(r.drawing_id)) add(r.design_owner_id, r);
    }
  }

  let sent = 0;
  for (const [uid, items] of perUser) {
    items.sort((a, b) => b.days_in_current_state - a.days_in_current_state);
    const overdue = items.filter((i) => i.is_overdue).length;
    const lines = items
      .slice(0, 25)
      .map(
        (i) =>
          `${i.drawing_number} ${i.display_rev} · ${projectById.get(i.project_id)?.name || ""} · ${
            i.current_status === "UNDER_REVIEW" ? "to review" : "to revise"
          } · ${i.days_in_current_state} working day(s)${i.is_overdue ? " · OVERDUE" : ""}`
      );
    if (items.length > 25) lines.push(`…and ${items.length - 25} more`);
    await queueBusinessEvent("Design", "Daily Digest", {
      entity_id: `dmac-digest-${today}-${uid}`,
      triggering_user_id: "",
      drawing_label: `${items.length} drawing(s) waiting${overdue ? `, ${overdue} overdue` : ""}`,
      description: lines.join("<br/>"),
      link: "/design/approvals",
      design_recipients: { "Digest Recipient": [uid] },
    }).catch((err) => console.error("[dmac-sla] digest not queued:", err));
    sent++;
  }
  return { recipients: sent };
}

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const today = todayIST();
    if (!(await isWorkingDay(today))) {
      return NextResponse.json({ success: true, skipped: "Not a working day", today });
    }
    const mode = new URL(request.url).searchParams.get("mode");
    const result = mode === "digest" ? await digest(today) : await escalate(today);
    const coordination = mode === "digest" ? undefined : await processDueDrawingCoordinationTasksAndSlaAction();
    return NextResponse.json({ success: true, mode: mode || "escalate", today, ...result, coordination });
  } catch (err: any) {
    console.error("[dmac-sla] failed:", err);
    return NextResponse.json({ success: false, error: err?.message || "DMAC SLA job failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
