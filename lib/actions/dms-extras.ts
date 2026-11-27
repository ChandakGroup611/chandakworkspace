"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { dmsActor, dmsError, documentRights, folderRights, isUuid } from "@/lib/dms/access";

type Result<T = unknown> = ({ success: true } & T) | { success: false; error: string };

/* -------------------------------------------------------------------------- */
/* Batch 2: Favourites, Multi-Category Tagging, Document Linking, Bulk QC     */
/* -------------------------------------------------------------------------- */

export async function fetchFavouriteIdsAction(): Promise<Result<{ ids: string[] }>> {
  try {
    const actor = await dmsActor();
    const { data, error } = await supabaseAdmin
      .from("dms_document_favourites")
      .select("document_id")
      .eq("user_id", actor.id);
    if (error) throw error;
    return { success: true, ids: (data || []).map((r: any) => r.document_id) };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load favourites.") };
  }
}

export async function toggleFavouriteAction(documentId: string): Promise<Result<{ isFavourite: boolean }>> {
  try {
    const actor = await dmsActor();
    if (!isUuid(documentId)) return { success: false, error: "Invalid document." };
    const dr = await documentRights(actor, documentId);
    if (!dr.view) return { success: false, error: "You cannot view this document." };

    const { data: existing } = await supabaseAdmin
      .from("dms_document_favourites")
      .select("document_id")
      .eq("user_id", actor.id)
      .eq("document_id", documentId)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("dms_document_favourites")
        .delete()
        .eq("user_id", actor.id)
        .eq("document_id", documentId);
      return { success: true, isFavourite: false };
    }

    await supabaseAdmin
      .from("dms_document_favourites")
      .insert({ user_id: actor.id, document_id: documentId });
    return { success: true, isFavourite: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not update favourite.") };
  }
}

export async function fetchDocumentFolderTagsAction(documentId: string): Promise<Result<{ folderIds: string[] }>> {
  try {
    const actor = await dmsActor();
    if (!isUuid(documentId)) return { success: false, error: "Invalid document." };
    const dr = await documentRights(actor, documentId);
    if (!dr.view) return { success: false, error: "Access denied." };
    const { data, error } = await supabaseAdmin
      .from("dms_document_folder_tags")
      .select("folder_id")
      .eq("document_id", documentId);
    if (error) throw error;
    return { success: true, folderIds: (data || []).map((r: any) => r.folder_id) };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load folder tags.") };
  }
}

