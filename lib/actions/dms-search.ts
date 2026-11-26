"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { dmsActor, dmsError, documentRightsMany, isUuid, resolveWorkspaceId } from "@/lib/dms/access";
import { DOC_SELECT, namesFor, summarize } from "@/lib/dms/documents";
import type { DmsDocumentSummary } from "@/lib/actions/dms-core";

/**
 * DMS search across folders, file text and custom fields, plus saved searches.
 * Matching and access rules are in fn_dms_search (supabase/migrations/20261126130000_dms_search.sql).
 */

export interface DmsFieldFilter {
  fieldId: string;
  op: "eq" | "contains" | "gte" | "lte" | "between";
  value: string;
  value2?: string;
}

export interface DmsSearchFilters {
  text?: string;
  folderId?: string;
  includeSubfolders?: boolean;
  docTypeId?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  from?: string;
  to?: string;
  masterRecordId?: string;
  checkedOut?: boolean;
  fields?: DmsFieldFilter[];
}

export interface DmsSearchHit extends DmsDocumentSummary {
  matchedIn: "title" | "content" | "field" | null;
  folderName: string;
}

export interface DmsSavedSearch {
  id: string;
  name: string;
  filters: DmsSearchFilters;
  isMine: boolean;
  sharedWithGroupId: string | null;
}

