"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { dmsActor, dmsError, isUuid, resolveWorkspaceId } from "@/lib/dms/access";

export interface DmsShareSettings {
  folder: {
    userWise: boolean;
    groupWise: boolean;
    departmentWise: boolean;
  };
  document: {
    userWise: boolean;
    groupWise: boolean;
    departmentWise: boolean;
  };
  inheritByDefault: boolean;
  allowDocumentRestriction: boolean;
}

const DEFAULT_DMS_SHARE_SETTINGS: DmsShareSettings = {
  folder: { userWise: true, groupWise: true, departmentWise: true },
  document: { userWise: true, groupWise: true, departmentWise: true },
  inheritByDefault: true,
  allowDocumentRestriction: true,
};

export interface DmsGroupMemberRow {
  userId: string;
  fullName: string;
  email: string;
  isActive: boolean;
}

export interface DmsGroupRow {
  id: string;
  workspaceId: string;
  name: string;
  code: string | null;
  description: string | null;
  departmentId: string | null;
  departmentName: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
  memberCount: number;
  members: DmsGroupMemberRow[];
}

export interface DmsDepartmentOption {
  id: string;
  code: string;
  name: string;
}

export interface DmsActiveUserOption {
  id: string;
  fullName: string;
  email: string;
  departmentId: string | null;
}

const SHARE_SETTINGS_MODULE_KEY = "dms_share_settings";
const SHARE_SETTINGS_KEY = "workspace";

async function requireWorkspaceId(): Promise<string> {
  const wsId = await resolveWorkspaceId();
  if (!wsId) throw new Error("DMS workspace is not initialized.");
  return wsId;
}

function canManageGroups(actor: Awaited<ReturnType<typeof dmsActor>>) {
  return !!(actor.base.admin || actor.base.masters);
}

function canManageShareSettings(actor: Awaited<ReturnType<typeof dmsActor>>) {
  return !!actor.base.admin;
}

export async function readDmsShareSettings(): Promise<DmsShareSettings> {
  const { data } = await supabaseAdmin
    .from("core_module_settings")
    .select("value_json")
    .eq("module_key", SHARE_SETTINGS_MODULE_KEY)
    .eq("key", SHARE_SETTINGS_KEY)
    .maybeSingle();

  const raw = (data?.value_json || {}) as Partial<DmsShareSettings>;
  return {
    folder: {
      userWise: raw.folder?.userWise ?? true,
      groupWise: raw.folder?.groupWise ?? true,
      departmentWise: raw.folder?.departmentWise ?? true,
    },
    document: {
      userWise: raw.document?.userWise ?? true,
      groupWise: raw.document?.groupWise ?? true,
      departmentWise: raw.document?.departmentWise ?? true,
    },
    inheritByDefault: raw.inheritByDefault ?? true,
    allowDocumentRestriction: raw.allowDocumentRestriction ?? true,
  };
}

export async function fetchDmsShareSettingsAction(): Promise<{
  success: boolean;
  settings?: DmsShareSettings;
  canManage?: boolean;
  error?: string;
}> {
  try {
    const actor = await dmsActor();
    const settings = await readDmsShareSettings();
    return { success: true, settings, canManage: canManageShareSettings(actor) };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load share settings.") };
  }
}

export async function saveDmsShareSettingsAction(
  settings: DmsShareSettings
): Promise<{ success: boolean; settings?: DmsShareSettings; error?: string }> {
  try {
    const actor = await dmsActor();
    if (!canManageShareSettings(actor)) {
      return { success: false, error: "Only Design Administrators can update DMS Share Settings." };
    }
    const previous = await readDmsShareSettings();
    const next: DmsShareSettings = {
      folder: {
        userWise: !!settings.folder?.userWise,
        groupWise: !!settings.folder?.groupWise,
        departmentWise: !!settings.folder?.departmentWise,
      },
      document: {
        userWise: !!settings.document?.userWise,
        groupWise: !!settings.document?.groupWise,
        departmentWise: !!settings.document?.departmentWise,
      },
      inheritByDefault: !!settings.inheritByDefault,
      allowDocumentRestriction: !!settings.allowDocumentRestriction,
    };

    const wsId = await requireWorkspaceId();
    const { data: existingRow } = await supabaseAdmin
      .from("core_module_settings")
      .select("value_json")
      .eq("module_key", SHARE_SETTINGS_MODULE_KEY)
      .eq("key", SHARE_SETTINGS_KEY)
      .maybeSingle();
    const mergedValue = {
      ...((existingRow?.value_json as Record<string, unknown>) || {}),
      ...next,
    };

    const { error } = await supabaseAdmin.from("core_module_settings").upsert(
      {
        module_key: SHARE_SETTINGS_MODULE_KEY,
        key: SHARE_SETTINGS_KEY,
        value_json: mergedValue,
        updated_by: actor.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "module_key,key" }
    );
    if (error) throw error;

    await supabaseAdmin.rpc("fn_dms_audit", {
      p_actor: actor.id,
      p_action: "SHARE_SETTINGS_UPDATED",
      p_entity_type: "WORKSPACE",
      p_entity_id: wsId,
      p_details: { previous, next },
    });

    return { success: true, settings: next };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not save share settings.") };
  }
}

