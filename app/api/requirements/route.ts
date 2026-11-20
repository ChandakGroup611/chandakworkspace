import { NextRequest, NextResponse } from "next/server";
import { fetchRequirements } from "@/lib/actions/requirements";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const data = await fetchRequirements(workspaceId);
    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("[api/requirements] Error fetching requirements:", err);
    return NextResponse.json([], { status: 200 });
  }
}
