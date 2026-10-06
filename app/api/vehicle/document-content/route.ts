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
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json({ success: false, error: "Document ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("vehicle_documents")
      .select("id, vehicle_id, doc_type, title, file_name, file_size, uploaded_at, expiry_date, status, document_number, file_url")
      .eq("id", documentId)
      .maybeSingle();

    let docData = data;
    if (!docData) {
      // Check service_records
      const { data: srvRecords } = await supabaseAdmin
        .from("service_records")
        .select("id, vehicle_id, parts_replaced")
        .not("parts_replaced", "is", null);

      if (srvRecords) {
        for (const sr of srvRecords) {
          const atts = sr.parts_replaced?.attachments;
          if (Array.isArray(atts)) {
            const match = atts.find((a: any) => a.id === documentId || a.file_name === documentId);
            if (match) {
              docData = {
                id: match.id || documentId,
                vehicle_id: sr.vehicle_id,
                doc_type: "SERVICE_INVOICE",
                title: match.file_name || "Service Invoice",
                file_name: match.file_name || "service_document.pdf",
                file_size: match.file_size,
                uploaded_at: match.uploaded_at,
                expiry_date: null,
                status: "VALID",
                document_number: sr.parts_replaced?.invoice_number || null,
                file_url: match.file_url || ""
              };
              break;
            }
          }
        }
      }
    }

    if (!docData) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      document: {
        ...docData,
        has_file: Boolean(docData.file_url),
        file_type: resolveMimeFromName(docData.file_name)
      },
      file_url: docData.file_url || ""
    });
  } catch (err: any) {
    console.error("[api-vehicle-document-content] Exception:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