export async function fetchDmsDepartmentsAction(): Promise<{
  success: boolean;
  departments?: DmsDepartmentOption[];
  error?: string;
}> {
  try {
    await dmsActor();
    const { data, error } = await supabaseAdmin
      .from("departments")
      .select("id, code, name")
      .or("is_deleted.is.null,is_deleted.eq.false")
      .order("name");
    if (error) throw error;
    return {
      success: true,
      departments: (data || []).map((d: any) => ({
        id: d.id,
        code: d.code || "",
        name: d.name,
      })),
    };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load departments.") };
  }
}

export async function fetchDmsGroupsAction(): Promise<{
  success: boolean;
  groups?: DmsGroupRow[];
  departments?: DmsDepartmentOption[];
  users?: DmsActiveUserOption[];
  canManage?: boolean;
  error?: string;
}> {
  try {
    const actor = await dmsActor();
    const wsId = await requireWorkspaceId();

    const [{ data: groups, error: gErr }, { data: depts }, { data: users }] = await Promise.all([
      supabaseAdmin
        .from("dms_groups")
        .select("id, workspace_id, name, code, description, department_id, is_active, created_by, created_at, updated_by, updated_at")
        .eq("workspace_id", wsId)
        .is("deleted_at", null)
        .order("name"),
      supabaseAdmin
        .from("departments")
        .select("id, code, name")
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("name"),
      supabaseAdmin
        .from("user_master")
        .select("id, full_name, email, department_id, is_active")
        .or("is_active.is.null,is_active.eq.true")
        .order("full_name"),
    ]);
    if (gErr) throw gErr;

    const groupIds = (groups || []).map((g: any) => g.id);
    const { data: memberRows } = groupIds.length
      ? await supabaseAdmin.from("dms_group_members").select("group_id, user_id").in("group_id", groupIds)
      : { data: [] as any[] };

    const memberUserIds = Array.from(new Set((memberRows || []).map((m: any) => m.user_id).filter(Boolean)));
    const { data: allMemberUsers } = memberUserIds.length
      ? await supabaseAdmin.from("user_master").select("id, full_name, email, is_active").in("id", memberUserIds)
      : { data: [] as any[] };

    const userMap = new Map<string, any>((allMemberUsers || []).map((u: any) => [u.id, u]));
    const deptMap = new Map<string, any>((depts || []).map((d: any) => [d.id, d]));

    const membersByGroup = new Map<string, DmsGroupMemberRow[]>();
    for (const m of memberRows || []) {
      const u = userMap.get(m.user_id);
      const list = membersByGroup.get(m.group_id) || [];
      list.push({
        userId: m.user_id,
        fullName: u?.full_name || u?.email || m.user_id,
        email: u?.email || "",
        isActive: u?.is_active !== false,
      });
      membersByGroup.set(m.group_id, list);
    }

    return {
      success: true,
      canManage: canManageGroups(actor),
      departments: (depts || []).map((d: any) => ({ id: d.id, code: d.code || "", name: d.name })),
      users: (users || []).map((u: any) => ({
        id: u.id,
        fullName: u.full_name || u.email || u.id,
        email: u.email || "",
        departmentId: u.department_id || null,
      })),
      groups: (groups || []).map((g: any) => {
        const members = membersByGroup.get(g.id) || [];
        const dept = g.department_id ? deptMap.get(g.department_id) : null;
        return {
          id: g.id,
          workspaceId: g.workspace_id,
          name: g.name,
          code: g.code || null,
          description: g.description || null,
          departmentId: g.department_id || null,
          departmentName: dept?.name || null,
          isActive: g.is_active !== false,
          createdBy: g.created_by || null,
          createdAt: g.created_at,
          updatedBy: g.updated_by || null,
          updatedAt: g.updated_at || g.created_at,
          memberCount: members.length,
          members,
        };
      }),
    };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not load DMS groups.") };
  }
}

