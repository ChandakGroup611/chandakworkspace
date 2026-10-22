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
    return { success: false, error: "Unauthenticated request. Please log in." };
  }

  // Write to the user's configuration record using service role bypass
  const { error: dbError } = await supabaseAdmin
    .from("user_dashboard_preferences")
    .upsert({
      user_id: user.id,
      selected_theme: payload.theme || 'chandak-classic',
      widget_layout: payload,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

  if (dbError) {
    console.error("[Server Action] Preference save error:", dbError);
    return { success: false, error: `Failed to save preferences: ${dbError.message}` };
  }

  // Synchronize server-side cookies for instant rendering and middleware awareness
  try {
    const opts = { path: "/", maxAge: 31536000, sameSite: "lax" as const };
    if (payload.theme) cookieStore.set("chandak_theme_id", payload.theme, opts);
    if (payload.density) cookieStore.set("chandak_density", payload.density, opts);
    if (payload.fontFamily) cookieStore.set("chandak_font", payload.fontFamily, opts);
    if (payload.fontWeightProfile) cookieStore.set("chandak_weight", payload.fontWeightProfile, opts);
    if (payload.accentColor) cookieStore.set("chandak_accent", payload.accentColor, opts);
    if (payload.baseFontSize) cookieStore.set("chandak_base_size", String(payload.baseFontSize), opts);
    if (payload.subtextFontSize) cookieStore.set("chandak_subtext_size", String(payload.subtextFontSize), opts);
  } catch {}

  return { success: true };
}

export async function fetchDesignPreferences() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    // Unauthenticated or no session: return null quietly without emitting false-positive console error
    return { success: false, data: null };
  }

  // Read from the user's configuration record using service role bypass
  const { data, error } = await supabaseAdmin
    .from("user_dashboard_preferences")
    .select("widget_layout, selected_theme")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    // If no preferences exist, return null instead of defaults.
    return { 
      success: true, 
      data: null 
    };
  }

  const layout = (data.widget_layout as Record<string, any>) || {};
  if (!layout.theme && data.selected_theme) {
    layout.theme = data.selected_theme;
  }

  return { success: true, data: layout };
}