export async function setDocumentFolderTagAction(params: {
  documentId: string;
  folderId: string;
  tagged: boolean;
}): Promise<Result> {
  try {
    const actor = await dmsActor();
    const { documentId, folderId, tagged } = params;
    if (!isUuid(documentId) || !isUuid(folderId)) return { success: false, error: "Invalid document or folder." };
    const dr = await documentRights(actor, documentId);
    if (!dr.edit) return { success: false, error: "You do not have permission to tag this document." };
    const fr = await folderRights(actor, folderId);
    if (!fr.view) return { success: false, error: "You do not have access to that folder." };

    if (tagged) {
      const { error } = await supabaseAdmin
        .from("dms_document_folder_tags")
        .upsert({ document_id: documentId, folder_id: folderId, tagged_by: actor.id }, { onConflict: "document_id,folder_id" });
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("dms_document_folder_tags")
        .delete()
        .eq("document_id", documentId)
        .eq("folder_id", folderId);
      if (error) throw error;
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not update folder tag.") };
  }
}

export interface DmsDocumentLinkItem {
  id: string;
  targetDocumentId: string;
  targetTitle: string;
  targetFileName: string;
  linkNote: string;
}

export async function fetchDocumentLinksAction(documentId: string): Promise<Result<{ links: DmsDocumentLinkItem[] }>> {
  try {
    const actor = await dmsActor();
    if (!isUuid(documentId)) return { success: false, error: "Invalid document." };
    const dr = await documentRights(actor, documentId);
    if (!dr.view) return { success: false, error: "Access denied." };
    const { data, error } = await supabaseAdmin
      .from("dms_document_links")
      .select("id, target_document_id, link_note, dms_documents!dms_document_links_target_document_id_fkey ( title, original_file_name )")
      .eq("source_document_id", documentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return {
      success: true,
      links: (data || []).map((r: any) => {
        const t = Array.isArray(r.dms_documents) ? r.dms_documents[0] : r.dms_documents;
        return {
          id: r.id,
          targetDocumentId: r.target_document_id,
          targetTitle: t?.title || "Document",
          targetFileName: t?.original_file_name || "",
          linkNote: r.link_note || "",
        };
      }),
    };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load linked documents.") };
  }
}

export async function linkDocumentAction(params: {
  sourceDocumentId: string;
  targetDocumentId: string;
  linkNote?: string;
}): Promise<Result> {
  try {
    const actor = await dmsActor();
    const { sourceDocumentId, targetDocumentId, linkNote } = params;
    if (!isUuid(sourceDocumentId) || !isUuid(targetDocumentId)) return { success: false, error: "Choose a valid document." };
    if (sourceDocumentId === targetDocumentId) return { success: false, error: "Cannot link a document to itself." };
    const dr = await documentRights(actor, sourceDocumentId);
    if (!dr.edit) return { success: false, error: "You do not have permission to link this document." };
    const tr = await documentRights(actor, targetDocumentId);
    if (!tr.view) return { success: false, error: "You cannot view the target document." };

    const { error } = await supabaseAdmin.from("dms_document_links").upsert(
      {
        source_document_id: sourceDocumentId,
        target_document_id: targetDocumentId,
        link_note: String(linkNote || "").trim().slice(0, 200) || null,
        created_by: actor.id,
      },
      { onConflict: "source_document_id,target_document_id" }
    );
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not link documents.") };
  }
}

export async function unlinkDocumentAction(linkId: string): Promise<Result> {
  try {
    const actor = await dmsActor();
    if (!isUuid(linkId)) return { success: false, error: "Invalid link." };
    const { data: row } = await supabaseAdmin.from("dms_document_links").select("source_document_id").eq("id", linkId).maybeSingle();
    if (!row) return { success: false, error: "Link not found." };
    const dr = await documentRights(actor, row.source_document_id);
    if (!dr.edit) return { success: false, error: "Access denied." };
    await supabaseAdmin.from("dms_document_links").delete().eq("id", linkId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not remove link.") };
  }
}

export async function bulkApproveQcAction(documentIds: string[], comment: string): Promise<Result<{ approved: number; skipped: number }>> {
  try {
    const actor = await dmsActor();
    const ids = Array.from(new Set((documentIds || []).filter(isUuid)));
    if (!ids.length) return { success: false, error: "Select at least one document." };
    const cleanComment = String(comment || "").trim() || "Bulk QC Approved";
    let approved = 0;
    let skipped = 0;
    for (const id of ids) {
      const { error } = await supabaseAdmin.rpc("fn_dms_qc_decide", {
        p_actor: actor.id,
        p_base: actor.base,
        p_document: id,
        p_decision: "APPROVED",
        p_comment: cleanComment,
      });
      if (error) skipped++;
      else approved++;
    }
    return { success: true, approved, skipped };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Bulk QC approval failed.") };
  }
}

/* -------------------------------------------------------------------------- */
/* Batch 3: Bulk CSV/Excel Index Export & Import                              */
/* -------------------------------------------------------------------------- */

export async function exportFolderIndexCsvAction(folderId: string): Promise<Result<{ csv: string; fileName: string }>> {
  try {
    const actor = await dmsActor();
    if (!isUuid(folderId)) return { success: false, error: "Choose a folder." };
    const fr = await folderRights(actor, folderId);
    if (!fr.view) return { success: false, error: "Access denied." };

    const { data: docs, error } = await supabaseAdmin
      .from("dms_documents")
      .select("id, title, original_file_name, approval_status, dms_doc_types ( code )")
      .eq("folder_id", folderId)
      .is("deleted_at", null)
      .order("title");
    if (error) throw error;

    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["Document ID", "Title", "File Name", "Doc Type Code", "QC Status"].map(esc).join(","),
      ...(docs || []).map((d: any) => {
        const dt = Array.isArray(d.dms_doc_types) ? d.dms_doc_types[0] : d.dms_doc_types;
        return [d.id, d.title, d.original_file_name, dt?.code || "", d.approval_status].map(esc).join(",");
      }),
    ];
    return { success: true, csv: lines.join("\n"), fileName: `folder-index-${folderId.slice(0, 8)}.csv` };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not export folder index.") };
  }
}

export async function importFolderIndexCsvAction(params: {
  folderId: string;
  rows: { documentId: string; title?: string; docTypeCode?: string }[];
}): Promise<Result<{ updated: number; skipped: number }>> {
  try {
    const actor = await dmsActor();
    if (!isUuid(params.folderId)) return { success: false, error: "Invalid folder." };
    const fr = await folderRights(actor, params.folderId);
    if (!fr.edit) return { success: false, error: "You cannot edit documents in this folder." };

    const { data: docTypes } = await supabaseAdmin.from("dms_doc_types").select("id, code");
    const typeByCode = new Map((docTypes || []).map((t: any) => [String(t.code).toUpperCase(), t.id]));

    let updated = 0;
    let skipped = 0;
    for (const row of params.rows || []) {
      if (!isUuid(row.documentId)) {
        skipped++;
        continue;
      }
      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      if (row.title && row.title.trim()) patch.title = row.title.trim().slice(0, 250);
      if (row.docTypeCode) {
        const dtId = typeByCode.get(row.docTypeCode.trim().toUpperCase());
        if (dtId) patch.doc_type_id = dtId;
      }
      const { error } = await supabaseAdmin
        .from("dms_documents")
        .update(patch)
        .eq("id", row.documentId)
        .eq("folder_id", params.folderId)
        .is("deleted_at", null);
      if (error) skipped++;
      else updated++;
    }
    return { success: true, updated, skipped };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Bulk index import failed.") };
  }
}

/* -------------------------------------------------------------------------- */
/* Batch 4: Private View & Default Saved View                                 */
/* -------------------------------------------------------------------------- */

export async function setDocumentPrivateAction(params: { documentId: string; isPrivate: boolean }): Promise<Result> {
  try {
    const actor = await dmsActor();
    if (!isUuid(params.documentId)) return { success: false, error: "Invalid document." };
    const { data: doc } = await supabaseAdmin
      .from("dms_documents")
      .select("id, created_by")
      .eq("id", params.documentId)
      .is("deleted_at", null)
      .single();
    if (!doc) return { success: false, error: "Document not found." };
    if (doc.created_by !== actor.id && !actor.base.admin) {
      return { success: false, error: "Only the uploader or a DMS admin can toggle Private View." };
    }
    const { error } = await supabaseAdmin
      .from("dms_documents")
      .update({ is_private: !!params.isPrivate, updated_at: new Date().toISOString() })
      .eq("id", params.documentId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not update Private View setting.") };
  }
}

export async function setDefaultSavedViewAction(viewId: string): Promise<Result> {
  try {
    const actor = await dmsActor();
    if (!isUuid(viewId)) return { success: false, error: "Invalid saved view." };
    const { data: view } = await supabaseAdmin
      .from("dms_saved_views")
      .select("id, user_id, folder_id, is_default")
      .eq("id", viewId)
      .single();
    if (!view || view.user_id !== actor.id) return { success: false, error: "Saved view not found." };

    const nextDefault = !view.is_default;
    if (nextDefault) {
      let q = supabaseAdmin.from("dms_saved_views").update({ is_default: false }).eq("user_id", actor.id);
      q = view.folder_id ? q.eq("folder_id", view.folder_id) : q.is("folder_id", null);
      await q;
    }
    const { error } = await supabaseAdmin.from("dms_saved_views").update({ is_default: nextDefault }).eq("id", viewId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not update default view.") };
  }
}
