import { NextResponse } from "next/server";
import { processEmailQueueAsync } from "@/lib/actions/email-queue";

export async function POST(request: Request) {
  try {
    // Just trigger it and return immediately, the background worker will handle it recursively
    processEmailQueueAsync().catch(console.error);
    return NextResponse.json({ message: "Queue processing triggered in the background." });
  } catch (error: any) {
    console.error("[Queue Processor] Fatal Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
