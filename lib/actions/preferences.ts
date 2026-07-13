"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { cookies } from "next/headers";
import { hasPermission } from "@/lib/permissions";

const MASTER_CONFIG_UUID = "b7539988-1e19-45b4-82d1-6d8b6d1abb81";

export async function saveDesignPreferences(payload: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please log in." };
  }

  // Ensure they have permission to modify the global theme
  const canManageTheme = await hasPermission(user.id, "SETTINGS_THEME_UPDATE") || await hasPermission(user.id, "SETTINGS_MANAGE");
  if (!canManageTheme) {
    return { success: false, error: "Unauthorized: You do not have permission to modify global enterprise theme settings." };
  }

  // Write to the global master configuration record using service role bypass
  const { error: dbError } = await supabaseAdmin
    .from("user_dashboard_preferences")
    .upsert({
      user_id: MASTER_CONFIG_UUID,
      selected_theme: payload.theme || 'pristine-white',
      widget_layout: payload,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

  if (dbError) {
    console.error("[Server Action] Preference save error:", dbError);
    return { success: false, error: `Failed to save global preferences: ${dbError.message}` };
  }

  return { success: true };
}

export async function fetchDesignPreferences() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, data: null };
  }

  // Read from the global master configuration record using service role bypass
  const { data, error } = await supabaseAdmin
    .from("user_dashboard_preferences")
    .select("widget_layout")
    .eq("user_id", MASTER_CONFIG_UUID)
    .single();

  if (error || !data) {
    return { success: false, data: null };
  }

  return { success: true, data: data.widget_layout };
}
