"use server";

import { createClient as createServerClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { cookies } from "next/headers";
import { hasPermission } from "@/lib/permissions";

export async function saveDesignPreferences(payload: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("[Server Action] saveDesignPreferences Auth Error:", authError?.message || "No user found");
    return { success: false, error: "Unauthenticated request. Please log in." };
  }

  // Write to the user's configuration record using service role bypass
  const { error: dbError } = await supabaseAdmin
    .from("user_dashboard_preferences")
    .upsert({
      user_id: user.id,
      selected_theme: payload.theme || 'light-neumorphic',
      widget_layout: payload,
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
    console.error("[Server Action] fetchDesignPreferences Auth Error:", authError?.message || "No user found");
    return { success: false, data: null };
  }

  // Read from the user's configuration record using service role bypass
  const { data, error } = await supabaseAdmin
    .from("user_dashboard_preferences")
    .select("widget_layout")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    // If no preferences exist, return null instead of defaults.
    // This ensures we do not overwrite a new user's valid localStorage (e.g. they clicked Sun/Moon toggle)
    // with hardcoded defaults before they have actively saved to the DB.
    return { 
      success: true, 
      data: null 
    };
  }

  return { success: true, data: data.widget_layout };
}
