import { NextRequest, NextResponse } from "next/server";
import { fetchVehiclePortalDetailsAction } from "@/lib/actions/vehicle";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const plate = searchParams.get("plate") || searchParams.get("plateNumber") || "";

    if (!plate || !plate.trim()) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid vehicle registration number" },
        { status: 400 }
      );
    }

    const result = await fetchVehiclePortalDetailsAction(plate);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/vehicle/lookup] error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to lookup vehicle details" },
      { status: 500 }
    );
  }
}
