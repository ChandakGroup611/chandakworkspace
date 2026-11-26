"use server";

import { createHash } from "crypto";
import { safeStorageSegment } from "@/lib/permissions/design-guard";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import {
  dmsActor,
  dmsError,
  documentRights,
  documentRightsMany,
  folderRights,
  hiddenFieldIds,
  isUuid,
  resolveWorkspaceId,
  type DmsActor,
  type DmsRights,
} from "@/lib/dms/access";

/**
 * DMS core: folders, documents, versions, check-out, recycle bin, purge and QC.
 * Every rule (the six permission layers, locks, QC, purge) lives in the database functions of
 * supabase/migrations/20261126120000_dms_core.sql; these actions resolve the person, store files
 * and call those functions. Nothing is kept in server memory.
 */

export type { DmsRights } from "@/lib/dms/access";

export interface DmsFolderPermissionItem {
  id: string;
  folderId: string;
  userId?: string | null;
  groupId?: string | null;
  userEmail?: string;
  userName?: string;
  roleCode?: string | null;
  canView: boolean;
  canUpload: boolean;
  canDownload: boolean;
  canDelete: boolean;
  canManage: boolean;
}

export interface DmsFolderNode {
  id: string;
  workspaceId: string;
  parentId: string | null;
  name: string;
  path: string;
  depth: number;
  approvalRequired: boolean;
  inheritPermissions: boolean;
  documentCount?: number;
  /** false when the folder is shown only because something inside it is visible */
  canOpen?: boolean;
  rights?: DmsRights;
  children?: DmsFolderNode[];
}

export interface DmsDocumentSummary {
  id: string;
  folderId: string;
  docTypeId: string;
  docTypeCode: string;
  docTypeName: string;
  title: string;
  originalFileName: string;
  currentVersionNo: number;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  fileSizeBytes: number;
  mimeType: string;
  /** kept for older callers; files are always served through /api/proxy-attachment */
  storageKey: string;
  isLocked: boolean;
  lockedByMe?: boolean;
  lockedByName?: string;
  lockExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
  rights?: DmsRights;
  fieldValues?: Record<string, any>;
  masterTags?: { tableCode: string; recordKey: string }[];
}

export interface DmsFieldDefinitionItem {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  dataType: "TEXT" | "NUMBER" | "DATE" | "DROPDOWN" | "BOOLEAN";
  isRequired: boolean;
  defaultValue?: string;
  dropdownOptions?: string[];
}

export interface DmsDocTypeItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  fieldDefinitions?: DmsFieldDefinitionItem[];
}

export interface DmsVersionItem {
  id: string;
  versionNo: number;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  changeNote: string | null;
  uploadedByName: string;
  uploadedByMe: boolean;
  createdAt: string;
  qcStatus: string | null;
  qcComment: string | null;
  qcByName: string | null;
}

export interface DmsActivityItem {
  action: string;
  actorEmail: string | null;
  details: Record<string, any>;
  createdAt: string;
}

export interface DmsRecycleItem {
  documentId: string;
  title: string;
  fileName: string;
  folderName: string;
  deletedAt: string;
  deletedByName: string;
  canRestore: boolean;
  canPurge: boolean;
}

export interface DmsQcItem {
  documentId: string;
  title: string;
  folderId: string;
  folderName: string;
  versionNo: number;
  uploadedByName: string;
  uploadedAt: string;
  ownUpload: boolean;
}

type Result<T = {}> = ({ success: true } & T) | { success: false; error: string };

const MAX_FILE_BYTES = 28 * 1024 * 1024; // the server action body limit is 30 MB
const BLOCKED_EXTENSIONS = new Set(["exe", "bat", "cmd", "com", "msi", "js", "vbs", "ps1", "sh", "jar", "scr", "dll", "html", "htm", "svg"]);

// ---------- helpers ----------

async function namesFor(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(isUuid))];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  const { data: people } = await supabaseAdmin.from("user_master").select("id, full_name, email").in("id", unique);
  for (const p of people || []) out.set(p.id, p.full_name || p.email || "");
  return out;
}

function parseStorageKey(key: string | null | undefined): { bucket: string; path: string } | null {
  const m = /^storage:([^:]+):(.+)$/.exec(key || "");
  return m ? { bucket: m[1], path: m[2] } : null;
}