async function validateActiveUserIds(userIds: string[]): Promise<string[]> {
  const unique = Array.from(new Set((userIds || []).filter((id) => isUuid(id))));
  if (!unique.length) return [];
  const { data, error } = await supabaseAdmin
    .from("user_master")
    .select("id, is_active")
    .in("id", unique);
  if (error) throw error;
  const activeSet = new Set(
    (data || []).filter((u: any) => u.is_active !== false).map((u: any) => u.id as string)
  );
  const invalid = unique.filter((id) => !activeSet.has(id));
  if (invalid.length > 0) {
    throw new Error("Only active users can be added to a DMS group.");
  }
  return unique;
}

export async function createDmsGroupAction(params: {
  name: string;
  code?: string;
  description?: string;
  departmentId?: string | null;
  memberIds?: string[];
}): Promise<{ success: boolean; groupId?: string; error?: string }> {
  try {
    const actor = await dmsActor();
    if (!canManageGroups(actor)) {
      return { success: false, error: "You do not have permission to create DMS groups." };
    }
    const name = String(params.name || "").trim();
    if (name.length < 2 || name.length > 100) {
      return { success: false, error: "Group name must be between 2 and 100 characters." };
    }
    const code = params.code ? String(params.code).trim().toUpperCase().slice(0, 40) : null;
    if (code && !/^[A-Z0-9_-]+$/.test(code)) {
      return { success: false, error: "Group code can only contain letters, numbers, hyphens, and underscores." };
    }
    const departmentId = isUuid(params.departmentId) ? params.departmentId! : null;
    if (departmentId) {
      const { data: dept } = await supabaseAdmin
        .from("departments")
        .select("id")
        .eq("id", departmentId)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .maybeSingle();
      if (!dept) return { success: false, error: "Selected department does not exist." };
    }

    const validMembers = await validateActiveUserIds(params.memberIds || []);
    const wsId = await requireWorkspaceId();

    const { data: group, error } = await supabaseAdmin
      .from("dms_groups")
      .insert({
        workspace_id: wsId,
        name,
        code,
        description: params.description ? String(params.description).trim().slice(0, 500) : null,
        department_id: departmentId,
        is_active: true,
        created_by: actor.id,
        updated_by: actor.id,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "A group with this name or code already exists." };
      }
      throw error;
    }

    if (validMembers.length > 0) {
      const { error: mErr } = await supabaseAdmin.from("dms_group_members").insert(
        validMembers.map((uid) => ({ group_id: group.id, user_id: uid, created_by: actor.id }))
      );
      if (mErr) throw mErr;
    }

    await supabaseAdmin.rpc("fn_dms_audit", {
      p_actor: actor.id,
      p_action: "GROUP_CREATED",
      p_entity_type: "GROUP",
      p_entity_id: group.id,
      p_details: { name, code, departmentId, memberCount: validMembers.length },
    });

    return { success: true, groupId: group.id };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not create group.") };
  }
}

