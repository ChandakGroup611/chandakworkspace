/**
 * Runs once when the server starts. On the Node.js server it starts the Chandak Meet job loop
 * (see instrumentation-node.ts and lib/server/meet-scheduler.ts).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
