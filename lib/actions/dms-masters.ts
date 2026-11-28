"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { dmsActor, dmsError, documentRights, isUuid, resolveWorkspaceId, type DmsActor } from "@/lib/dms/access";

/**
 * DMS master tables: shared lists (vendors, units, contracts…) that documents can be tagged with,
 * then found by. People with the Design "masters" capability (or Design admins) define the tables;
 * dms_master_table_rights can narrow or widen, per group, who sees a table and who edits its rows.
 */

export interface DmsMasterField {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  dataType: "TEXT" | "NUMBER" | "DATE";
  isRequired: boolean;
}

export interface DmsMasterTable {
  id: string;
  code: string;
  name: string;
  keyLabel: string;
  fields: DmsMasterField[];
  recordCount: number;
  canEditRows: boolean;
  canDeleteRows?: boolean;
  canManage: boolean;
}

export interface DmsMasterRecord {
  id: string;
  recordKey: string;
  data: Record<string, string>;
}

export interface DmsDocumentTag {
  tableId: string;
  tableName: string;
  recordId: string;
  recordKey: string;
}

type Result<T = {}> = ({ success: true } & T) | { success: false; error: string };

type TableRights = { view: boolean; add: boolean; edit: boolean; del: boolean };

async function tableRights(actor: DmsActor, tableIds: string[]): Promise<Map<string, TableRights>> {
  const out = new Map<string, TableRights>();
  const manager = actor.base.admin || actor.base.masters;
  for (const id of tableIds) out.set(id, { view: true, add: manager, edit: manager, del: manager });
  if (actor.base.admin || !tableIds.length) return out;
  const { data: groups } = await supabaseAdmin.from("dms_group_members").select("group_id").eq("user_id", actor.id);
  const groupIds = (groups || []).map((g: any) => g.group_id);
  if (!groupIds.length) return out;
  const { data: rows } = await supabaseAdmin
    .from("dms_master_table_rights")
    .select("master_table_id, can_view, can_add_rows, can_edit_rows, can_delete_rows")
    .in("master_table_id", tableIds)
    .in("group_id", groupIds);
  const grouped = new Map<string, any[]>();
  for (const r of rows || []) grouped.set(r.master_table_id, [...(grouped.get(r.master_table_id) || []), r]);
  for (const [id, list] of grouped) {
    // Group rights decide for that table, the same way module rights do for the DMS
    out.set(id, {
      view: list.some((r) => r.can_view),
      add: list.some((r) => r.can_view && r.can_add_rows),
      edit: list.some((r) => r.can_view && r.can_edit_rows),
      del: list.some((r) => r.can_view && r.can_delete_rows),
    });
  }
  return out;
}

const cleanCode = (v: string) => v.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50);
const cleanKey = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50);

async function audit(actor: DmsActor, action: string, entityType: string, entityId: string, details: Record<string, unknown>) {
  const { error } = await supabaseAdmin.rpc("fn_dms_audit", {
    p_actor: actor.id,
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_details: details,
  });
  if (error) console.warn("[dms-masters] audit not written:", error.message);
}

export async function fetchMasterTablesAction(workspaceId?: string): Promise<Result<{ tables: DmsMasterTable[]; canCreate: boolean }>> {
  try {
    const actor = await dmsActor();
    const wsId = await resolveWorkspaceId(workspaceId);
    if (!wsId) return { success: true, tables: [], canCreate: false };
    const { data: tables, error } = await supabaseAdmin
      .from("dms_master_tables")
      .select("id, code, name, unique_key_field, dms_master_fields ( id, field_key, field_label, data_type, is_required, deleted_at )")
      .eq("workspace_id", wsId)
      .is("deleted_at", null)
      .order("name");
    if (error) throw error;
    const ids = (tables || []).map((t: any) => t.id);
    const [rights, { data: recs }] = await Promise.all([
      tableRights(actor, ids),
      ids.length
        ? supabaseAdmin.from("dms_master_records").select("master_table_id").in("master_table_id", ids).is("deleted_at", null)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const counts = new Map<string, number>();
    for (const r of recs || []) counts.set(r.master_table_id, (counts.get(r.master_table_id) || 0) + 1);
    const manager = actor.base.admin || actor.base.masters;
    return {
      success: true,
      canCreate: manager,
      tables: (tables || [])
        .filter((t: any) => rights.get(t.id)?.view)
        .map((t: any) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          keyLabel: t.unique_key_field,
          recordCount: counts.get(t.id) || 0,
          canEditRows: !!(rights.get(t.id)?.add || rights.get(t.id)?.edit),
          canDeleteRows: !!rights.get(t.id)?.del,
          canManage: manager,
          fields: ((t.dms_master_fields || []) as any[])
            .filter((f) => !f.deleted_at)
            .map((f) => ({
              id: f.id,
              fieldKey: f.field_key,
              fieldLabel: f.field_label,
              dataType: (["NUMBER", "DATE"].includes(String(f.data_type).toUpperCase()) ? String(f.data_type).toUpperCase() : "TEXT") as DmsMasterField["dataType"],
              isRequired: !!f.is_required,
            })),
        })),
    };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load master tables.") };
  }
}

