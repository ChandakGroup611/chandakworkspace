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
  
  // 1. Fetch Templates
  const { data: templates, error } = await supabaseAdmin
    .from("email_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  // 2. Fetch Rules to map recipient_types
  const { data: rules } = await supabaseAdmin
    .from("notification_rules")
    .select("module, event, recipient_type");

  // 3. Map Rules into templates
  const enrichedTemplates = (templates || []).map((t: any) => {
    const matchingRule = (rules || []).find(r => r.module === t.module && r.event === t.event);
    return {
      ...t,
      recipient_types: matchingRule ? matchingRule.recipient_type || [] : []
    };
  });

  return { success: true, data: enrichedTemplates };
}

/**
 * Saves both the email template and its associated notification rule
 */
export async function saveTemplateAndRules(payload: any, editId?: string) {
  const isSuperAdmin = await checkServerPermission("SUPER_ADMIN");
  const isSettingsManager = await checkServerPermission("SYSTEM_SETTINGS_MANAGE");
  const isAuthorized = isSuperAdmin || isSettingsManager;
  if (!isAuthorized) return { success: false, error: "Unauthorized." };

  const { recipient_types, ...templatePayload } = payload;
  const { supabaseAdmin } = await import("@/lib/supabase/service_role");

  // 1. Save email_template
  let tplRes;
  if (editId) {
    tplRes = await supabaseAdmin
      .from("email_templates")
      .update({ ...templatePayload, updated_at: new Date().toISOString() })
      .eq("id", editId)
      .select()
      .single();
  } else {
    tplRes = await supabaseAdmin
      .from("email_templates")
      .insert([templatePayload])
      .select()
      .single();
  }

  if (tplRes.error) return { success: false, error: tplRes.error.message };

  // 2. Upsert notification_rule
  const { data: existingRule } = await supabaseAdmin
    .from("notification_rules")
    .select("id")
    .eq("module", templatePayload.module)
    .eq("event", templatePayload.event)
    .single();

  if (existingRule) {
    await supabaseAdmin
      .from("notification_rules")
      .update({ 
        recipient_type: recipient_types || [],
        updated_at: new Date().toISOString() 
      })
      .eq("id", existingRule.id);
  } else {
    await supabaseAdmin
      .from("notification_rules")
      .insert({
        module: templatePayload.module,
        event: templatePayload.event,
        recipient_type: recipient_types || [],
        is_active: true
      });
  }

  revalidatePath("/settings/communication/templates");
  return { success: true, data: tplRes.data };
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