async function storeDmsFile(file: File, workspaceId: string, folderId: string, documentKey: string) {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) throw new Error("Choose a file to upload.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Files must be 28 MB or smaller.");
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) throw new Error(`.${ext} files cannot be stored in the DMS.`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "file";
  const path = `dms/${safeStorageSegment(workspaceId, "ws")}/${safeStorageSegment(folderId, "folder")}/${safeStorageSegment(
    documentKey,
    "doc"
  )}/${Date.now()}_${cleanName}`;
  const mimeType = file.type || "application/octet-stream";
  const { error } = await supabaseAdmin.storage.from("dms-documents").upload(path, buffer, { contentType: mimeType, upsert: false });
  if (error) {
    console.error("[dms] storage upload failed:", error);
    throw new Error("Could not store the file. Please try again.");
  }
  return { storageKey: `storage:dms-documents:${path}`, path, checksum, mimeType, size: file.size, fileName: file.name };
}

async function removeStoredFiles(keys: string[]) {
  const byBucket = new Map<string, string[]>();
  for (const k of keys) {
    const p = parseStorageKey(k);
    if (!p) continue;
    byBucket.set(p.bucket, [...(byBucket.get(p.bucket) || []), p.path]);
  }
  for (const [bucket, paths] of byBucket) {
    const { error } = await supabaseAdmin.storage.from(bucket).remove(paths);
    if (error) console.error(`[dms] could not remove ${paths.length} file(s) from ${bucket}:`, error);
  }
}

function toNode(f: any, counts: Map<string, number>, rights?: DmsRights, canOpen = true): DmsFolderNode {
  const path = String(f.path || "");
  return {
    id: f.id,
    workspaceId: f.workspace_id,
    parentId: f.parent_id,
    name: f.name,
    path,
    depth: Math.max(0, path.split(".").length - 1),
    approvalRequired: !!f.approval_required,
    inheritPermissions: f.inherit_permissions !== false,
    documentCount: counts.get(f.id) || 0,
    canOpen,
    rights,
    children: [],
  };
}

// ---------- folders ----------

export async function fetchFolderTreeAction(workspaceId?: string): Promise<{
  success: boolean;
  folders?: DmsFolderNode[];
  error?: string;
}> {
  try {
    const actor = await dmsActor();
    const wsId = await resolveWorkspaceId(workspaceId);
    if (!wsId) return { success: true, folders: [] };

    const [{ data: folders, error }, { data: rightsRows, error: rErr }, { data: docRows }] = await Promise.all([
      supabaseAdmin
        .from("dms_folders")
        .select("id, workspace_id, parent_id, name, path, approval_required, inherit_permissions")
        .eq("workspace_id", wsId)
        .is("deleted_at", null)
        .order("path", { ascending: true }),
      supabaseAdmin.rpc("fn_dms_folder_rights_all", { p_user: actor.id, p_workspace: wsId, p_base: actor.base }),
      supabaseAdmin.from("dms_documents").select("folder_id").eq("workspace_id", wsId).is("deleted_at", null),
    ]);
    if (error) throw error;
    if (rErr) throw rErr;

    const rights = new Map<string, DmsRights>(((rightsRows as any[]) || []).map((r) => [r.folder_id, r.rights]));
    const counts = new Map<string, number>();
    for (const d of docRows || []) counts.set(d.folder_id, (counts.get(d.folder_id) || 0) + 1);

    // Show folders the person can open, plus the parents needed to reach them
    const byId = new Map((folders || []).map((f: any) => [f.id, f]));
    const shown = new Set<string>();
    for (const f of folders || []) {
      if (!rights.get(f.id)?.view) continue;
      let cur: any = f;
      while (cur && !shown.has(cur.id)) {
        shown.add(cur.id);
        cur = cur.parent_id ? byId.get(cur.parent_id) : null;
      }
    }

    const nodes = new Map<string, DmsFolderNode>();
    for (const f of folders || []) {
      if (!shown.has(f.id)) continue;
      const r = rights.get(f.id);
      // Document counts only for folders the person can open
      nodes.set(f.id, toNode(f, r?.view ? counts : new Map(), r, !!r?.view));
    }
    const tree: DmsFolderNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.parentId ? nodes.get(node.parentId) : null;
      if (parent) parent.children!.push(node);
      else tree.push(node);
    }
    return { success: true, folders: tree };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load folders."), folders: [] };
  }
}