export async function createMasterTableAction(params: {
  name: string;
  code?: string;
  keyLabel: string;
  fields?: { label: string; dataType?: "TEXT" | "NUMBER" | "DATE"; isRequired?: boolean }[];
  workspaceId?: string;
}): Promise<Result<{ id: string }>> {
  try {
    const actor = await dmsActor();
    if (!actor.base.admin && !actor.base.masters) return { success: false, error: "Your Design access doesn't allow you to manage Design masters." };
    const wsId = await resolveWorkspaceId(params.workspaceId);
    const name = (params.name || "").trim().slice(0, 100);
    const code = cleanCode(params.code || params.name || "");
    const keyLabel = (params.keyLabel || "").trim().slice(0, 50);
    if (!wsId || !name || !code) return { success: false, error: "Give the table a name." };
    if (!keyLabel) return { success: false, error: "Name the column that identifies each row (for example Vendor code)." };

    const fields = (params.fields || []).filter((f) => f.label?.trim()).slice(0, 30);
    const keys = fields.map((f) => cleanKey(f.label));
    if (new Set(keys).size !== keys.length || keys.some((k) => !k)) return { success: false, error: "Each column needs a different name." };

    const { data: table, error } = await supabaseAdmin
      .from("dms_master_tables")
      .insert({ workspace_id: wsId, code, name, unique_key_field: keyLabel })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return { success: false, error: `A master table with code ${code} already exists.` };
      throw error;
    }
    if (fields.length) {
      const { error: fErr } = await supabaseAdmin.from("dms_master_fields").insert(
        fields.map((f, i) => ({
          master_table_id: table.id,
          field_key: keys[i],
          field_label: f.label.trim().slice(0, 100),
          data_type: f.dataType || "TEXT",
          is_required: !!f.isRequired,
        }))
      );
      if (fErr) {
        await supabaseAdmin.from("dms_master_tables").delete().eq("id", table.id);
        throw fErr;
      }
    }
    await audit(actor, "MASTER_TABLE_CREATED", "MASTER_TABLE", table.id, { code, name, columns: fields.length });
    return { success: true, id: table.id };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not create the master table.") };
  }
}

export async function addMasterFieldAction(params: {
  tableId: string;
  label: string;
  dataType?: "TEXT" | "NUMBER" | "DATE";
  isRequired?: boolean;
}): Promise<Result> {
  try {
    const actor = await dmsActor();
    if (!actor.base.admin && !actor.base.masters) return { success: false, error: "Your Design access doesn't allow you to manage Design masters." };
    const key = cleanKey(params.label || "");
    if (!isUuid(params.tableId) || !key) return { success: false, error: "Name the column." };
    const wsId = await resolveWorkspaceId();
    const { data: tbl } = await supabaseAdmin
      .from("dms_master_tables")
      .select("id")
      .eq("id", params.tableId)
      .eq("workspace_id", wsId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!tbl) return { success: false, error: "Master table not found in this workspace." };
    const { error } = await supabaseAdmin.from("dms_master_fields").insert({
      master_table_id: params.tableId,
      field_key: key,
      field_label: params.label.trim().slice(0, 100),
      data_type: params.dataType || "TEXT",
      // A new required column would make every existing row invalid, so it starts optional
      is_required: false,
    });
    if (error) {
      if (error.code === "23505") return { success: false, error: "That table already has a column with this name." };
      throw error;
    }
    await audit(actor, "MASTER_FIELD_ADDED", "MASTER_TABLE", params.tableId, { field: key });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not add the column.") };
  }
}

