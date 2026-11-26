import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireDesign, type DesignCap } from "@/lib/permissions/design-guard";

/**
 * Who is acting in the DMS, and the Design capabilities that become their default DMS rights.
 * The database functions in supabase/migrations/20261126120000_dms_core.sql take these as p_base
 * and apply the six layers (workspace, module rights, folder, document type, field, document).
 */
export interface DmsBase {
  admin: boolean;
  view: boolean;
  create: boolean;
  modify: boolean;
  delete: boolean;
  purge: boolean;
  export: boolean;
  qc: boolean;
  masters: boolean;
}

export interface DmsActor {
  id: string;
  email: string;
  base: DmsBase;
}

export interface DmsRights {
  admin: boolean;
  view: boolean;
  upload: boolean;
  edit: boolean;
  download: boolean;
  print: boolean;
  email: boolean;
  delete: boolean;
  manage: boolean;
  purge: boolean;
  export: boolean;
  qc: boolean;
  deleted?: boolean;
  restore?: boolean;
  own?: boolean;
  restricted?: boolean;
  create_folder?: boolean;
}

const has = (cap: DesignCap) => requireDesign(cap).then(() => true, () => false);

/** Signed-in person with Design access, plus their default DMS rights. Throws when they have no Design access. */
export async function dmsActor(): Promise<DmsActor> {
  const user = await requireDesign("any");
  const [admin, drawings, gfc, masters] = await Promise.all([has("admin"), has("drawings"), has("gfc"), has("masters")]);
  return {
    id: user.id,
    email: user.email || "",
    base: {
      admin,
      view: true,
      create: admin || drawings,
      modify: admin || drawings,
      delete: admin || drawings,
      purge: admin,
      export: true,
      qc: admin || gfc,
      masters: admin || masters,
    },
  };
}

export const WORKSPACE_CODE = "CHANDAK_CORP";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

/** A workspace id from the UI (uuid or code) as the workspace's uuid. */
export async function resolveWorkspaceId(idOrCode?: string | null): Promise<string | null> {
  if (isUuid(idOrCode)) return idOrCode;
  const { data } = await supabaseAdmin
    .from("dms_workspaces")
    .select("id")
    .eq("code", idOrCode || WORKSPACE_CODE)
    .is("deleted_at", null)
    .maybeSingle();
  return data?.id || null;
}

export async function folderRights(actor: DmsActor, folderId: string): Promise<DmsRights> {
  const { data, error } = await supabaseAdmin.rpc("fn_dms_folder_rights", {
    p_user: actor.id,
    p_folder: folderId,
    p_base: actor.base,
  });
  if (error) throw error;
  return data as DmsRights;
}

export async function documentRights(actor: DmsActor, documentId: string): Promise<DmsRights> {
  const { data, error } = await supabaseAdmin.rpc("fn_dms_document_rights", {
    p_user: actor.id,
    p_document: documentId,
    p_base: actor.base,
  });
  if (error) throw error;
  return data as DmsRights;
}

/** Rights for many documents in one round trip. */
export async function documentRightsMany(actor: DmsActor, ids: string[]): Promise<Map<string, DmsRights>> {
  const out = new Map<string, DmsRights>();
  if (!ids.length) return out;
  const { data, error } = await supabaseAdmin.rpc("fn_dms_document_rights_many", {
    p_user: actor.id,
    p_documents: ids,
    p_base: actor.base,
  });
  if (error) throw error;
  for (const row of (data as { document_id: string; rights: DmsRights }[]) || []) out.set(row.document_id, row.rights);
  return out;
}

export async function hiddenFieldIds(actor: DmsActor, workspaceId: string): Promise<Set<string>> {
  const { data } = await supabaseAdmin.rpc("fn_dms_hidden_fields", {
    p_user: actor.id,
    p_workspace: workspaceId,
    p_base: actor.base,
  });
  return new Set(((data as string[] | null) || []).map(String));
}

/** Database rule messages (RAISE ... P0001) are written for people; anything else gets a generic message. */
export function dmsError(err: any, fallback: string): string {
  if (err?.code === "P0001" && err?.message) return err.message;
  if (err instanceof Error && !("code" in err) && err.message) return err.message;
  console.error("[dms]", fallback, err);
  return fallback;
}