export async function updateDmsGroupAction(params: {
  id: string;
  name: string;
  code?: string;
  description?: string;
  departmentId?: string | null;
  isActive: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await dmsActor();
    if (!canManageGroups(actor)) {
      return { success: false, error: "You do not have permission to edit DMS groups." };
    }
    if (!isUuid(params.id)) return { success: false, error: "Invalid group." };
    const name = String(params.name || "").trim();
    if (name.length < 2 || name.length > 100) {
      return { success: false, error: "Group name must be between 2 and 100 characters." };
    }
    const code = params.code ? String(params.code).trim().toUpperCase().slice(0, 40) : null;
    if (code && !/^[A-Z0-9_-]+$/.test(code)) {
      return { success: false, error: "Group code can only contain letters, numbers, hyphens, and underscores." };
    }
    const departmentId = isUuid(params.departmentId) ? params.departmentId! : null;

    const wsId = await requireWorkspaceId();
    const { data: existing } = await supabaseAdmin
      .from("dms_groups")
      .select("name, code, description, department_id, is_active")
      .eq("id", params.id)
      .eq("workspace_id", wsId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!existing) return { success: false, error: "Group not found." };

    const nextDesc = params.description ? String(params.description).trim().slice(0, 500) : null;
    const { error } = await supabaseAdmin
      .from("dms_groups")
      .update({
        name,
        code,
        description: nextDesc,
        department_id: departmentId,
        is_active: !!params.isActive,
        updated_by: actor.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);
    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "A group with this name or code already exists." };
      }
      throw error;
    }

    await supabaseAdmin.rpc("fn_dms_audit", {
      p_actor: actor.id,
      p_action: "GROUP_UPDATED",
      p_entity_type: "GROUP",
      p_entity_id: params.id,
      p_details: {
        previous: existing,
        next: { name, code, description: nextDesc, department_id: departmentId, is_active: !!params.isActive },
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not update group.") };
  }
}

export async function setDmsGroupMembersAction(params: {
  groupId: string;
  userIds: string[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await dmsActor();
    if (!canManageGroups(actor)) {
      return { success: false, error: "You do not have permission to manage group members." };
    }
    if (!isUuid(params.groupId)) return { success: false, error: "Invalid group." };

    const wsId = await requireWorkspaceId();
    const { data: group } = await supabaseAdmin
      .from("dms_groups")
      .select("id, name")
      .eq("id", params.groupId)
      .eq("workspace_id", wsId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!group) return { success: false, error: "Group not found." };

    const { data: existingRows } = await supabaseAdmin
      .from("dms_group_members")
      .select("user_id")
      .eq("group_id", params.groupId);
    const existingSet = new Set((existingRows || []).map((r: any) => r.user_id as string));

    const targetIds = Array.from(new Set((params.userIds || []).filter((id) => isUuid(id))));
    const addedIds = targetIds.filter((id) => !existingSet.has(id));
    if (addedIds.length > 0) {
      await validateActiveUserIds(addedIds);
    }
    const targetSet = new Set(targetIds);
    const removedIds = Array.from(existingSet).filter((id) => !targetSet.has(id));

    if (removedIds.length > 0) {
      const { error: delErr } = await supabaseAdmin
        .from("dms_group_members")
        .delete()
        .eq("group_id", params.groupId)
        .in("user_id", removedIds);
      if (delErr) throw delErr;
    }

    if (addedIds.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from("dms_group_members")
        .insert(addedIds.map((uid) => ({ group_id: params.groupId, user_id: uid, created_by: actor.id })));
      if (insErr) throw insErr;
    }

    if (addedIds.length > 0 || removedIds.length > 0) {
      await supabaseAdmin.rpc("fn_dms_audit", {
        p_actor: actor.id,
        p_action: "GROUP_MEMBERS_UPDATED",
        p_entity_type: "GROUP",
        p_entity_id: params.groupId,
        p_details: { groupName: group.name, addedIds, removedIds, totalMembers: targetIds.length },
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not update group members.") };
  }
}

export async function deleteDmsGroupAction(groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await dmsActor();
    if (!canManageGroups(actor)) {
      return { success: false, error: "You do not have permission to delete DMS groups." };
    }
    if (!isUuid(groupId)) return { success: false, error: "Invalid group." };

    const [{ count: folderRefs }, { count: docRefs }, { count: typeRefs }] = await Promise.all([
      supabaseAdmin.from("dms_folder_permissions").select("id", { count: "exact", head: true }).eq("group_id", groupId),
      supabaseAdmin.from("dms_document_permissions").select("id", { count: "exact", head: true }).eq("group_id", groupId),
      supabaseAdmin.from("dms_doc_type_permissions").select("id", { count: "exact", head: true }).eq("group_id", groupId),
    ]);

    if ((folderRefs || 0) > 0 || (docRefs || 0) > 0 || (typeRefs || 0) > 0) {
      return {
        success: false,
        error: "This group is currently assigned to folder, document, or document-type permissions. Revoke those shares or deactivate the group instead.",
      };
    }

    const wsId = await requireWorkspaceId();
    const { data: existing } = await supabaseAdmin
      .from("dms_groups")
      .select("name")
      .eq("id", groupId)
      .eq("workspace_id", wsId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!existing) return { success: false, error: "Group not found." };

    const { error } = await supabaseAdmin
      .from("dms_groups")
      .update({ deleted_at: new Date().toISOString(), is_active: false, updated_by: actor.id })
      .eq("id", groupId);
    if (error) throw error;

    await supabaseAdmin.rpc("fn_dms_audit", {
      p_actor: actor.id,
      p_action: "GROUP_DELETED",
      p_entity_type: "GROUP",
      p_entity_id: groupId,
      p_details: { name: existing.name },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: dmsError(err, "Could not delete group.") };
  }
}
