"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function saveDesignPreferences(payload: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Unauthenticated request. Please log in." };
  }

  // Update or insert into user_dashboard_preferences
  const { error: dbError } = await supabase
    .from("user_dashboard_preferences")
    .upsert({
      user_id: user.id,
      selected_theme: payload.theme || 'midnight-operations',
      widget_layout: payload, // Storing the full JSON preference blob here for ease
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

  if (dbError) {
    console.error("[Server Action] Preference save error:", dbError);
    return { success: false, error: `Failed to save preferences: ${dbError.message}` };
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

  const { data, error } = await supabase
    .from("user_dashboard_preferences")
    .select("widget_layout")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return { success: false, data: null };
  }

  return { success: true, data: data.widget_layout };
}
