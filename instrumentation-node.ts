/**
 * Node.js-only startup: the Chandak Meet job loop runs every 10 minutes on the production server.
 * Set MEET_INPROCESS_JOBS=false to turn it off.
 */
import { startMeetScheduler } from "./lib/server/meet-scheduler";

if (process.env.NODE_ENV === "production" && String(process.env.MEET_INPROCESS_JOBS || "true").toLowerCase() !== "false") {
  startMeetScheduler();
}
