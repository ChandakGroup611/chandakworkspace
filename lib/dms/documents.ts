import { supabaseAdmin } from "@/lib/supabase/service_role";
import { isUuid, type DmsRights } from "@/lib/dms/access";
import type { DmsDocumentSummary } from "@/lib/actions/dms-core";

/** Shared by the DMS actions: display names, the document list query and its row shape. */

export async function namesFor(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(isUuid))];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  const { data: people } = await supabaseAdmin.from("user_master").select("id, full_name, email").in("id", unique);
  for (const p of people || []) out.set(p.id, p.full_name || p.email || "");
  return out;
}

export function summarize(row: any, rights: DmsRights | undefined, actorId: string, names: Map<string, string>): DmsDocumentSummary {
  const versions = (Array.isArray(row.dms_document_versions) ? row.dms_document_versions : [row.dms_document_versions]).filter(Boolean);
  const current = versions.find((v: any) => v.version_no === row.current_version_no) || versions.sort((a: any, b: any) => b.version_no - a.version_no)[0] || {};
  const lockRow = Array.isArray(row.dms_document_locks) ? row.dms_document_locks[0] : row.dms_document_locks;
  const lockActive = !!lockRow && new Date(lockRow.expires_at).getTime() > Date.now();
  const type = Array.isArray(row.dms_doc_types) ? row.dms_doc_types[0] : row.dms_doc_types;
  return {
    id: row.id,
    folderId: row.folder_id,
    docTypeId: row.doc_type_id,
    docTypeCode: type?.code || "DOC",
    docTypeName: type?.name || "Document",
    title: row.title,
    originalFileName: row.original_file_name,
    currentVersionNo: row.current_version_no || 1,
    approvalStatus: row.approval_status || "PENDING",
    fileSizeBytes: Number(current.file_size_bytes || 0),
    mimeType: current.mime_type || "application/octet-stream",
    storageKey: "",
    isLocked: lockActive,
    lockedByMe: lockActive && lockRow.locked_by === actorId,
    lockedByName: lockActive ? names.get(lockRow.locked_by) || "someone" : undefined,
    lockExpiresAt: lockActive ? lockRow.expires_at : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: names.get(row.created_by) || undefined,
    isPrivate: Boolean(row.is_private),
    rights,
  };
}

export const DOC_SELECT = `id, folder_id, doc_type_id, title, original_file_name, current_version_no, approval_status, is_private, created_by, created_at, updated_at,
  dms_doc_types ( code, name ),
  dms_document_versions ( version_no, file_size_bytes, mime_type ),
  dms_document_locks ( locked_by, expires_at )`;
