/**
 * Runs once when the server starts. Starts the Chandak Meet job loop (see lib/server/meet-scheduler.ts)
 * on the production Node.js server only. Set MEET_INPROCESS_JOBS=false to turn it off.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  if (String(process.env.MEET_INPROCESS_JOBS || "true").toLowerCase() === "false") return;
  const { startMeetScheduler } = await import("./lib/server/meet-scheduler");
  startMeetScheduler();
}
