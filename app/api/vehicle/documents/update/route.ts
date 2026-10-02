import { NextRequest, NextResponse } from "next/server";
import { updateVehicleDocumentAction } from "@/lib/actions/vehicle";
import { getCachedUser } from "@/lib/auth/cached-user";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user } = await getCachedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { documentId, updates } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "Document ID is required" },
        { status: 400 }
      );
    }

    if (!updates) {
      return NextResponse.json(
        { success: false, error: "Updates payload is required" },
        { status: 400 }
      );
    }

    const result = await updateVehicleDocumentAction(documentId, updates);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/vehicle/documents/update] error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update vehicle document" },
      { status: 500 }
    );
  }
}
