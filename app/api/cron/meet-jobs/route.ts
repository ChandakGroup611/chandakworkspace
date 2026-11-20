import { NextResponse } from "next/server";
import { runMeetJobs } from "@/workers/meet_jobs";

export const dynamic = "force-dynamic";

function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
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
