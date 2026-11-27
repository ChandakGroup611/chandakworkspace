"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireDesign } from "@/lib/permissions/design-guard";

export interface ScheduleIntervalMaster {
  id: string;
  code: string;
  name: string;
  intervalType: "WEEKLY" | "MONTHLY" | "CUSTOM";
  intervalDays: number;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface CoordinationStatusMaster {
  id: string;
  code: string;
  name: string;
  taskStatusCode: string;
  color: string;
  isTerminal: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface ReviewOutcomeMaster {
  id: string;
  code: string;
  name: string;
  targetCoordinationStatus: string;
  requiresComment: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface SlaStatusMaster {
  id: string;
  code: string;
  name: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AllCoordinationMasters {
  intervals: ScheduleIntervalMaster[];
  statuses: CoordinationStatusMaster[];
  outcomes: ReviewOutcomeMaster[];
  slaStatuses: SlaStatusMaster[];
  taskStatusCodes: { code: string; name: string }[];
}

export async function fetchAllCoordinationMastersAction(includeInactive = true): Promise<{
  success: boolean;
  data?: AllCoordinationMasters;
  error?: string;
}> {
  try {
    await requireDesign("any");
    const activeFilter = (q: any) => (includeInactive ? q : q.eq("is_active", true));

    const [intRes, stRes, outRes, slaRes, taskStRes] = await Promise.all([
      activeFilter(supabaseAdmin.from("drawing_schedule_intervals").select("*").eq("is_deleted", false)).order("sort_order"),
      activeFilter(supabaseAdmin.from("drawing_coordination_statuses").select("*").eq("is_deleted", false)).order("sort_order"),
      activeFilter(supabaseAdmin.from("drawing_review_outcomes").select("*").eq("is_deleted", false)).order("sort_order"),
      activeFilter(supabaseAdmin.from("drawing_sla_statuses").select("*").eq("is_deleted", false)).order("sort_order"),
      supabaseAdmin
        .from("status_master")
        .select("status_code, status_name")
        .eq("scope_type", "TASK")
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("status_order"),
    ]);

    if (intRes.error) throw intRes.error;
    if (stRes.error) throw stRes.error;
    if (outRes.error) throw outRes.error;
    if (slaRes.error) throw slaRes.error;

    return {
      success: true,
      data: {
        intervals: (intRes.data || []).map((r: any) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          intervalType: r.interval_type,
          intervalDays: Number(r.interval_days || 0),
          description: r.description || null,
          sortOrder: Number(r.sort_order || 10),
          isActive: r.is_active !== false,
        })),
        statuses: (stRes.data || []).map((r: any) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          taskStatusCode: r.task_status_code || "WORK INPROGRESS",
          color: r.color || "#3B82F6",
          isTerminal: !!r.is_terminal,
          sortOrder: Number(r.sort_order || 10),
          isActive: r.is_active !== false,
        })),
        outcomes: (outRes.data || []).map((r: any) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          targetCoordinationStatus: r.target_coordination_status,
          requiresComment: !!r.requires_comment,
          sortOrder: Number(r.sort_order || 10),
          isActive: r.is_active !== false,
        })),
        slaStatuses: (slaRes.data || []).map((r: any) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          color: r.color || "#10B981",
          sortOrder: Number(r.sort_order || 10),
          isActive: r.is_active !== false,
        })),
        taskStatusCodes: (taskStRes.data || []).map((t: any) => ({
          code: t.status_code,
          name: t.status_name,
        })),
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to load coordination masters." };
  }
}

function normCode(raw: string): string {
  const c = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!c) throw new Error("Code is required.");
  return c.slice(0, 60);
}

export async function saveScheduleIntervalMasterAction(params: {
  id?: string;
  code: string;
  name: string;
  intervalType: "WEEKLY" | "MONTHLY" | "CUSTOM";
  intervalDays: number;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireDesign("masters");
    const code = normCode(params.code);
    const name = String(params.name || "").trim();
    if (!name) throw new Error("Name is required.");

    const payload = {
      code,
      name,
      interval_type: params.intervalType,
      interval_days: Math.max(0, Number(params.intervalDays) || 0),
      description: params.description ? String(params.description).trim() : null,
      sort_order: Number(params.sortOrder) || 10,
      is_active: params.isActive !== false,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (params.id) {
      const { error } = await supabaseAdmin.from("drawing_schedule_intervals").update(payload).eq("id", params.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("drawing_schedule_intervals")
        .insert({ ...payload, created_by: user.id });
      if (error) throw error;
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not save schedule interval." };
  }
}

export async function saveCoordinationStatusMasterAction(params: {
  id?: string;
  code: string;
  name: string;
  taskStatusCode: string;
  color?: string;
  isTerminal?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireDesign("masters");
    const code = normCode(params.code);
    const name = String(params.name || "").trim();
    if (!name) throw new Error("Name is required.");

    const payload = {
      code,
      name,
      task_status_code: String(params.taskStatusCode || "WORK INPROGRESS").trim(),
      color: params.color || "#3B82F6",
      is_terminal: !!params.isTerminal,
      sort_order: Number(params.sortOrder) || 10,
      is_active: params.isActive !== false,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (params.id) {
      const { error } = await supabaseAdmin.from("drawing_coordination_statuses").update(payload).eq("id", params.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("drawing_coordination_statuses")
        .insert({ ...payload, created_by: user.id });
      if (error) throw error;
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not save coordination status." };
  }
}

export async function saveReviewOutcomeMasterAction(params: {
  id?: string;
  code: string;
  name: string;
  targetCoordinationStatus: string;
  requiresComment?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireDesign("masters");
    const code = normCode(params.code);
    const name = String(params.name || "").trim();
    if (!name) throw new Error("Name is required.");

    const payload = {
      code,
      name,
      target_coordination_status: normCode(params.targetCoordinationStatus),
      requires_comment: !!params.requiresComment,
      sort_order: Number(params.sortOrder) || 10,
      is_active: params.isActive !== false,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (params.id) {
      const { error } = await supabaseAdmin.from("drawing_review_outcomes").update(payload).eq("id", params.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("drawing_review_outcomes")
        .insert({ ...payload, created_by: user.id });
      if (error) throw error;
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not save review outcome." };
  }
}

export async function saveSlaStatusMasterAction(params: {
  id?: string;
  code: string;
  name: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireDesign("masters");
    const code = normCode(params.code);
    const name = String(params.name || "").trim();
    if (!name) throw new Error("Name is required.");

    const payload = {
      code,
      name,
      color: params.color || "#10B981",
      sort_order: Number(params.sortOrder) || 10,
      is_active: params.isActive !== false,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (params.id) {
      const { error } = await supabaseAdmin.from("drawing_sla_statuses").update(payload).eq("id", params.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("drawing_sla_statuses")
        .insert({ ...payload, created_by: user.id });
      if (error) throw error;
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not save SLA status." };
  }
}

export async function deleteCoordinationMasterAction(
  table: "drawing_schedule_intervals" | "drawing_coordination_statuses" | "drawing_review_outcomes" | "drawing_sla_statuses",
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireDesign("masters");
    const { error } = await supabaseAdmin
      .from(table)
      .update({ is_deleted: true, is_active: false, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Could not delete master record." };
  }
}
