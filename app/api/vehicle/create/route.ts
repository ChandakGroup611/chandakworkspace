import { NextRequest, NextResponse } from "next/server";
import { createVehicleAction } from "@/lib/actions/vehicle";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createVehicleAction(body);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/vehicle/create] error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