export async function deleteMasterTableAction(tableId: string): Promise<Result> {
  try {
    const actor = await dmsActor();
    if (!actor.base.admin && !actor.base.masters) return { success: false, error: "Your Design access doesn't allow you to manage Design masters." };
    if (!isUuid(tableId)) return { success: false, error: "Master table not found." };
    const wsId = await resolveWorkspaceId();
    const { data: tbl } = await supabaseAdmin
      .from("dms_master_tables")
      .select("id")
      .eq("id", tableId)
      .eq("workspace_id", wsId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!tbl) return { success: false, error: "Master table not found in this workspace." };
    const { count } = await supabaseAdmin
      .from("dms_document_master_tags")
      .select("id", { count: "exact", head: true })
      .eq("master_table_id", tableId);
    if (count) return { success: false, error: `${count} document tag(s) use this table. Remove them first.` };
    const { error } = await supabaseAdmin.from("dms_master_tables").update({ deleted_at: new Date().toISOString() }).eq("id", tableId);
    if (error) throw error;
    await audit(actor, "MASTER_TABLE_DELETED", "MASTER_TABLE", tableId, {});
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not delete the master table.") };
  }
}

export async function fetchMasterRecordsAction(params: {
  tableId: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Result<{ records: DmsMasterRecord[]; total: number }>> {
  try {
    const actor = await dmsActor();
    if (!isUuid(params.tableId)) return { success: false, error: "Master table not found." };
    const wsId = await resolveWorkspaceId();
    const { data: tbl } = await supabaseAdmin
      .from("dms_master_tables")
      .select("id")
      .eq("id", params.tableId)
      .eq("workspace_id", wsId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!tbl) return { success: false, error: "Master table not found in this workspace." };
    const rights = (await tableRights(actor, [params.tableId])).get(params.tableId);
    if (!rights?.view) return { success: false, error: "You don't have access to this master table." };
    let q = supabaseAdmin
      .from("dms_master_records")
      .select("id, record_key, data", { count: "exact" })
      .eq("master_table_id", params.tableId)
      .is("deleted_at", null)
      .order("record_key");
    const s = (params.search || "").trim().replace(/[%_,()*\\]/g, " ").trim();
    if (s) q = q.ilike("record_key", `%${s}%`);
    const from = Math.max(params.offset || 0, 0);
    const { data, count, error } = await q.range(from, from + Math.min(Math.max(params.limit || 50, 1), 200) - 1);
    if (error) throw error;
    return {
      success: true,
      total: count || 0,
      records: (data || []).map((r: any) => ({ id: r.id, recordKey: r.record_key, data: r.data || {} })),
    };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load the rows.") };
  }
}

async function validateRow(tableId: string, data: Record<string, unknown>) {
  const { data: fields } = await supabaseAdmin
    .from("dms_master_fields")
    .select("field_key, field_label, data_type, is_required")
    .eq("master_table_id", tableId)
    .is("deleted_at", null);
  const clean: Record<string, string> = {};
  for (const f of fields || []) {
    const v = String(data?.[f.field_key] ?? "").trim();
    if (!v) {
      if (f.is_required) throw Object.assign(new Error(`"${f.field_label}" is required.`), { code: "P0001" });
      continue;
    }
    const type = String(f.data_type).toUpperCase();
    if (type === "NUMBER" && !/^-?\d+(\.\d+)?$/.test(v)) throw Object.assign(new Error(`"${f.field_label}" must be a number.`), { code: "P0001" });
    if (type === "DATE" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw Object.assign(new Error(`"${f.field_label}" must be a date.`), { code: "P0001" });
    clean[f.field_key] = v.slice(0, 500);
  }
  return clean;
}

export async function saveMasterRecordAction(params: {
  tableId: string;
  recordId?: string;
  recordKey: string;
  data: Record<string, unknown>;
}): Promise<Result<{ id: string }>> {
  try {
    const actor = await dmsActor();
    if (!isUuid(params.tableId)) return { success: false, error: "Master table not found." };
    const wsId = await resolveWorkspaceId();
    const { data: tbl } = await supabaseAdmin
      .from("dms_master_tables")
      .select("id")
      .eq("id", params.tableId)
      .eq("workspace_id", wsId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!tbl) return { success: false, error: "Master table not found in this workspace." };
    const rights = (await tableRights(actor, [params.tableId])).get(params.tableId);
    const editing = isUuid(params.recordId);
    if (!(editing ? rights?.edit : rights?.add)) return { success: false, error: "You cannot change rows in this master table." };
    const key = (params.recordKey || "").trim().slice(0, 100);
    if (!key) return { success: false, error: "Each row needs its identifying value." };
    const data = await validateRow(params.tableId, params.data || {});

    if (editing) {
      const { data: row, error } = await supabaseAdmin
        .from("dms_master_records")
        .update({ record_key: key, data, updated_at: new Date().toISOString() })
        .eq("id", params.recordId)
        .eq("master_table_id", params.tableId)
        .is("deleted_at", null)
        .select("id")
        .maybeSingle();
      if (error) {
        if (error.code === "23505") return { success: false, error: `A row "${key}" already exists.` };
        throw error;
      }
      if (!row) return { success: false, error: "That row no longer exists." };
      await audit(actor, "MASTER_RECORD_UPDATED", "MASTER_RECORD", row.id, { key });
      return { success: true, id: row.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("dms_master_records")
      .insert({ master_table_id: params.tableId, record_key: key, data })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return { success: false, error: `A row "${key}" already exists.` };
      throw error;
    }
    await audit(actor, "MASTER_RECORD_ADDED", "MASTER_RECORD", row.id, { key });
    return { success: true, id: row.id };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not save the row.") };
  }
}

export async function deleteMasterRecordAction(tableId: string, recordId: string): Promise<Result> {
  try {
    const actor = await dmsActor();
    if (!isUuid(tableId) || !isUuid(recordId)) return { success: false, error: "Master record not found." };
    const wsId = await resolveWorkspaceId();
    const { data: tbl } = await supabaseAdmin
      .from("dms_master_tables")
      .select("id")
      .eq("id", tableId)
      .eq("workspace_id", wsId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!tbl) return { success: false, error: "Master table not found in this workspace." };
    const rights = (await tableRights(actor, [tableId])).get(tableId);
    if (!rights?.del) return { success: false, error: "You cannot delete rows in this master table." };
    const { count } = await supabaseAdmin
      .from("dms_document_master_tags")
      .select("id", { count: "exact", head: true })
      .eq("master_record_id", recordId);
    if (count) return { success: false, error: `${count} document(s) are tagged with this row. Untag them first.` };
    const { data, error } = await supabaseAdmin
      .from("dms_master_records")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", recordId)
      .eq("master_table_id", tableId)
      .select("id");
    if (error) throw error;
    if (!data?.length) return { success: false, error: "That row no longer exists." };
    await audit(actor, "MASTER_RECORD_DELETED", "MASTER_RECORD", recordId, {});
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not delete the row.") };
  }
}

// ---------- document tags ----------

export async function fetchDocumentTagsAction(documentId: string): Promise<Result<{ tags: DmsDocumentTag[]; canEdit: boolean }>> {
  try {
    const actor = await dmsActor();
    const r = await documentRights(actor, documentId);
    if (!r.view) return { success: false, error: "You don't have access to this document." };
    const { data, error } = await supabaseAdmin
      .from("dms_document_master_tags")
      .select("master_table_id, master_record_id, dms_master_tables ( name ), dms_master_records ( record_key )")
      .eq("document_id", documentId);
    if (error) throw error;
    const rights = await tableRights(actor, [...new Set((data || []).map((t: any) => t.master_table_id))]);
    return {
      success: true,
      canEdit: !!r.edit,
      tags: (data || [])
        .filter((t: any) => rights.get(t.master_table_id)?.view)
        .map((t: any) => {
          const table = Array.isArray(t.dms_master_tables) ? t.dms_master_tables[0] : t.dms_master_tables;
          const rec = Array.isArray(t.dms_master_records) ? t.dms_master_records[0] : t.dms_master_records;
          return { tableId: t.master_table_id, tableName: table?.name || "", recordId: t.master_record_id, recordKey: rec?.record_key || "" };
        }),
    };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load the tags.") };
  }
}

export async function setDocumentTagAction(params: { documentId: string; recordId: string; tagged: boolean }): Promise<Result> {
  try {
    const actor = await dmsActor();
    const r = await documentRights(actor, params.documentId);
    if (!r.edit) return { success: false, error: "You cannot edit this document." };
    const { data: rec } = await supabaseAdmin
      .from("dms_master_records")
      .select("id, master_table_id, record_key")
      .eq("id", params.recordId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!rec) return { success: false, error: "That master row no longer exists." };
    if (!(await tableRights(actor, [rec.master_table_id])).get(rec.master_table_id)?.view) {
      return { success: false, error: "You don't have access to that master table." };
    }
    if (params.tagged) {
      const { error } = await supabaseAdmin
        .from("dms_document_master_tags")
        .upsert(
          { document_id: params.documentId, master_table_id: rec.master_table_id, master_record_id: rec.id },
          { onConflict: "document_id,master_record_id", ignoreDuplicates: true }
        );
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("dms_document_master_tags")
        .delete()
        .eq("document_id", params.documentId)
        .eq("master_record_id", rec.id);
      if (error) throw error;
    }
    await audit(actor, params.tagged ? "DOCUMENT_TAGGED" : "DOCUMENT_UNTAGGED", "DOCUMENT", params.documentId, { record: rec.record_key });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not change the tag.") };
  }
}
