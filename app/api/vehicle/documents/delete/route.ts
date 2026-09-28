import { NextRequest, NextResponse } from "next/server";
import { deleteVehicleDocumentAction } from "@/lib/actions/vehicle";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "Document ID is required" },
        { status: 400 }
      );
    }

    const result = await deleteVehicleDocumentAction(documentId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/vehicle/documents/delete] error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to delete vehicle document" },
      { status: 500 }
    );
  }
}
