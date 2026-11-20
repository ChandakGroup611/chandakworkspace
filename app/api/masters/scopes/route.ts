import { NextResponse } from "next/server";
import { fetchScopes } from "@/lib/actions/masters";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const scopes = await fetchScopes();
    return NextResponse.json(scopes || []);
  } catch (err: any) {
    console.error("[api/masters/scopes] Error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