type Result<T = {}> = ({ success: true } & T) | { success: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toDbFilters(f: DmsSearchFilters) {
  return {
    text: (f.text || "").trim().slice(0, 200) || undefined,
    folder_id: isUuid(f.folderId) ? f.folderId : undefined,
    subfolders: f.includeSubfolders !== false,
    doc_type_id: isUuid(f.docTypeId) ? f.docTypeId : undefined,
    status: f.status,
    from: f.from && DATE_RE.test(f.from) ? f.from : undefined,
    to: f.to && DATE_RE.test(f.to) ? f.to : undefined,
    master_record_id: isUuid(f.masterRecordId) ? f.masterRecordId : undefined,
    checked_out: !!f.checkedOut,
    fields: (f.fields || [])
      .filter((x) => isUuid(x.fieldId) && String(x.value ?? "").trim())
      .slice(0, 10)
      .map((x) => ({ field_id: x.fieldId, op: x.op, value: String(x.value).trim(), value2: x.value2 ? String(x.value2).trim() : undefined })),
  };
}

/** Keep only the parts of a saved search we understand. */
function cleanFilters(f: any): DmsSearchFilters {
  const d = toDbFilters(f || {});
  return {
    text: d.text,
    folderId: d.folder_id,
    includeSubfolders: d.subfolders,
    docTypeId: d.doc_type_id,
    status: ["PENDING", "APPROVED", "REJECTED"].includes(f?.status) ? f.status : undefined,
    from: d.from,
    to: d.to,
    masterRecordId: d.master_record_id,
    checkedOut: d.checked_out || undefined,
    fields: d.fields.map((x) => ({ fieldId: x.field_id, op: x.op, value: x.value, value2: x.value2 })),
  };
}

export async function searchDocumentsAction(
  filters: DmsSearchFilters,
  page: { limit?: number; offset?: number } = {},
  workspaceId?: string
): Promise<Result<{ hits: DmsSearchHit[]; total: number }>> {
  try {
    const actor = await dmsActor();
    const wsId = await resolveWorkspaceId(workspaceId);
    if (!wsId) return { success: true, hits: [], total: 0 };

    const { data: matches, error } = await supabaseAdmin.rpc("fn_dms_search", {
      p_user: actor.id,
      p_base: actor.base,
      p_workspace: wsId,
      p_filters: toDbFilters(filters),
      p_limit: Math.min(Math.max(page.limit || 50, 1), 200),
      p_offset: Math.max(page.offset || 0, 0),
    });
    if (error) throw error;
    const rows = (matches as { document_id: string; rank: number; matched_in: string | null; total: number }[]) || [];
    if (!rows.length) return { success: true, hits: [], total: 0 };

    const ids = rows.map((r) => r.document_id);
    const [{ data: docs, error: dErr }, rights] = await Promise.all([
      supabaseAdmin.from("dms_documents").select(`${DOC_SELECT}, dms_folders ( name )`).in("id", ids),
      documentRightsMany(actor, ids),
    ]);
    if (dErr) throw dErr;
    const byId = new Map((docs || []).map((d: any) => [d.id, d]));
    const names = await namesFor(
      (docs || []).flatMap((d: any) => {
        const l = Array.isArray(d.dms_document_locks) ? d.dms_document_locks[0] : d.dms_document_locks;
        return [d.created_by, l?.locked_by];
      })
    );

    const hits: DmsSearchHit[] = [];
    for (const r of rows) {
      const d: any = byId.get(r.document_id);
      if (!d) continue;
      const folder = Array.isArray(d.dms_folders) ? d.dms_folders[0] : d.dms_folders;
      hits.push({
        ...summarize(d, rights.get(r.document_id), actor.id, names),
        matchedIn: (r.matched_in as DmsSearchHit["matchedIn"]) || null,
        folderName: folder?.name || "",
      });
    }
    return { success: true, hits, total: Number(rows[0]?.total || hits.length) };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Search failed. Try again.") };
  }
}

export async function fetchSavedSearchesAction(workspaceId?: string): Promise<Result<{ searches: DmsSavedSearch[] }>> {
  try {
    const actor = await dmsActor();
    const wsId = await resolveWorkspaceId(workspaceId);
    if (!wsId) return { success: true, searches: [] };
    const { data: groups } = await supabaseAdmin.from("dms_group_members").select("group_id").eq("user_id", actor.id);
    const groupIds = (groups || []).map((g: any) => g.group_id);
    let q = supabaseAdmin
      .from("dms_saved_views")
      .select("id, name, owner_id, shared_group_id, filter_conditions, created_at")
      .eq("workspace_id", wsId)
      .order("name");
    q = groupIds.length ? q.or(`owner_id.eq.${actor.id},shared_group_id.in.(${groupIds.join(",")})`) : q.eq("owner_id", actor.id);
    const { data, error } = await q;
    if (error) throw error;
    return {
      success: true,
      searches: (data || []).map((v: any) => ({
        id: v.id,
        name: v.name,
        filters: cleanFilters(Array.isArray(v.filter_conditions) ? {} : v.filter_conditions),
        isMine: v.owner_id === actor.id,
        sharedWithGroupId: v.shared_group_id,
      })),
    };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load saved searches.") };
  }
}

export async function saveSearchAction(params: {
  name: string;
  filters: DmsSearchFilters;
  shareWithGroupId?: string | null;
  workspaceId?: string;
}): Promise<Result<{ id: string }>> {
  try {
    const actor = await dmsActor();
    const wsId = await resolveWorkspaceId(params.workspaceId);
    const name = (params.name || "").trim().slice(0, 100);
    if (!wsId) return { success: false, error: "Workspace not found." };
    if (!name) return { success: false, error: "Give the search a name." };
    let shared: string | null = null;
    if (isUuid(params.shareWithGroupId)) {
      // You can share only with a group you belong to (administrators with any group)
      const { data: member } = await supabaseAdmin
        .from("dms_group_members")
        .select("id")
        .eq("group_id", params.shareWithGroupId)
        .eq("user_id", actor.id)
        .maybeSingle();
      if (!member && !actor.base.admin) return { success: false, error: "You can only share with a group you belong to." };
      shared = params.shareWithGroupId;
    }
    const { data, error } = await supabaseAdmin
      .from("dms_saved_views")
      .insert({
        workspace_id: wsId,
        owner_id: actor.id,
        shared_group_id: shared,
        name,
        filter_conditions: cleanFilters(params.filters),
        visible_columns: [],
      })
      .select("id")
      .single();
    if (error) throw error;
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not save the search.") };
  }
}

export async function deleteSavedSearchAction(id: string): Promise<Result> {
  try {
    const actor = await dmsActor();
    if (!isUuid(id)) return { success: false, error: "Saved search not found." };
    const { data, error } = await supabaseAdmin.from("dms_saved_views").delete().eq("id", id).eq("owner_id", actor.id).select("id");
    if (error) throw error;
    if (!data?.length) return { success: false, error: "Only the person who saved a search can delete it." };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not delete the saved search.") };
  }
}