export async function createFolderAction(params: {
  workspaceId: string;
  parentId?: string;
  name: string;
  approvalRequired?: boolean;
}): Promise<{ success: boolean; folder?: DmsFolderNode; error?: string }> {
  try {
    const actor = await dmsActor();
    let parentId = params.parentId;
    if (!isUuid(parentId)) {
      const wsId = await resolveWorkspaceId(params.workspaceId);
      const { data: root } = await supabaseAdmin
        .from("dms_folders")
        .select("id")
        .eq("workspace_id", wsId)
        .is("parent_id", null)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      parentId = root?.id;
    }
    if (!parentId) return { success: false, error: "Choose the parent folder." };

    const { data: id, error } = await supabaseAdmin.rpc("fn_dms_create_folder", {
      p_actor: actor.id,
      p_base: actor.base,
      p_parent: parentId,
      p_name: params.name,
      p_approval_required: params.approvalRequired ?? true,
    });
    if (error) throw error;
    const { data: f } = await supabaseAdmin
      .from("dms_folders")
      .select("id, workspace_id, parent_id, name, path, approval_required, inherit_permissions")
      .eq("id", id)
      .single();
    return { success: true, folder: toNode(f, new Map(), await folderRights(actor, id as string)) };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not create the folder.") };
  }
}

export async function updateFolderAction(params: { folderId: string; name?: string; approvalRequired?: boolean }): Promise<Result> {
  try {
    const actor = await dmsActor();
    const { error } = await supabaseAdmin.rpc("fn_dms_update_folder", {
      p_actor: actor.id,
      p_base: actor.base,
      p_folder: params.folderId,
      p_name: params.name ?? null,
      p_approval_required: params.approvalRequired ?? null,
    });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not update the folder.") };
  }
}

export async function deleteFolderAction(folderId: string): Promise<Result> {
  try {
    const actor = await dmsActor();
    const { error } = await supabaseAdmin.rpc("fn_dms_delete_folder", { p_actor: actor.id, p_base: actor.base, p_folder: folderId });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not delete the folder.") };
  }
}

// ---------- documents ----------

function summarize(row: any, rights: DmsRights | undefined, actorId: string, names: Map<string, string>): DmsDocumentSummary {
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
    rights,
  };
}

const DOC_SELECT = `id, folder_id, doc_type_id, title, original_file_name, current_version_no, approval_status, created_by, created_at, updated_at,
  dms_doc_types ( code, name ),
  dms_document_versions ( version_no, file_size_bytes, mime_type ),
  dms_document_locks ( locked_by, expires_at )`;

