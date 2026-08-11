"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { checkServerPermission } from "@/lib/permissions";

/**
 * Generic Settings Actions
 * Requires SUPER_ADMIN permissions.
 */

export async function saveSettingsEntity(tableName: string, payload: any, editId?: string, pathToRevalidate?: string) {
  const isSuperAdmin = await checkServerPermission("SUPER_ADMIN");
  const isSettingsManager = await checkServerPermission("SYSTEM_SETTINGS_MANAGE");
  const isAuthorized = isSuperAdmin || isSettingsManager;
  if (!isAuthorized) return { success: false, error: "Unauthorized." };

  const { supabaseAdmin } = await import("@/lib/supabase/service_role");

  let res;
  if (editId) {
    res = await supabaseAdmin
      .from(tableName)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", editId)
      .select()
      .single();
  } else {
    res = await supabaseAdmin
      .from(tableName)
      .insert([payload])
      .select()
      .single();
  }

  if (res.error) return { success: false, error: res.error.message };
  
  if (pathToRevalidate) {
    revalidatePath(pathToRevalidate);
  }
  
  return { success: true, data: res.data };
}

export async function getTemplates() {
  const isSuperAdmin = await checkServerPermission("SUPER_ADMIN");
  const isSettingsManager = await checkServerPermission("SYSTEM_SETTINGS_MANAGE");
  const isAuthorized = isSuperAdmin || isSettingsManager;
  if (!isAuthorized) return { success: false, error: "Unauthorized." };

  const { supabaseAdmin } = await import("@/lib/supabase/service_role");
  const { data, error } = await supabaseAdmin
    .from("email_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function deleteSettingsEntity(tableName: string, id: string, hardDelete = false, pathToRevalidate?: string) {
  const isSuperAdmin = await checkServerPermission("SUPER_ADMIN");
  const isSettingsManager = await checkServerPermission("SYSTEM_SETTINGS_MANAGE");
  const isAuthorized = isSuperAdmin || isSettingsManager;
  if (!isAuthorized) return { success: false, error: "Unauthorized." };

  const { supabaseAdmin } = await import("@/lib/supabase/service_role");

  let res;
  if (hardDelete) {
    res = await supabaseAdmin.from(tableName).delete().eq("id", id);
  } else {
    res = await supabaseAdmin.from(tableName).update({ is_deleted: true, updated_at: new Date().toISOString() }).eq("id", id);
  }

  if (res.error) return { success: false, error: res.error.message };
  
  if (pathToRevalidate) {
    revalidatePath(pathToRevalidate);
  }
  
  return { success: true };
}

export async function updateMyProfile(payload: any) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "Unauthenticated." };

  const { error } = await supabase
    .from("user_master")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
