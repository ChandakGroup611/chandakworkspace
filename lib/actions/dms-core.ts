"use server";

import { createHash } from "crypto";
import { PDFDocument } from "pdf-lib";
import { safeStorageSegment } from "@/lib/permissions/design-guard";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { readDmsShareSettings, type DmsShareSettings } from "@/lib/actions/dms-groups";
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
import { DOC_SELECT, namesFor, summarize } from "@/lib/dms/documents";

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
  departmentId?: string | null;
  departmentName?: string;
  userEmail?: string;
  userName?: string;
  roleCode?: string | null;
  canView: boolean;
  canUpload: boolean;
  canDownload: boolean;
  canDelete: boolean;
  canManage: boolean;
}

export interface DmsFolderRenamePattern {
  separator?: "_" | "-" | ".";
  parts?: string[];
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
  renamePattern?: DmsFolderRenamePattern | null;
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
  isPrivate?: boolean;
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

function parseStorageKey(key: string | null | undefined): { bucket: string; path: string } | null {
  const m = /^storage:([^:]+):(.+)$/.exec(key || "");
  return m ? { bucket: m[1], path: m[2] } : null;
}

async function storeDmsBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  workspaceId: string,
  folderId: string,
  documentKey: string
) {
  if (!buffer || buffer.length === 0) throw new Error("Choose a file to upload.");
  if (buffer.length > MAX_FILE_BYTES) throw new Error("Files must be 28 MB or smaller.");
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) throw new Error(`.${ext} files cannot be stored in the DMS.`);

  const checksum = createHash("sha256").update(buffer).digest("hex");
  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "file";
  const path = `dms/${safeStorageSegment(workspaceId, "ws")}/${safeStorageSegment(folderId, "folder")}/${safeStorageSegment(
    documentKey,
    "doc"
  )}/${Date.now()}_${cleanName}`;
  const safeMime = mimeType || "application/octet-stream";
  const { error } = await supabaseAdmin.storage.from("dms-documents").upload(path, buffer, { contentType: safeMime, upsert: false });
  if (error) {
    console.error("[dms] storage upload failed:", error);
    throw new Error("Could not store the file. Please try again.");
  }
  return { storageKey: `storage:dms-documents:${path}`, path, checksum, mimeType: safeMime, size: buffer.length, fileName };
}

async function storeDmsFile(file: File, workspaceId: string, folderId: string, documentKey: string) {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) throw new Error("Choose a file to upload.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Files must be 28 MB or smaller.");
  const buffer = Buffer.from(await file.arrayBuffer());
  return storeDmsBuffer(buffer, file.name, file.type || "application/octet-stream", workspaceId, folderId, documentKey);
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
    renamePattern: (f.rename_pattern as DmsFolderRenamePattern | null) || null,
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
        .select("id, workspace_id, parent_id, name, path, approval_required, inherit_permissions, rename_pattern")
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
  replicateFromFolderId?: string;
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

    let parentWorkspaceId = await resolveWorkspaceId(params.workspaceId);
    if (isUuid(parentId)) {
      const { data: pFolder } = await supabaseAdmin
        .from("dms_folders")
        .select("workspace_id")
        .eq("id", parentId)
        .is("deleted_at", null)
        .maybeSingle();
      if (!pFolder) return { success: false, error: "Choose the parent folder." };
      parentWorkspaceId = pFolder.workspace_id;
    }

    let sourceSettings: { approval_required?: boolean; auto_index_pattern?: any; rename_pattern?: any; workspace_id?: string } | null = null;
    if (isUuid(params.replicateFromFolderId)) {
      const srcRights = await folderRights(actor, params.replicateFromFolderId);
      if (!srcRights.view) {
        return { success: false, error: "You do not have permission to replicate from the selected folder." };
      }
      const { data: src } = await supabaseAdmin
        .from("dms_folders")
        .select("workspace_id, approval_required, auto_index_pattern, rename_pattern")
        .eq("id", params.replicateFromFolderId)
        .is("deleted_at", null)
        .maybeSingle();
      if (!src || src.workspace_id !== parentWorkspaceId) {
        return { success: false, error: "Source folder for replication was not found in this workspace." };
      }
      sourceSettings = src;
    }

    const shareSettings = await readDmsShareSettings();
    const { data: id, error } = await supabaseAdmin.rpc("fn_dms_create_folder", {
      p_actor: actor.id,
      p_base: actor.base,
      p_parent: parentId,
      p_name: params.name,
      p_approval_required: sourceSettings ? !!sourceSettings.approval_required : (params.approvalRequired ?? true),
      p_inherit_permissions: shareSettings.inheritByDefault,
    });
    if (error) throw error;
    if (sourceSettings && (sourceSettings.auto_index_pattern || sourceSettings.rename_pattern)) {
      await supabaseAdmin
        .from("dms_folders")
        .update({
          auto_index_pattern: sourceSettings.auto_index_pattern || null,
          rename_pattern: sourceSettings.rename_pattern || null,
        })
        .eq("id", id as string);
    }
    const { data: f } = await supabaseAdmin
      .from("dms_folders")
      .select("id, workspace_id, parent_id, name, path, approval_required, inherit_permissions, rename_pattern")
      .eq("id", id)
      .single();
    return { success: true, folder: toNode(f, new Map(), await folderRights(actor, id as string)) };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not create the folder.") };
  }
}