export async function fetchFolderDocumentsAction(params: {
  folderId: string;
  limit?: number;
  offset?: number;
  searchQuery?: string;
  docTypeId?: string;
  statusFilter?: string;
}): Promise<{
  success: boolean;
  documents?: DmsDocumentSummary[];
  totalCount?: number;
  folderRights?: DmsRights;
  error?: string;
}> {
  try {
    const actor = await dmsActor();
    if (!isUuid(params.folderId)) return { success: true, documents: [], totalCount: 0 };
    const fr = await folderRights(actor, params.folderId);
    if (!fr.view) return { success: false, error: "You don't have access to this folder.", documents: [] };

    const limit = Math.min(Math.max(params.limit || 50, 1), 200);
    const offset = Math.max(params.offset || 0, 0);
    let query = supabaseAdmin
      .from("dms_documents")
      .select(DOC_SELECT)
      .eq("folder_id", params.folderId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (isUuid(params.docTypeId)) query = query.eq("doc_type_id", params.docTypeId);
    if (params.statusFilter && ["PENDING", "APPROVED", "REJECTED"].includes(params.statusFilter)) {
      query = query.eq("approval_status", params.statusFilter);
    }
    const q = (params.searchQuery || "").trim().replace(/[%_,()*\\]/g, " ").trim();
    if (q) query = query.or(`title.ilike.%${q}%,original_file_name.ilike.%${q}%`);

    // Rights are per document (type, private view, QC), so filter a generous window then page
    const { data: rows, error } = await query.range(0, 999);
    if (error) throw error;
    const rights = await documentRightsMany(actor, (rows || []).map((r: any) => r.id));
    const visible = (rows || []).filter((r: any) => rights.get(r.id)?.view);
    const page = visible.slice(offset, offset + limit);

    const names = await namesFor(
      page.flatMap((r: any) => {
        const l = Array.isArray(r.dms_document_locks) ? r.dms_document_locks[0] : r.dms_document_locks;
        return [r.created_by, l?.locked_by];
      })
    );
    return {
      success: true,
      documents: page.map((r: any) => summarize(r, rights.get(r.id), actor.id, names)),
      totalCount: visible.length,
      folderRights: fr,
    };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load documents."), documents: [] };
  }
}

export async function fetchDocumentDetailAction(documentId: string): Promise<
  Result<{
    document: DmsDocumentSummary;
    versions: DmsVersionItem[];
    fields: { id: string; label: string; value: string }[];
    activity: DmsActivityItem[];
    folderName: string;
  }>
> {
  try {
    const actor = await dmsActor();
    if (!isUuid(documentId)) return { success: false, error: "Document not found." };
    const rights = await documentRights(actor, documentId);
    if (!rights.view) return { success: false, error: "You don't have access to this document." };

    const { data: row, error } = await supabaseAdmin.from("dms_documents").select(`${DOC_SELECT}, workspace_id`).eq("id", documentId).single();
    if (error) throw error;

    const [{ data: versions }, { data: qc }, { data: values }, { data: activity }, { data: folder }, hidden] = await Promise.all([
      supabaseAdmin
        .from("dms_document_versions")
        .select("id, version_no, file_name, file_size_bytes, mime_type, change_note, uploaded_by, created_at")
        .eq("document_id", documentId)
        .order("version_no", { ascending: false }),
      supabaseAdmin.from("dms_qc_approvals").select("version_no, status, decision_comment, decided_by").eq("document_id", documentId),
      supabaseAdmin
        .from("dms_field_values")
        .select("field_definition_id, text_value, number_value, date_value, json_value, dms_field_definitions ( field_label )")
        .eq("document_id", documentId),
      supabaseAdmin
        .from("dms_audit_logs")
        .select("action, actor_email, details, created_at")
        .eq("entity_type", "DOCUMENT")
        .eq("entity_id", documentId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin.from("dms_folders").select("name").eq("id", row.folder_id).maybeSingle(),
      hiddenFieldIds(actor, row.workspace_id),
    ]);

    const qcByVersion = new Map((qc || []).map((q: any) => [q.version_no, q]));
    const lockRow = Array.isArray(row.dms_document_locks) ? row.dms_document_locks[0] : row.dms_document_locks;
    const names = await namesFor([
      row.created_by,
      lockRow?.locked_by,
      ...(versions || []).map((v: any) => v.uploaded_by),
      ...(qc || []).map((q: any) => q.decided_by),
    ]);

    return {
      success: true,
      document: summarize(row, rights, actor.id, names),
      folderName: folder?.name || "",
      versions: (versions || []).map((v: any) => {
        const q: any = qcByVersion.get(v.version_no);
        return {
          id: v.id,
          versionNo: v.version_no,
          fileName: v.file_name,
          fileSizeBytes: Number(v.file_size_bytes || 0),
          mimeType: v.mime_type,
          changeNote: v.change_note,
          uploadedByName: names.get(v.uploaded_by) || "",
          uploadedByMe: v.uploaded_by === actor.id,
          createdAt: v.created_at,
          qcStatus: q?.status || null,
          qcComment: q?.decision_comment || null,
          qcByName: q?.decided_by ? names.get(q.decided_by) || null : null,
        };
      }),
      fields: (values || [])
        .filter((v: any) => !hidden.has(v.field_definition_id))
        .map((v: any) => {
          const def = Array.isArray(v.dms_field_definitions) ? v.dms_field_definitions[0] : v.dms_field_definitions;
          const value =
            v.text_value ?? (v.number_value !== null ? String(v.number_value) : null) ?? v.date_value ?? (v.json_value !== null ? (v.json_value ? "Yes" : "No") : "");
          return { id: v.field_definition_id, label: def?.field_label || "Field", value: String(value ?? "") };
        }),
      activity: (activity || []).map((a: any) => ({ action: a.action, actorEmail: a.actor_email, details: a.details || {}, createdAt: a.created_at })),
    };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load the document.") };
  }
}

export async function fetchDocTypesAndFieldsAction(workspaceId?: string): Promise<{
  success: boolean;
  docTypes?: DmsDocTypeItem[];
  error?: string;
}> {
  try {
    const actor = await dmsActor();
    const wsId = await resolveWorkspaceId(workspaceId);
    const [{ data: types, error }, { data: fields }, hidden] = await Promise.all([
      supabaseAdmin.from("dms_doc_types").select("id, code, name, description").eq("is_active", true).is("deleted_at", null).order("name"),
      supabaseAdmin
        .from("dms_field_definitions")
        .select("id, field_key, field_label, data_type, is_required, default_value, dropdown_options")
        .is("deleted_at", null)
        .order("field_label"),
      wsId ? hiddenFieldIds(actor, wsId) : Promise.resolve(new Set<string>()),
    ]);
    if (error) throw error;
    const defs: DmsFieldDefinitionItem[] = (fields || [])
      .filter((f: any) => !hidden.has(f.id))
      .map((f: any) => ({
        id: f.id,
        fieldKey: f.field_key,
        fieldLabel: f.field_label,
        dataType: String(f.data_type || "TEXT").toUpperCase() as DmsFieldDefinitionItem["dataType"],
        isRequired: !!f.is_required,
        defaultValue: f.default_value || undefined,
        dropdownOptions: Array.isArray(f.dropdown_options) ? f.dropdown_options : [],
      }));
    return {
      success: true,
      docTypes: (types || []).map((t: any) => ({ id: t.id, code: t.code, name: t.name, description: t.description, fieldDefinitions: defs })),
    };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load document types."), docTypes: [] };
  }
}

export async function createDocTypeAction(params: {
  name: string;
  code?: string;
  description?: string;
  workspaceId?: string;
}): Promise<{ success: boolean; docType?: DmsDocTypeItem; error?: string }> {
  try {
    const actor = await dmsActor();
    if (!actor.base.masters) return { success: false, error: "Your Design access doesn't allow you to manage Design masters." };
    const name = params.name.trim();
    if (!name) return { success: false, error: "Document type name is required." };
    const code = (params.code?.trim() || name).toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32);
    if (!code) return { success: false, error: "Give the document type a code using letters or numbers." };
    const { data, error } = await supabaseAdmin
      .from("dms_doc_types")
      .insert({ name, code, description: params.description?.trim() || null, is_active: true })
      .select("id, code, name, description")
      .single();
    if (error) {
      if (error.code === "23505") return { success: false, error: `A document type with code ${code} already exists.` };
      throw error;
    }
    await supabaseAdmin.rpc("fn_dms_audit", {
      p_actor: actor.id,
      p_action: "DOC_TYPE_CREATED",
      p_entity_type: "DOC_TYPE",
      p_entity_id: data.id,
      p_details: { code, name },
    });
    return { success: true, docType: { ...data, fieldDefinitions: [] } };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not create the document type.") };
  }
}

/**
 * Upload a file and index it as a new document in one step, so the stored file and the record
 * can't drift apart (and nobody can point a record at a file they didn't upload).
 * FormData: file, folderId, docTypeId, title, fieldValues (JSON, keyed by field definition id),
 * masterRecordIds (JSON array, optional), ocrText (optional).
 */
export async function addDmsDocumentAction(formData: FormData): Promise<Result<{ documentId: string; approvalStatus: string }>> {
  let storedKey: string | null = null;
  try {
    const actor = await dmsActor();
    const folderId = String(formData.get("folderId") || "");
    const docTypeId = String(formData.get("docTypeId") || "");
    if (!isUuid(folderId)) return { success: false, error: "Choose a folder." };
    if (!isUuid(docTypeId)) return { success: false, error: "Choose a document type." };

    const fr = await folderRights(actor, folderId);
    if (!fr.upload) return { success: false, error: "You cannot add documents to this folder." };
    const { data: folder } = await supabaseAdmin.from("dms_folders").select("workspace_id").eq("id", folderId).single();

    let fieldValues: Record<string, unknown> = {};
    let masterRecordIds: string[] = [];
    try {
      fieldValues = JSON.parse(String(formData.get("fieldValues") || "{}")) || {};
      masterRecordIds = (JSON.parse(String(formData.get("masterRecordIds") || "[]")) || []).filter(isUuid);
    } catch {
      return { success: false, error: "The index fields could not be read." };
    }

    const file = formData.get("file") as File | null;
    const stored = await storeDmsFile(file as File, folder!.workspace_id, folderId, `new-${Date.now()}`);
    storedKey = stored.storageKey;

    const { data: documentId, error } = await supabaseAdmin.rpc("fn_dms_create_document", {
      p_actor: actor.id,
      p_base: actor.base,
      p_folder: folderId,
      p_doc_type: docTypeId,
      p_title: String(formData.get("title") || ""),
      p_storage_key: stored.storageKey,
      p_file_name: stored.fileName,
      p_size: stored.size,
      p_checksum: stored.checksum,
      p_mime: stored.mimeType,
      p_ocr_text: String(formData.get("ocrText") || "") || null,
      p_field_values: fieldValues,
      p_master_record_ids: masterRecordIds,
    });
    if (error) throw error;
    storedKey = null;
    const { data: doc } = await supabaseAdmin.from("dms_documents").select("approval_status").eq("id", documentId).single();
    return { success: true, documentId: documentId as string, approvalStatus: doc?.approval_status || "PENDING" };
  } catch (err: any) {
    if (storedKey) await removeStoredFiles([storedKey]);
    return { success: false, error: dmsError(err, "Could not add the document.") };
  }
}

export async function updateDocumentAction(params: { documentId: string; title?: string; fieldValues?: Record<string, unknown> }): Promise<Result> {
  try {
    const actor = await dmsActor();
    const { error } = await supabaseAdmin.rpc("fn_dms_update_document", {
      p_actor: actor.id,
      p_base: actor.base,
      p_document: params.documentId,
      p_title: params.title ?? null,
      p_field_values: params.fieldValues ?? null,
    });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not save the document.") };
  }
}

/** Check out (LOCK) or release (UNLOCK) a document. */
export async function lockUnlockDocumentAction(params: {
  documentId: string;
  action: "LOCK" | "UNLOCK";
  durationHours?: number;
}): Promise<{ success: boolean; error?: string; lockedUntil?: string }> {
  try {
    const actor = await dmsActor();
    if (params.action === "LOCK") {
      const { data, error } = await supabaseAdmin.rpc("fn_dms_checkout", {
        p_actor: actor.id,
        p_base: actor.base,
        p_document: params.documentId,
        p_hours: params.durationHours || 8,
      });
      if (error) throw error;
      return { success: true, lockedUntil: data as string };
    }
    const { error } = await supabaseAdmin.rpc("fn_dms_release_lock", { p_actor: actor.id, p_base: actor.base, p_document: params.documentId });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not change the check-out.") };
  }
}

/** Check in a new version. FormData: documentId, file, changeNote. */
export async function uploadDocumentVersionAction(formData: FormData): Promise<Result<{ versionNo: number }>> {
  let storedKey: string | null = null;
  try {
    const actor = await dmsActor();
    const documentId = String(formData.get("documentId") || "");
    if (!isUuid(documentId)) return { success: false, error: "Document not found." };
    const changeNote = String(formData.get("changeNote") || "").trim();
    if (!changeNote) return { success: false, error: "Say what changed in this version." };
    const rights = await documentRights(actor, documentId);
    if (!rights.edit && !rights.upload) return { success: false, error: "You cannot add a version to this document." };

    const { data: doc } = await supabaseAdmin.from("dms_documents").select("workspace_id, folder_id").eq("id", documentId).single();
    const stored = await storeDmsFile(formData.get("file") as File, doc!.workspace_id, doc!.folder_id, documentId);
    storedKey = stored.storageKey;
    const { data: versionNo, error } = await supabaseAdmin.rpc("fn_dms_add_version", {
      p_actor: actor.id,
      p_base: actor.base,
      p_document: documentId,
      p_storage_key: stored.storageKey,
      p_file_name: stored.fileName,
      p_size: stored.size,
      p_checksum: stored.checksum,
      p_mime: stored.mimeType,
      p_change_note: changeNote,
      p_ocr_text: null,
    });
    if (error) throw error;
    storedKey = null;
    return { success: true, versionNo: versionNo as number };
  } catch (err: any) {
    if (storedKey) await removeStoredFiles([storedKey]);
    return { success: false, error: dmsError(err, "Could not upload the new version.") };
  }
}

// ---------- recycle bin ----------

export async function deleteDocumentAction(documentId: string): Promise<Result> {
  try {
    const actor = await dmsActor();
    const { error } = await supabaseAdmin.rpc("fn_dms_delete_document", { p_actor: actor.id, p_base: actor.base, p_document: documentId });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not delete the document.") };
  }
}

export async function fetchRecycleBinAction(workspaceId?: string): Promise<Result<{ items: DmsRecycleItem[] }>> {
  try {
    const actor = await dmsActor();
    const wsId = await resolveWorkspaceId(workspaceId);
    if (!wsId) return { success: true, items: [] };
    const { data: rows, error } = await supabaseAdmin
      .from("dms_documents")
      .select("id, title, original_file_name, folder_id, deleted_at, deleted_by, dms_folders ( name )")
      .eq("workspace_id", wsId)
      .not("deleted_at", "is", null)
      .is("purged_at", null)
      .order("deleted_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    const rights = await documentRightsMany(actor, (rows || []).map((r: any) => r.id));
    const visible = (rows || []).filter((r: any) => rights.get(r.id)?.restore || rights.get(r.id)?.purge);
    const names = await namesFor(visible.map((r: any) => r.deleted_by));
    return {
      success: true,
      items: visible.map((r: any) => {
        const f = Array.isArray(r.dms_folders) ? r.dms_folders[0] : r.dms_folders;
        return {
          documentId: r.id,
          title: r.title,
          fileName: r.original_file_name,
          folderName: f?.name || "",
          deletedAt: r.deleted_at,
          deletedByName: names.get(r.deleted_by) || "",
          canRestore: !!rights.get(r.id)?.restore,
          canPurge: !!rights.get(r.id)?.purge,
        };
      }),
    };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load the recycle bin.") };
  }
}

export async function restoreDocumentAction(documentId: string): Promise<Result> {
  try {
    const actor = await dmsActor();
    const { error } = await supabaseAdmin.rpc("fn_dms_restore_document", { p_actor: actor.id, p_base: actor.base, p_document: documentId });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not restore the document.") };
  }
}

export async function purgeDocumentAction(documentId: string, reason: string): Promise<Result> {
  try {
    const actor = await dmsActor();
    const { data: keys, error } = await supabaseAdmin.rpc("fn_dms_purge_document", {
      p_actor: actor.id,
      p_base: actor.base,
      p_document: documentId,
      p_reason: reason,
    });
    if (error) throw error;
    await removeStoredFiles((keys as string[]) || []);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not purge the document.") };
  }
}

// ---------- QC ----------

export async function fetchQcQueueAction(workspaceId?: string): Promise<Result<{ items: DmsQcItem[] }>> {
  try {
    const actor = await dmsActor();
    if (!actor.base.qc) return { success: true, items: [] };
    const wsId = await resolveWorkspaceId(workspaceId);
    const { data: rows, error } = await supabaseAdmin
      .from("dms_documents")
      .select("id, title, folder_id, current_version_no, workspace_id, dms_folders ( name )")
      .eq("workspace_id", wsId)
      .eq("approval_status", "PENDING")
      .is("deleted_at", null)
      .order("updated_at", { ascending: true })
      .limit(500);
    if (error) throw error;
    const rights = await documentRightsMany(actor, (rows || []).map((r: any) => r.id));
    const mine = (rows || []).filter((r: any) => rights.get(r.id)?.qc);
    const { data: versions } = await supabaseAdmin
      .from("dms_document_versions")
      .select("document_id, version_no, uploaded_by, created_at")
      .in("document_id", mine.map((r: any) => r.id).concat(["00000000-0000-0000-0000-000000000000"]));
    const current = new Map(
      (versions || [])
        .filter((v: any) => mine.some((r: any) => r.id === v.document_id && r.current_version_no === v.version_no))
        .map((v: any) => [v.document_id, v])
    );
    const names = await namesFor([...current.values()].map((v: any) => v.uploaded_by));
    return {
      success: true,
      items: mine.map((r: any) => {
        const v: any = current.get(r.id);
        const f = Array.isArray(r.dms_folders) ? r.dms_folders[0] : r.dms_folders;
        return {
          documentId: r.id,
          title: r.title,
          folderId: r.folder_id,
          folderName: f?.name || "",
          versionNo: r.current_version_no,
          uploadedByName: names.get(v?.uploaded_by) || "",
          uploadedAt: v?.created_at || "",
          ownUpload: v?.uploaded_by === actor.id,
        };
      }),
    };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load the QC queue.") };
  }
}

export async function submitQcDecisionAction(params: {
  documentId: string;
  versionNo: number;
  status: "APPROVED" | "REJECTED";
  decisionComment?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await dmsActor();
    const { error } = await supabaseAdmin.rpc("fn_dms_qc_decide", {
      p_actor: actor.id,
      p_base: actor.base,
      p_document: params.documentId,
      p_version: params.versionNo,
      p_status: params.status,
      p_comment: params.decisionComment || null,
    });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not record the QC decision.") };
  }
}

// ---------- folder access ----------

export async function fetchFolderPermissionsAction(folderId: string): Promise<{
  success: boolean;
  inheritPermissions?: boolean;
  canManage?: boolean;
  permissions?: DmsFolderPermissionItem[];
  groups?: { id: string; name: string }[];
  error?: string;
}> {
  try {
    const actor = await dmsActor();
    if (!isUuid(folderId)) return { success: false, error: "Folder not found." };
    const fr = await folderRights(actor, folderId);
    if (!fr.view) return { success: false, error: "You don't have access to this folder." };
    const [{ data: folder }, { data: perms, error }] = await Promise.all([
      supabaseAdmin.from("dms_folders").select("inherit_permissions, workspace_id").eq("id", folderId).single(),
      supabaseAdmin.from("dms_folder_permissions").select("*").eq("folder_id", folderId).order("created_at", { ascending: true }),
    ]);
    if (error) throw error;
    const { data: groups } = await supabaseAdmin
      .from("dms_groups")
      .select("id, name")
      .eq("workspace_id", folder?.workspace_id)
      .is("deleted_at", null)
      .order("name");
    return {
      success: true,
      inheritPermissions: folder?.inherit_permissions !== false,
      canManage: !!(fr.admin || fr.manage),
      groups: groups || [],
      permissions: (perms || []).map((p: any) => ({
        id: p.id,
        folderId: p.folder_id,
        userId: p.user_id,
        groupId: p.group_id,
        userEmail: p.user_email || undefined,
        userName: p.user_name || undefined,
        roleCode: p.role_code,
        canView: !!p.can_view,
        canUpload: !!p.can_upload,
        canDownload: !!p.can_download,
        canDelete: !!p.can_delete,
        canManage: !!p.can_manage,
      })),
    };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load folder access.") };
  }
}

export async function saveFolderPermissionsAction(params: {
  folderId: string;
  inheritPermissions: boolean;
  permissions: Array<{
    id?: string;
    userId?: string | null;
    groupId?: string | null;
    userEmail?: string;
    userName?: string;
    roleCode?: string | null;
    canView: boolean;
    canUpload: boolean;
    canDownload: boolean;
    canDelete: boolean;
    canManage: boolean;
  }>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await dmsActor();
    const grants = (params.permissions || []).map((p) => ({
      user_id: isUuid(p.userId) ? p.userId : null,
      group_id: isUuid(p.groupId) ? p.groupId : null,
      user_email: p.userEmail || null,
      user_name: p.userName || null,
      // A role row only applies when it names no person or group
      role_code: !isUuid(p.userId) && !isUuid(p.groupId) && !p.userEmail ? p.roleCode || null : null,
      can_view: !!p.canView,
      can_upload: !!p.canUpload,
      can_download: !!p.canDownload,
      can_delete: !!p.canDelete,
      can_manage: !!p.canManage,
    }));
    const { error } = await supabaseAdmin.rpc("fn_dms_set_folder_permissions", {
      p_actor: actor.id,
      p_base: actor.base,
      p_folder: params.folderId,
      p_inherit: params.inheritPermissions,
      p_grants: grants,
    });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not save folder access.") };
  }
}
