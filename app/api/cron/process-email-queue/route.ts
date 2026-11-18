import { NextResponse } from "next/server";
import { processEmailQueueAsync } from "@/lib/actions/email-queue";

export const dynamic = "force-dynamic";

function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: missing or invalid authorization header" },
      { status: 401 }
    );
  }

  try {
    // Just trigger it and return immediately, the background worker will handle it recursively
    processEmailQueueAsync().catch(console.error);
    return NextResponse.json({ message: "Queue processing triggered in the background." });
  } catch (error: any) {
    console.error("[Queue Processor] Fatal Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
