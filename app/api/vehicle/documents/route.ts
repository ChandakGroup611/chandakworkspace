import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";

export const dynamic = "force-dynamic";

function resolveMimeFromName(fileName?: string | null): string {
  if (!fileName) return "application/pdf";
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "docx":
    case "doc": return "application/msword";
    case "xlsx":
    case "xls": return "application/vnd.ms-excel";
    case "csv": return "text/csv";
    default: return "application/octet-stream";
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await getCachedUser();
    if (!user) {
      return NextResponse.json({ success: false, documents: [], error: "Unauthenticated" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const vehicleId = searchParams.get("vehicleId");

    let query = supabaseAdmin
      .from("vehicle_documents")
      .select("id, vehicle_id, doc_type, title, file_name, file_size, uploaded_at, expiry_date, status, document_number, file_url")
      .order("uploaded_at", { ascending: false });

    if (vehicleId && vehicleId !== "ALL") {
      query = query.eq("vehicle_id", vehicleId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[api-vehicle-documents] Query error:", error);
      return NextResponse.json({ success: false, documents: [], error: error.message }, { status: 500 });
    }

    const documents = (data || []).map((d: any) => ({
      ...d,
      file_url: d.file_url || "",
      has_file: Boolean(d.file_url),
      file_type: resolveMimeFromName(d.file_name)
    }));

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length
    });
  } catch (err: any) {
    console.error("[api-vehicle-documents] Exception:", err);
    return NextResponse.json({ success: false, documents: [], error: err.message }, { status: 500 });
  }
}
