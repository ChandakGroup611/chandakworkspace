"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { getCachedUser } from "@/lib/auth/cached-user";
import { revalidatePath } from "next/cache";
import { requireMeet } from "@/lib/permissions/meet";
import { readMeetProjects } from "@/lib/utils/meet-projects";
import {
  DEFAULT_MEET_ROLE_MATRIX,
  type MeetingType,
  type PointCategory,
  type MeetingRoom,
  type MeetingTemplate,
  type MeetRoleMatrix,
} from "@/types/meet";

export async function getMeetingMasters() {
  await requireMeet("MEET_VIEW");
  try {
    const [typesRes, catsRes, roomsRes, templatesRes, deptsRes, usersRes, projectsRes] = await Promise.all([
      supabaseAdmin.from("meet_meeting_types").select("*").eq("is_active", true).order("sort_order"),
      supabaseAdmin.from("meet_point_categories").select("*").eq("is_active", true).order("name"),
      supabaseAdmin.from("meet_rooms").select("*").eq("is_active", true).order("name"),
      supabaseAdmin.from("meet_templates").select("*").eq("is_active", true).order("name"),
      supabaseAdmin.from("departments").select("id, name, code").eq("is_deleted", false).order("name"),
      supabaseAdmin.from("user_master").select("id, full_name, email, user_code, profile_photo, department_id").eq("is_deleted", false).eq("is_active", true).order("full_name"),
      readMeetProjects(),
    ]);

    return {
      types: (typesRes.data || []) as MeetingType[],
      categories: (catsRes.data || []) as PointCategory[],
      rooms: (roomsRes.data || []) as MeetingRoom[],
      templates: (templatesRes.data || []) as MeetingTemplate[],
      departments: deptsRes.data || [],
      users: usersRes.data || [],
      // Chandak Meet's own project master (Settings › Projects), not Workspace task projects
      projects: (projectsRes || []).filter((p) => p.active !== false).map((p) => ({ id: p.id, name: p.name, code: p.code })),
    };
  } catch (err: any) {
    console.error("Error fetching meet masters:", err);
    return {
      types: [],
      categories: [],
      rooms: [],
      templates: [],
      departments: [],
      users: [],
      projects: [],
    };
  }
}

export async function getMeetSettings(companyId?: string) {
  try {
    let query = supabaseAdmin.from("meet_settings").select("*");
    if (companyId) {
      query = query.eq("company_id", companyId);
    } else {
      query = query.is("company_id", null);
    }
    const { data } = await query.maybeSingle();
    return data;
  } catch (err: any) {
    console.error("Error fetching meet settings:", err);
    return null;
  }
}

export async function saveMeetingType(data: {
  id?: string;
  name: string;
  color: string;
  is_board_mode: boolean;
  sort_order: number;
  is_active?: boolean;
}) {
  try {
    await requireMeet("MEET_ADMIN", { requireAdmin: true });
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("meet_meeting_types")
        .update({
          name: data.name,
          color: data.color,
          is_board_mode: data.is_board_mode,
          sort_order: data.sort_order,
          is_active: data.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("meet_meeting_types").insert({
        name: data.name,
        color: data.color,
        is_board_mode: data.is_board_mode,
        sort_order: data.sort_order,
        is_active: true,
      });
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function savePointCategory(data: {
  id?: string;
  name: string;
  default_tat_days: number;
  department_id?: string | null;
  is_active?: boolean;
}) {
  try {
    await requireMeet("MEET_ADMIN", { requireAdmin: true });
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("meet_point_categories")
        .update({
          name: data.name,
          default_tat_days: data.default_tat_days,
          department_id: data.department_id || null,
          is_active: data.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("meet_point_categories").insert({
        name: data.name,
        default_tat_days: data.default_tat_days,
        department_id: data.department_id || null,
        is_active: true,
      });
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveMeetingRoom(data: {
  id?: string;
  name: string;
  location: string;
  capacity: number;
  facilities: any;
  is_active?: boolean;
}) {
  try {
    await requireMeet("MEET_ADMIN", { requireAdmin: true });
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("meet_rooms")
        .update({
          name: data.name,
          location: data.location,
          capacity: data.capacity,
          facilities: data.facilities,
          is_active: data.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("meet_rooms").insert({
        name: data.name,
        location: data.location,
        capacity: data.capacity,
        facilities: data.facilities,
        is_active: true,
      });
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveMeetingTemplate(data: {
  id?: string;
  name: string;
  description?: string;
  meeting_type_id?: string | null;
  default_duration: number;
  agenda_items: any[];
  is_active?: boolean;
}) {
  try {
    await requireMeet("MEET_ADMIN", { requireAdmin: true });
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("meet_templates")
        .update({
          name: data.name,
          description: data.description || null,
          meeting_type_id: data.meeting_type_id || null,
          default_duration: data.default_duration,
          agenda_items: data.agenda_items || [],
          is_active: data.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("meet_templates").insert({
        name: data.name,
        description: data.description || null,
        meeting_type_id: data.meeting_type_id || null,
        default_duration: data.default_duration,
        agenda_items: data.agenda_items || [],
        is_active: true,
      });
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveMeetSettings(settings: {
  working_days: number[];
  carry_escalation_count: number;
  due_soon_working_days: number;
  pre_update_hours_before: number;
  exclude_holidays: boolean;
  mom_requires_approval: boolean;
  mom_ack_required: boolean;
}) {
  try {
    await requireMeet("MEET_ADMIN", { requireAdmin: true });
    const { data: existing } = await supabaseAdmin
      .from("meet_settings")
      .select("id")
      .is("company_id", null)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("meet_settings")
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin.from("meet_settings").insert({
        ...settings,
        company_id: null,
      });
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


export async function getMeetRoleMatrix(): Promise<MeetRoleMatrix> {
  try {
    const { data } = await supabaseAdmin
      .from("core_module_settings")
      .select("value_json")
      .eq("module_key", "meet")
      .eq("key", "rbac_matrix")
      .maybeSingle();

    if (data?.value_json && Object.keys(data.value_json).length > 0) {
      return data.value_json as MeetRoleMatrix;
    }
    return DEFAULT_MEET_ROLE_MATRIX;
  } catch (err: any) {
    console.error("Error fetching meet role matrix:", err);
    return DEFAULT_MEET_ROLE_MATRIX;
  }
}

export async function saveMeetRoleMatrix(matrix: MeetRoleMatrix) {
  try {
    const { userId } = await requireMeet("MEET_ADMIN", { requireAdmin: true });

    const { error } = await supabaseAdmin
      .from("core_module_settings")
      .upsert(
        {
          module_key: "meet",
          key: "rbac_matrix",
          value_json: matrix,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "module_key,key" }
      );

    if (error) throw error;
    revalidatePath("/meet/admin");
    return { success: true };
  } catch (err: any) {
    console.error("Error saving meet role matrix:", err);
    return { success: false, error: err.message };
  }
}

