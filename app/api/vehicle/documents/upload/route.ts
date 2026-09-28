import { NextRequest, NextResponse } from "next/server";
import { createVehicleDocumentAction } from "@/lib/actions/vehicle";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { vehicleId, doc } = body;

    if (!vehicleId) {
      return NextResponse.json(
        { success: false, error: "Vehicle ID is required" },
        { status: 400 }
      );
    }

    if (!doc || !doc.file_name || !doc.file_url) {
      return NextResponse.json(
        { success: false, error: "File name and file content are required" },
        { status: 400 }
      );
    }

    const result = await createVehicleDocumentAction(vehicleId, doc);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/vehicle/documents/upload] error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to upload vehicle document" },
      { status: 500 }
    );
  }
}
