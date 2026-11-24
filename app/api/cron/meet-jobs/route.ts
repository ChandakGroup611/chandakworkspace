import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { runMeetJobs } from "@/workers/meet_jobs";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Two ways in:
 *  1. `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set on the server.
 *  2. The GitHub schedule (.github/workflows/meet-jobs.yml): `X-Cron-Timestamp` (unix seconds) and
 *     `X-Cron-Signature` = hex HMAC-SHA256 of "meet-jobs:<timestamp>" keyed with the service role key,
 *     which both GitHub and the server already hold. The key itself is never sent, and a signature
 *     is only accepted within 5 minutes of its timestamp.
 */
function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader && safeEqual(authHeader, `Bearer ${cronSecret}`)) return true;

  const ts = request.headers.get("x-cron-timestamp") || "";
  const sig = (request.headers.get("x-cron-signature") || "").toLowerCase();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !/^\d{9,11}$/.test(ts) || !/^[0-9a-f]{64}$/.test(sig)) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const expected = createHmac("sha256", key).update(`meet-jobs:${ts}`).digest("hex");
  return safeEqual(sig, expected);
}

async function handle(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: missing or invalid authorization header" },
      { status: 401 }
    );
  }
  const result = await runMeetJobs();
  return NextResponse.json({ success: result.errors.length === 0, ...result });
}

export const GET = handle;
export const POST = handle;