export async function updateFolderAction(params: {
  folderId: string;
  name?: string;
  approvalRequired?: boolean;
  renamePattern?: DmsFolderRenamePattern | null;
}): Promise<Result> {
  try {
    const actor = await dmsActor();
    if (params.name !== undefined || params.approvalRequired !== undefined) {
      const { error } = await supabaseAdmin.rpc("fn_dms_update_folder", {
        p_actor: actor.id,
        p_base: actor.base,
        p_folder: params.folderId,
        p_name: params.name ?? null,
        p_approval_required: params.approvalRequired ?? null,
      });
      if (error) throw error;
    }
    if (params.renamePattern !== undefined) {
      const fr = await folderRights(actor, params.folderId);
      if (!fr.admin && !fr.manage) return { success: false, error: "You cannot change download rename settings for this folder." };
      const clean =
        params.renamePattern && params.renamePattern.parts?.length
          ? {
              separator: (["_", "-", "."].includes(String(params.renamePattern.separator)) ? params.renamePattern.separator : "_") as "_" | "-" | ".",
              parts: params.renamePattern.parts.map((p) => String(p).trim()).filter(Boolean).slice(0, 5),
            }
          : null;
      const { error: rpErr } = await supabaseAdmin
        .from("dms_folders")
        .update({ rename_pattern: clean, updated_at: new Date().toISOString() })
        .eq("id", params.folderId);
      if (rpErr) throw rpErr;
    }
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

    const { data: tagRows } = await supabaseAdmin
      .from("dms_document_folder_tags")
      .select("document_id")
      .eq("folder_id", params.folderId);
    const taggedIds = (tagRows || []).map((t: any) => t.document_id).filter(Boolean);

    const q = (params.searchQuery || "").trim().replace(/[%_,()*\\]/g, " ").trim();

    // Page through SQL chunks until we satisfy offset + limit (supports folders > 1,000 docs)
    const batchSize = Math.max(limit * 2, 200);
    let sqlOffset = 0;
    const visible: any[] = [];
    let totalMatching = 0;
    let counted = false;

    while (visible.length < offset + limit) {
      let qBuilder = supabaseAdmin
        .from("dms_documents")
        .select(`${DOC_SELECT}, is_private`, counted ? undefined : { count: "exact" })
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (taggedIds.length > 0) {
        qBuilder = qBuilder.or(`folder_id.eq.${params.folderId},id.in.(${taggedIds.join(",")})`);
      } else {
        qBuilder = qBuilder.eq("folder_id", params.folderId);
      }
      if (isUuid(params.docTypeId)) qBuilder = qBuilder.eq("doc_type_id", params.docTypeId);
      if (params.statusFilter && ["PENDING", "APPROVED", "REJECTED"].includes(params.statusFilter)) {
        qBuilder = qBuilder.eq("approval_status", params.statusFilter);
      }
      if (q) qBuilder = qBuilder.or(`title.ilike.%${q}%,original_file_name.ilike.%${q}%`);

      const { data: chunk, count, error } = await qBuilder.range(sqlOffset, sqlOffset + batchSize - 1);
      if (error) throw error;
      if (!counted) {
        totalMatching = count || 0;
        counted = true;
      }
      const chunkRows = chunk || [];
      if (chunkRows.length === 0) break;

      const rights = await documentRightsMany(actor, chunkRows.map((r: any) => r.id));
      for (const r of chunkRows) {
        if (rights.get(r.id)?.view && (!r.is_private || r.created_by === actor.id || actor.base.admin)) {
          visible.push({ ...r, _rights: rights.get(r.id) });
        }
      }
      if (chunkRows.length < batchSize) break;
      sqlOffset += batchSize;
    }

    const page = visible.slice(offset, offset + limit);

    const names = await namesFor(
      page.flatMap((r: any) => {
        const l = Array.isArray(r.dms_document_locks) ? r.dms_document_locks[0] : r.dms_document_locks;
        return [r.created_by, l?.locked_by];
      })
    );
    return {
      success: true,
      documents: page.map((r: any) => summarize(r, r._rights, actor.id, names)),
      totalCount: Math.max(visible.length, totalMatching),
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

export async function checkFolderDuplicateFileAction(params: {
  folderId: string;
  fileName: string;
}): Promise<Result<{ exists: boolean; documentId?: string; currentVersionNo?: number; title?: string }>> {
  try {
    const actor = await dmsActor();
    if (!isUuid(params.folderId) || !params.fileName?.trim()) return { success: true, exists: false };
    const fr = await folderRights(actor, params.folderId);
    if (!fr.view) return { success: false, error: "Access denied." };
    const { data: dup } = await supabaseAdmin
      .from("dms_documents")
      .select("id, title, current_version_no")
      .eq("folder_id", params.folderId)
      .ilike("original_file_name", params.fileName.trim())
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (!dup) return { success: true, exists: false };
    return { success: true, exists: true, documentId: dup.id, currentVersionNo: dup.current_version_no, title: dup.title };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not check file name.") };
  }
}

/**
 * Upload a file and index it as a new document in one step (v1), OR if a document with
 * the same filename already exists in this folder, automatically check in a new version
 * (v2, v3, ...) requiring both `whatChanged` and `remark`.
 */
export async function addDmsDocumentAction(formData: FormData): Promise<Result<{ documentId: string; approvalStatus: string; versionNo?: number; isNewVersion?: boolean }>> {
  let storedKey: string | null = null;
  try {
    const actor = await dmsActor();
    const folderId = String(formData.get("folderId") || "");
    const docTypeId = String(formData.get("docTypeId") || "");
    if (!isUuid(folderId)) return { success: false, error: "Choose a folder." };
    if (!isUuid(docTypeId)) return { success: false, error: "Choose a document type." };

    const fr = await folderRights(actor, folderId);
    if (!fr.upload) return { success: false, error: "You cannot add documents to this folder." };
    const { data: folder } = await supabaseAdmin.from("dms_folders").select("workspace_id").eq("id", folderId).is("deleted_at", null).maybeSingle();
    if (!folder) return { success: false, error: "Folder not found." };

    let fieldValues: Record<string, unknown> = {};
    let masterRecordIds: string[] = [];
    try {
      fieldValues = JSON.parse(String(formData.get("fieldValues") || "{}")) || {};
      masterRecordIds = (JSON.parse(String(formData.get("masterRecordIds") || "[]")) || []).filter(isUuid);
    } catch {
      return { success: false, error: "The index fields could not be read." };
    }

    const file = formData.get("file") as File | null;
    const rawSplitRanges = String(formData.get("splitPageRanges") || "").trim();
    const rawDocPerms = formData.get("documentPermissions");
    let parsedDocPerms: any[] = [];
    if (rawDocPerms) {
      try {
        const parsed = JSON.parse(String(rawDocPerms));
        if (Array.isArray(parsed) && parsed.length > 0) {
          const shareSettings = await readDmsShareSettings();
          if (!shareSettings.allowDocumentRestriction) {
            return { success: false, error: "Document-level permission restriction is disabled in Share Settings." };
          }
          for (const g of parsed) {
            if (g.userId && !shareSettings.document.userWise) return { success: false, error: "User-wise document sharing is disabled." };
            if (g.groupId && !shareSettings.document.groupWise) return { success: false, error: "Group-wise document sharing is disabled." };
            if (g.departmentId && !shareSettings.document.departmentWise) return { success: false, error: "Department-wise document sharing is disabled." };
          }
          parsedDocPerms = parsed;
        }
      } catch {
        // Ignore malformed optional RBAC payload
      }
    }

    // Split PDF Set mode: parse & validate page ranges, extract separate PDF documents
    if (rawSplitRanges) {
      if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
        return { success: false, error: "Split PDF Set requires a .pdf file." };
      }
      if (file.size === 0 || file.size > MAX_FILE_BYTES) {
        return { success: false, error: "PDF file must be between 1 byte and 28 MB." };
      }
      const rangeTokens = rawSplitRanges.split(",").map((s) => s.trim()).filter(Boolean);
      if (rangeTokens.length === 0 || rangeTokens.length > 25) {
        return { success: false, error: "Specify between 1 and 25 comma-separated page ranges (e.g. 1-5, 6-10)." };
      }
      const srcBytes = Buffer.from(await file.arrayBuffer());
      const srcPdf = await PDFDocument.load(srcBytes);
      const totalPages = srcPdf.getPageCount();
      if (totalPages > 500) {
        return { success: false, error: "Split PDF Set supports up to 500 pages per source PDF." };
      }

      const ranges: { start: number; end: number }[] = [];
      const usedPages = new Set<number>();
      for (const tok of rangeTokens) {
        const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(tok);
        if (!m) return { success: false, error: `Invalid page range "${tok}". Use formats like "1-5, 6-10".` };
        const start = Number(m[1]);
        const end = m[2] ? Number(m[2]) : start;
        if (start < 1 || end < start || end > totalPages) {
          return { success: false, error: `Page range "${tok}" is out of bounds (PDF has ${totalPages} page(s)).` };
        }
        for (let p = start; p <= end; p++) {
          if (usedPages.has(p)) {
            return { success: false, error: `Page ${p} appears in overlapping ranges.` };
          }
          usedPages.add(p);
        }
        ranges.push({ start, end });
      }

      const uploadedKeys: string[] = [];
      let firstDocId = "";
      let firstApproval = "PENDING";
      const baseTitle = String(formData.get("title") || "").trim() || file.name.replace(/\.pdf$/i, "");
      const baseStem = file.name.replace(/\.pdf$/i, "");

      try {
        for (const r of ranges) {
          const outPdf = await PDFDocument.create();
          const indices = Array.from({ length: r.end - r.start + 1 }, (_, i) => r.start - 1 + i);
          const copied = await outPdf.copyPages(srcPdf, indices);
          for (const page of copied) outPdf.addPage(page);
          const outBytes = Buffer.from(await outPdf.save());

          const label = r.start === r.end ? `p${r.start}` : `p${r.start}-${r.end}`;
          const partFileName = `${baseStem}_${label}.pdf`;
          const partTitle = ranges.length > 1 ? `${baseTitle} (${label})` : baseTitle;

          const storedPart = await storeDmsBuffer(outBytes, partFileName, "application/pdf", folder.workspace_id, folderId, `split-${Date.now()}-${label}`);
          uploadedKeys.push(storedPart.storageKey);

          const { data: docId, error: cErr } = await supabaseAdmin.rpc("fn_dms_create_document", {
            p_actor: actor.id,
            p_base: actor.base,
            p_folder: folderId,
            p_doc_type: docTypeId,
            p_title: partTitle,
            p_storage_key: storedPart.storageKey,
            p_file_name: storedPart.fileName,
            p_size: storedPart.size,
            p_checksum: storedPart.checksum,
            p_mime: storedPart.mimeType,
            p_ocr_text: String(formData.get("ocrText") || "") || null,
            p_field_values: fieldValues,
            p_master_record_ids: masterRecordIds,
          });
          if (cErr) throw cErr;

          if (parsedDocPerms.length > 0) {
            await supabaseAdmin.rpc("fn_dms_set_document_permissions", {
              p_actor: actor.id,
              p_base: actor.base,
              p_document: docId,
              p_grants: parsedDocPerms,
            });
          }

          if (!firstDocId) {
            firstDocId = docId as string;
            const { data: docRow } = await supabaseAdmin.from("dms_documents").select("approval_status").eq("id", docId).single();
            firstApproval = docRow?.approval_status || "PENDING";
          }
        }
        return { success: true, documentId: firstDocId, approvalStatus: firstApproval };
      } catch (splitErr) {
        if (uploadedKeys.length > 0) await removeStoredFiles(uploadedKeys);
        throw splitErr;
      }
    }
    let existingDoc: { id: string; current_version_no: number } | null = null;
    if (file?.name) {
      const { validateDmsFileName } = await import("@/lib/dms/filename-rules");
      const nameErr = validateDmsFileName(file.name);
      if (nameErr) return { success: false, error: nameErr };

      const { data: dup } = await supabaseAdmin
        .from("dms_documents")
        .select("id, current_version_no")
        .eq("folder_id", folderId)
        .ilike("original_file_name", file.name.trim())
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();
      if (dup) existingDoc = dup;
    }

    if (existingDoc) {
      const whatChanged = String(formData.get("whatChanged") || "").trim();
      const remark = String(formData.get("remark") || "").trim();
      if (!whatChanged || !remark) {
        return {
          success: false,
          error: `"${file?.name}" already exists (v${existingDoc.current_version_no}). Enter both "What changed in document" and "Remark" to upload v${existingDoc.current_version_no + 1}.`,
        };
      }
      const combinedNote = `Changed: ${whatChanged} | Remark: ${remark}`;
      const stored = await storeDmsFile(file as File, folder!.workspace_id, folderId, existingDoc.id);
      storedKey = stored.storageKey;
      const { data: versionNo, error: vErr } = await supabaseAdmin.rpc("fn_dms_add_version", {
        p_actor: actor.id,
        p_base: actor.base,
        p_document: existingDoc.id,
        p_storage_key: stored.storageKey,
        p_file_name: stored.fileName,
        p_size: stored.size,
        p_checksum: stored.checksum,
        p_mime: stored.mimeType,
        p_change_note: combinedNote,
        p_ocr_text: String(formData.get("ocrText") || "") || null,
      });
      if (vErr) throw vErr;
      storedKey = null;
      await supabaseAdmin.rpc("fn_dms_audit", {
        p_actor: actor.id,
        p_action: "DOCUMENT_VERSION_ADDED",
        p_entity_type: "DOCUMENT",
        p_entity_id: existingDoc.id,
        p_details: { version_no: versionNo, what_changed: whatChanged, remark, previous_version_locked: existingDoc.current_version_no },
      });
      const { data: doc } = await supabaseAdmin.from("dms_documents").select("approval_status").eq("id", existingDoc.id).single();
      return { success: true, documentId: existingDoc.id, approvalStatus: doc?.approval_status || "PENDING", versionNo: Number(versionNo), isNewVersion: true };
    }

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

    if (parsedDocPerms.length > 0) {
      await supabaseAdmin.rpc("fn_dms_set_document_permissions", {
        p_actor: actor.id,
        p_base: actor.base,
        p_document: documentId,
        p_grants: parsedDocPerms,
      });
    }

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

/** Check in a new version. FormData: documentId, file, changeNote (or whatChanged + remark). */
export async function uploadDocumentVersionAction(formData: FormData): Promise<Result<{ versionNo: number }>> {
  let storedKey: string | null = null;
  try {
    const actor = await dmsActor();
    const documentId = String(formData.get("documentId") || "");
    if (!isUuid(documentId)) return { success: false, error: "Document not found." };
    const whatChanged = String(formData.get("whatChanged") || "").trim();
    const remark = String(formData.get("remark") || "").trim();
    const rawChangeNote = String(formData.get("changeNote") || "").trim();
    const changeNote = whatChanged && remark ? `Changed: ${whatChanged} | Remark: ${remark}` : rawChangeNote;
    if (!changeNote) return { success: false, error: "Enter both what changed in the document and a remark." };
    const rights = await documentRights(actor, documentId);
    if (!rights.edit && !rights.upload) return { success: false, error: "You cannot add a version to this document." };

    const { data: doc } = await supabaseAdmin.from("dms_documents").select("workspace_id, folder_id, current_version_no").eq("id", documentId).single();
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
    await supabaseAdmin.rpc("fn_dms_audit", {
      p_actor: actor.id,
      p_action: "DOCUMENT_VERSION_ADDED",
      p_entity_type: "DOCUMENT",
      p_entity_id: documentId,
      p_details: {
        version_no: versionNo,
        what_changed: whatChanged || changeNote,
        remark: remark || null,
        previous_version_locked: doc?.current_version_no || null,
      },
    });
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

/** Moves a document to another folder (dMACQ Change Category), checking rights, lock, and duplicate filename. */
export async function moveDocumentAction(params: { documentId: string; targetFolderId: string }): Promise<Result> {
  try {
    const actor = await dmsActor();
    const { documentId, targetFolderId } = params;
    if (!isUuid(documentId) || !isUuid(targetFolderId)) {
      return { success: false, error: "Invalid document or destination folder." };
    }
    const dr = await documentRights(actor, documentId);
    if (!dr.edit) return { success: false, error: "You do not have permission to move this document." };
    const fr = await folderRights(actor, targetFolderId);
    if (!fr.upload) return { success: false, error: "You cannot move documents into the destination folder." };

    const { data: doc, error: dErr } = await supabaseAdmin
      .from("dms_documents")
      .select("id, folder_id, doc_type_id, original_file_name")
      .eq("id", documentId)
      .is("deleted_at", null)
      .single();
    if (dErr || !doc) return { success: false, error: "Document not found." };
    if (doc.folder_id === targetFolderId) return { success: false, error: "Document is already in that folder." };

    // Enforce active lock check (cannot move a document checked out by someone else)
    const { data: lockRow } = await supabaseAdmin
      .from("dms_document_locks")
      .select("locked_by, expires_at")
      .eq("document_id", documentId)
      .maybeSingle();
    if (lockRow && new Date(lockRow.expires_at).getTime() > Date.now() && lockRow.locked_by && lockRow.locked_by !== actor.id) {
      return { success: false, error: "This document is currently checked out by another user." };
    }

    // Enforce target folder allowed doc-types if configured
    const { data: allowedTypes } = await supabaseAdmin
      .from("dms_folder_doc_types")
      .select("doc_type_id")
      .eq("folder_id", targetFolderId);
    if ((allowedTypes || []).length > 0 && !allowedTypes!.some((t: any) => t.doc_type_id === doc.doc_type_id)) {
      return { success: false, error: "The destination folder does not allow this document type." };
    }

    const { data: dup } = await supabaseAdmin
      .from("dms_documents")
      .select("id")
      .eq("folder_id", targetFolderId)
      .ilike("original_file_name", doc.original_file_name)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (dup) {
      return { success: false, error: `Destination folder already has "${doc.original_file_name}".` };
    }

    const { error: uErr } = await supabaseAdmin
      .from("dms_documents")
      .update({ folder_id: targetFolderId, updated_at: new Date().toISOString() })
      .eq("id", documentId);
    if (uErr) throw uErr;

    await supabaseAdmin.rpc("fn_dms_audit", {
      p_actor: actor.id,
      p_action: "DOCUMENT_MOVED",
      p_entity_type: "DOCUMENT",
      p_entity_id: documentId,
      p_details: { from_folder: doc.folder_id, to_folder: targetFolderId },
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not move the document.") };
  }
}

/** Deletes multiple documents to the recycle bin (dMACQ Bulk Delete). */
export async function bulkDeleteDocumentsAction(documentIds: string[]): Promise<Result<{ deleted: number; failed: number }>> {
  try {
    const actor = await dmsActor();
    const ids = Array.from(new Set((documentIds || []).filter(isUuid)));
    if (!ids.length) return { success: false, error: "Select at least one document." };
    let deleted = 0;
    let failed = 0;
    for (const id of ids) {
      const { error } = await supabaseAdmin.rpc("fn_dms_delete_document", { p_actor: actor.id, p_base: actor.base, p_document: id });
      if (error) failed++;
      else deleted++;
    }
    return { success: true, deleted, failed };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Bulk delete failed.") };
  }
}

export async function fetchRecycleBinAction(workspaceId?: string): Promise<Result<{ items: DmsRecycleItem[] }>> {
  try {
    const actor = await dmsActor();
    const wsId = await resolveWorkspaceId(workspaceId);
    if (!wsId) return { success: true, items: [] };
    const { data: rows, error } = await supabaseAdmin
      .from("dms_documents")
      .select("id, title, original_file_name, folder_id, deleted_at, deleted_by, dms_folders!dms_documents_folder_id_fkey ( name )")
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
      .select("id, title, folder_id, current_version_no, workspace_id, dms_folders!dms_documents_folder_id_fkey ( name )")
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
  departments?: { id: string; code: string; name: string }[];
  shareSettings?: DmsShareSettings["folder"];
  error?: string;
}> {
  try {
    const actor = await dmsActor();
    if (!isUuid(folderId)) return { success: false, error: "Folder not found." };
    const fr = await folderRights(actor, folderId);
    if (!fr.view) return { success: false, error: "You don't have access to this folder." };
    const [{ data: folder }, { data: perms, error }, shareSettings] = await Promise.all([
      supabaseAdmin.from("dms_folders").select("inherit_permissions, workspace_id").eq("id", folderId).single(),
      supabaseAdmin.from("dms_folder_permissions").select("*").eq("folder_id", folderId).order("created_at", { ascending: true }),
      readDmsShareSettings(),
    ]);
    if (error) throw error;
    const [{ data: groups }, { data: departments }] = await Promise.all([
      supabaseAdmin
        .from("dms_groups")
        .select("id, name")
        .eq("workspace_id", folder?.workspace_id)
        .is("deleted_at", null)
        .or("is_active.is.null,is_active.eq.true")
        .order("name"),
      supabaseAdmin
        .from("departments")
        .select("id, code, name")
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("name"),
    ]);
    const deptMap = new Map<string, string>((departments || []).map((d: any) => [d.id, d.name]));
    return {
      success: true,
      inheritPermissions: folder?.inherit_permissions !== false,
      canManage: !!(fr.admin || fr.manage),
      groups: groups || [],
      departments: (departments || []).map((d: any) => ({ id: d.id, code: d.code || "", name: d.name })),
      shareSettings: shareSettings.folder,
      permissions: (perms || []).map((p: any) => ({
        id: p.id,
        folderId: p.folder_id,
        userId: p.user_id,
        groupId: p.group_id,
        departmentId: p.department_id,
        departmentName: p.department_id ? deptMap.get(p.department_id) : undefined,
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
    departmentId?: string | null;
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
    const shareSettings = await readDmsShareSettings();
    const rows = params.permissions || [];
    for (const p of rows) {
      if ((isUuid(p.userId) || p.userEmail) && !shareSettings.folder.userWise) {
        return { success: false, error: "User-wise folder sharing is currently disabled in Share Settings." };
      }
      if (isUuid(p.groupId) && !shareSettings.folder.groupWise) {
        return { success: false, error: "Group-wise folder sharing is currently disabled in Share Settings." };
      }
      if (isUuid(p.departmentId) && !shareSettings.folder.departmentWise) {
        return { success: false, error: "Department-wise folder sharing is currently disabled in Share Settings." };
      }
    }

    const grants = rows.map((p) => ({
      user_id: isUuid(p.userId) ? p.userId : null,
      group_id: isUuid(p.groupId) ? p.groupId : null,
      department_id: isUuid(p.departmentId) ? p.departmentId : null,
      user_email: p.userEmail || null,
      user_name: p.userName || null,
      // A role row only applies when it names no person, group, or department
      role_code: !isUuid(p.userId) && !isUuid(p.groupId) && !isUuid(p.departmentId) && !p.userEmail ? p.roleCode || null : null,
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

export interface DmsDocTypePermissionRow {
  groupId: string;
  groupName: string;
  docTypeId: string;
  docTypeCode: string;
  docTypeName: string;
  canAdd: boolean;
  canView: boolean;
  canPrint: boolean;
  canEditFields: boolean;
  canDelete: boolean;
  canDownload: boolean;
  canEmail: boolean;
  isPrivateView: boolean;
}

export async function fetchDocTypePermissionsAction(workspaceId?: string): Promise<{
  success: boolean;
  groups?: { id: string; code: string; name: string }[];
  docTypes?: { id: string; code: string; name: string }[];
  rows?: DmsDocTypePermissionRow[];
  error?: string;
}> {
  try {
    const actor = await dmsActor();
    if (!actor.base.admin) return { success: false, error: "Only Design administrators can manage document-type rights." };
    const wsId = await resolveWorkspaceId(workspaceId);
    if (!wsId) return { success: false, error: "Workspace not found." };

    let { data: groups } = await supabaseAdmin
      .from("dms_groups")
      .select("id, code, name")
      .eq("workspace_id", wsId)
      .is("deleted_at", null)
      .order("name");
    if (!groups || groups.length === 0) {
      const defaults = [
        { workspace_id: wsId, code: "USERS", name: "Users", description: "Standard DMS users", is_system: true },
        { workspace_id: wsId, code: "QC_APPROVERS", name: "QC Approvers", description: "Quality control reviewers", is_system: true },
        { workspace_id: wsId, code: "DEAL_MANAGERS", name: "Deal Managers", description: "Workspace managers", is_system: true },
      ];
      await supabaseAdmin.from("dms_groups").insert(defaults);
      const res = await supabaseAdmin.from("dms_groups").select("id, code, name").eq("workspace_id", wsId).is("deleted_at", null).order("name");
      groups = res.data || [];
    }

    const [{ data: docTypes }, { data: perms }] = await Promise.all([
      supabaseAdmin.from("dms_doc_types").select("id, code, name").is("deleted_at", null).order("name"),
      supabaseAdmin.from("dms_doc_type_permissions").select("*").in("group_id", (groups || []).map((g: any) => g.id)),
    ]);

    const dtMap = new Map<string, any>((docTypes || []).map((d: any) => [d.id, d]));
    const gMap = new Map<string, any>((groups || []).map((g: any) => [g.id, g]));
    const rows: DmsDocTypePermissionRow[] = (perms || []).map((p: any) => ({
      groupId: p.group_id,
      groupName: gMap.get(p.group_id)?.name || "",
      docTypeId: p.doc_type_id,
      docTypeCode: dtMap.get(p.doc_type_id)?.code || "",
      docTypeName: dtMap.get(p.doc_type_id)?.name || "",
      canAdd: !!p.can_add,
      canView: !!p.can_view,
      canPrint: !!p.can_print,
      canEditFields: !!p.can_edit_fields,
      canDelete: !!p.can_delete,
      canDownload: !!p.can_download,
      canEmail: !!p.can_email,
      isPrivateView: !!p.is_private_view,
    }));

    return { success: true, groups: groups || [], docTypes: docTypes || [], rows };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load document-type rights.") };
  }
}

export async function saveDocTypePermissionAction(params: {
  groupId: string;
  docTypeId: string;
  canAdd: boolean;
  canView: boolean;
  canPrint: boolean;
  canEditFields: boolean;
  canDelete: boolean;
  canDownload: boolean;
  canEmail: boolean;
  isPrivateView: boolean;
}): Promise<Result> {
  try {
    const actor = await dmsActor();
    if (!actor.base.admin) return { success: false, error: "Only Design administrators can change document-type rights." };
    if (!isUuid(params.groupId) || !isUuid(params.docTypeId)) return { success: false, error: "Invalid group or document type." };
    const { error } = await supabaseAdmin.from("dms_doc_type_permissions").upsert(
      {
        group_id: params.groupId,
        doc_type_id: params.docTypeId,
        can_add: !!params.canAdd,
        can_view: !!params.canView,
        can_print: !!params.canPrint,
        can_edit_fields: !!params.canEditFields,
        can_delete: !!params.canDelete,
        can_download: !!params.canDownload,
        can_email: !!params.canEmail,
        is_private_view: !!params.isPrivateView,
      },
      { onConflict: "group_id,doc_type_id" }
    );
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not save document-type rights.") };
  }
}

export interface DmsEligiblePrincipal {
  key: string;
  kind: "USER" | "GROUP" | "DEPARTMENT" | "ROLE";
  userId?: string;
  groupId?: string;
  departmentId?: string;
  roleCode?: string;
  label: string;
  email?: string;
}

export interface DmsDocumentPermissionItem {
  userId?: string;
  groupId?: string;
  departmentId?: string;
  roleCode?: string;
  label: string;
  email?: string;
  canView: boolean;
  canEdit: boolean;
  canDownload: boolean;
  canManage: boolean;
  canDelete: boolean;
}

const DESIGN_ROLES = [
  { code: "DESIGN_ADMIN", label: "Design Admin" },
  { code: "DESIGN_ARCHITECT", label: "Architect" },
  { code: "DESIGN_ENGINEER", label: "Engineer" },
  { code: "DESIGN_REVIEWER", label: "Reviewer / QC" },
  { code: "DESIGN_VIEWER", label: "Viewer" },
];

export async function fetchFolderEligiblePrincipalsAction(folderId: string): Promise<
  Result<{ principals: DmsEligiblePrincipal[]; restricted: boolean; shareSettings?: DmsShareSettings["document"] }>
> {
  try {
    const actor = await dmsActor();
    if (!isUuid(folderId)) return { success: false, error: "Invalid folder." };
    const fr = await folderRights(actor, folderId);
    if (!fr.view) return { success: false, error: "Access denied." };

    const { data: folder } = await supabaseAdmin
      .from("dms_folders")
      .select("id, workspace_id, parent_id, inherit_permissions")
      .eq("id", folderId)
      .is("deleted_at", null)
      .single();
    if (!folder) return { success: false, error: "Folder not found." };

    const [{ data: allFolders }, shareSettings, { data: groups }, { data: departments }] = await Promise.all([
      supabaseAdmin
        .from("dms_folders")
        .select("id, parent_id, inherit_permissions")
        .eq("workspace_id", folder.workspace_id)
        .is("deleted_at", null),
      readDmsShareSettings(),
      supabaseAdmin
        .from("dms_groups")
        .select("id, name")
        .eq("workspace_id", folder.workspace_id)
        .is("deleted_at", null)
        .or("is_active.is.null,is_active.eq.true")
        .order("name"),
      supabaseAdmin
        .from("departments")
        .select("id, code, name")
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("name"),
    ]);
    const groupMap = new Map<string, string>((groups || []).map((g: any) => [g.id, g.name]));
    const deptMap = new Map<string, string>((departments || []).map((d: any) => [d.id, d.name]));

    const byId = new Map<string, any>((allFolders || []).map((f: any) => [f.id, f]));
    const chain: string[] = [];
    const visited = new Set<string>();
    let cur: any = folder;
    let stopInherit = false;
    while (cur && !visited.has(cur.id)) {
      visited.add(cur.id);
      chain.push(cur.id);
      if (cur.inherit_permissions === false) {
        stopInherit = true;
        break;
      }
      cur = cur.parent_id ? byId.get(cur.parent_id) : null;
    }

    const [{ data: fPerms }, { data: designAccess }] = await Promise.all([
      chain.length
        ? supabaseAdmin.from("dms_folder_permissions").select("*").in("folder_id", chain).eq("can_view", true)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin.from("design_user_access").select("user_id, design_role"),
    ]);

    const userLookupIds = Array.from(
      new Set((designAccess || []).map((a: any) => a.user_id).concat((fPerms || []).map((p: any) => p.user_id).filter(Boolean)))
    );
    const { data: users } = userLookupIds.length
      ? await supabaseAdmin.from("user_master").select("id, full_name, email, is_active").in("id", userLookupIds)
      : { data: [] as any[] };
    const uMap = new Map<string, any>((users || []).filter((u: any) => u.is_active !== false).map((u: any) => [u.id, u]));
    const roleByUser = new Map<string, string>((designAccess || []).map((a: any) => [a.user_id, String(a.design_role || "").toUpperCase()]));

    const restricted = stopInherit || (fPerms || []).length > 0;
    const out = new Map<string, DmsEligiblePrincipal>();

    if (!restricted) {
      if (shareSettings.document.groupWise) {
        for (const g of groups || []) {
          out.set(`GROUP:${g.id}`, { key: `GROUP:${g.id}`, kind: "GROUP", groupId: g.id, label: `Group: ${g.name}` });
        }
      }
      if (shareSettings.document.departmentWise) {
        for (const d of departments || []) {
          out.set(`DEPT:${d.id}`, { key: `DEPT:${d.id}`, kind: "DEPARTMENT", departmentId: d.id, label: `Dept: ${d.name}` });
        }
      }
      for (const r of DESIGN_ROLES) {
        out.set(`ROLE:${r.code}`, { key: `ROLE:${r.code}`, kind: "ROLE", roleCode: r.code, label: `Role: ${r.label}` });
      }
      if (shareSettings.document.userWise) {
        for (const a of designAccess || []) {
          const u = uMap.get(a.user_id);
          if (!u) continue;
          out.set(`USER:${u.id}`, {
            key: `USER:${u.id}`,
            kind: "USER",
            userId: u.id,
            label: u.full_name || u.email || u.id,
            email: u.email,
          });
        }
      }
    } else {
      const allowedRoles = new Set<string>();
      for (const p of fPerms || []) {
        if (p.user_id && shareSettings.document.userWise) {
          const u = uMap.get(p.user_id);
          if (u) {
            out.set(`USER:${p.user_id}`, {
              key: `USER:${p.user_id}`,
              kind: "USER",
              userId: p.user_id,
              label: u.full_name || p.user_name || p.user_email || p.user_id,
              email: u.email || p.user_email || undefined,
            });
          }
        } else if (p.group_id && shareSettings.document.groupWise) {
          const gName = groupMap.get(p.group_id);
          if (gName) {
            out.set(`GROUP:${p.group_id}`, {
              key: `GROUP:${p.group_id}`,
              kind: "GROUP",
              groupId: p.group_id,
              label: `Group: ${gName}`,
            });
          }
        } else if (p.department_id && shareSettings.document.departmentWise) {
          const dName = deptMap.get(p.department_id);
          if (dName) {
            out.set(`DEPT:${p.department_id}`, {
              key: `DEPT:${p.department_id}`,
              kind: "DEPARTMENT",
              departmentId: p.department_id,
              label: `Dept: ${dName}`,
            });
          }
        } else if (p.role_code) {
          const rc = String(p.role_code).toUpperCase();
          allowedRoles.add(rc);
          const roleMeta = DESIGN_ROLES.find((r) => r.code === rc);
          out.set(`ROLE:${rc}`, {
            key: `ROLE:${rc}`,
            kind: "ROLE",
            roleCode: rc,
            label: `Role: ${roleMeta?.label || rc}`,
          });
        }
      }
      if (allowedRoles.size > 0 && shareSettings.document.userWise) {
        for (const [uid, rc] of roleByUser.entries()) {
          if (allowedRoles.has(rc)) {
            const u = uMap.get(uid);
            if (u && !out.has(`USER:${uid}`)) {
              out.set(`USER:${uid}`, {
                key: `USER:${uid}`,
                kind: "USER",
                userId: uid,
                label: u.full_name || u.email || uid,
                email: u.email,
              });
            }
          }
        }
      }
    }

    return { success: true, principals: Array.from(out.values()), restricted, shareSettings: shareSettings.document };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load folder-eligible users.") };
  }
}

export async function fetchDocumentPermissionsAction(documentId: string): Promise<
  Result<{ grants: DmsDocumentPermissionItem[] }>
> {
  try {
    const actor = await dmsActor();
    if (!isUuid(documentId)) return { success: false, error: "Invalid document." };
    const dr = await documentRights(actor, documentId);
    if (!dr.view) return { success: false, error: "Access denied." };

    const { data, error } = await supabaseAdmin
      .from("dms_document_permissions")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const uids = (data || []).map((r: any) => r.user_id).filter(Boolean);
    const gids = (data || []).map((r: any) => r.group_id).filter(Boolean);
    const dids = (data || []).map((r: any) => r.department_id).filter(Boolean);

    const [{ data: users }, { data: groups }, { data: depts }] = await Promise.all([
      uids.length ? supabaseAdmin.from("user_master").select("id, full_name, email").in("id", uids) : Promise.resolve({ data: [] as any[] }),
      gids.length ? supabaseAdmin.from("dms_groups").select("id, name").in("id", gids) : Promise.resolve({ data: [] as any[] }),
      dids.length ? supabaseAdmin.from("departments").select("id, name").in("id", dids) : Promise.resolve({ data: [] as any[] }),
    ]);

    const uMap = new Map<string, any>((users || []).map((u: any) => [u.id, u]));
    const gMap = new Map<string, any>((groups || []).map((g: any) => [g.id, g]));
    const dMap = new Map<string, any>((depts || []).map((d: any) => [d.id, d]));

    return {
      success: true,
      grants: (data || []).map((r: any) => {
        const u = r.user_id ? uMap.get(r.user_id) : null;
        const g = r.group_id ? gMap.get(r.group_id) : null;
        const dep = r.department_id ? dMap.get(r.department_id) : null;
        const roleMeta = r.role_code ? DESIGN_ROLES.find((d) => d.code === String(r.role_code).toUpperCase()) : null;
        const label = r.user_id
          ? u?.full_name || u?.email || r.user_id
          : r.group_id
          ? `Group: ${g?.name || r.group_id}`
          : r.department_id
          ? `Dept: ${dep?.name || r.department_id}`
          : `Role: ${roleMeta?.label || r.role_code}`;
        return {
          userId: r.user_id || undefined,
          groupId: r.group_id || undefined,
          departmentId: r.department_id || undefined,
          roleCode: r.role_code || undefined,
          label,
          email: u?.email || undefined,
          canView: !!r.can_view,
          canEdit: !!r.can_edit,
          canDownload: !!r.can_download,
          canManage: !!r.can_manage,
          canDelete: !!r.can_delete,
        };
      }),
    };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load document permissions.") };
  }
}

export async function saveDocumentPermissionsAction(params: {
  documentId: string;
  grants: {
    userId?: string;
    groupId?: string;
    departmentId?: string;
    roleCode?: string;
    canView: boolean;
    canEdit: boolean;
    canDownload: boolean;
    canManage: boolean;
    canDelete: boolean;
  }[];
}): Promise<Result> {
  try {
    const actor = await dmsActor();
    if (!isUuid(params.documentId)) return { success: false, error: "Invalid document." };
    const shareSettings = await readDmsShareSettings();
    if (!shareSettings.allowDocumentRestriction && (params.grants || []).length > 0) {
      return { success: false, error: "Document-level permission restrictions are disabled in Share Settings." };
    }
    for (const g of params.grants || []) {
      if (isUuid(g.userId) && !shareSettings.document.userWise) {
        return { success: false, error: "User-wise document sharing is disabled in Share Settings." };
      }
      if (isUuid(g.groupId) && !shareSettings.document.groupWise) {
        return { success: false, error: "Group-wise document sharing is disabled in Share Settings." };
      }
      if (isUuid(g.departmentId) && !shareSettings.document.departmentWise) {
        return { success: false, error: "Department-wise document sharing is disabled in Share Settings." };
      }
    }

    const payload = (params.grants || []).map((g) => ({
      user_id: isUuid(g.userId) ? g.userId : null,
      group_id: isUuid(g.groupId) ? g.groupId : null,
      department_id: isUuid(g.departmentId) ? g.departmentId : null,
      role_code: !isUuid(g.userId) && !isUuid(g.groupId) && !isUuid(g.departmentId) && g.roleCode ? String(g.roleCode).toUpperCase() : null,
      can_view: !!g.canView,
      can_edit: !!g.canEdit,
      can_download: !!g.canDownload,
      can_manage: !!g.canManage,
      can_delete: !!g.canDelete,
    }));
    const { error } = await supabaseAdmin.rpc("fn_dms_set_document_permissions", {
      p_actor: actor.id,
      p_base: actor.base,
      p_document: params.documentId,
      p_grants: payload,
    });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not save document permissions.") };
  }
}
