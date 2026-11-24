import { supabaseAdmin } from "@/lib/supabase/service_role";

/**
 * Runs the Chandak Meet jobs (reminders, update requests, minutes nudges, Outlook sync, room
 * release, overdue tracking) every 10 minutes inside the app server itself.
 *
 * GitHub's scheduled workflows run hours late on this repository (the every-5-minutes keepalive fires every
 * few hours), so they can't carry a "1 hour before" reminder. The GitHub schedule stays as a
 * backup. When several server processes run, a short lock row in meet_activity_log makes sure
 * only one of them runs each round; the jobs themselves never send the same thing twice.
 */

const EVERY_MS = 10 * 60 * 1000;
const LOCK_ID = "00000000-0000-0000-0000-000000000000";

declare global {
  // eslint-disable-next-line no-var
  var __meetSchedulerStarted: boolean | undefined;
}

async function tick() {
  try {
    const since = new Date(Date.now() - 8 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("meet_activity_log")
      .select("id")
      .eq("entity_type", "system")
      .eq("entity_id", LOCK_ID)
      .eq("action", "jobs_tick")
      .gt("created_at", since)
      .limit(1)
      .maybeSingle();
    if (recent) return; // another process (or the GitHub backup) ran this round

    await supabaseAdmin.from("meet_activity_log").insert({ entity_type: "system", entity_id: LOCK_ID, action: "jobs_tick", channel: "system" });
    const { runMeetJobs } = await import("@/workers/meet_jobs");
    const r = await runMeetJobs();
    if (r.errors?.length) console.warn("[meet-scheduler] finished with errors:", r.errors.join(" | "));
  } catch (err) {
    console.error("[meet-scheduler] round failed:", err);
  }
}

export function startMeetScheduler() {
  if (globalThis.__meetSchedulerStarted) return;
  globalThis.__meetSchedulerStarted = true;
  // First round 1–3 minutes after start, spread so several processes don't start together
  const first = 60000 + Math.floor(Math.random() * 120000);
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), EVERY_MS).unref?.();
  }, first).unref?.();
  console.log("[meet-scheduler] Chandak Meet jobs will run every 10 minutes");
}
