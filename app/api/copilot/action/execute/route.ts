import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { executeActionProposal } from "@/lib/copilot/actions/proposal-engine";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // 1. Server Kill-Switch Check
    const copilotEnabled = process.env.COPILOT_ENABLED === "true";
    if (!copilotEnabled) {
      return NextResponse.json(
        { error: "SERVICE_UNAVAILABLE", message: "Chandak AI Copilot is currently offline." },
        { status: 503 }
      );
    }

    // 2. Authenticate User Session
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "You must be signed in to execute Copilot actions." },
        { status: 401 }
      );
    }

    // 3. Parse Request Payload
    const body = await req.json();
    const { proposalId } = body;

    if (!proposalId || typeof proposalId !== "string") {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "A valid proposalId is required." },
        { status: 400 }
      );
    }

    // 4. Execute Proposal via Atomic Engine
    const result = await executeActionProposal(proposalId, user.id, user.email || "");

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("Action Execute Route Error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err?.message || "Failed to process action request." },
      { status: 500 }
    );
  }
}
