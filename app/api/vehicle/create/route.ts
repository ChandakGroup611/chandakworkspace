import { NextRequest, NextResponse } from "next/server";
import { createVehicleAction, getAuthenticatedUser, canUserManageVehicles } from "@/lib/actions/vehicle";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: authentication required" },
        { status: 401 }
      );
    }

    const canCreate = (await hasPermission(user.id, "VEHICLES_CREATE")) || 
                      (await hasPermission(user.id, "VEHICLES_MANAGE")) || 
                      (await canUserManageVehicles(user.id));
    if (!canCreate) {
      return NextResponse.json(
        { success: false, error: "Forbidden: insufficient permissions to create vehicles" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = await createVehicleAction(body);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/vehicle/create] error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to create vehicle" },
      { status: 500 }
    );
  }
}
