"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { UserReportLayout } from "@/hooks/useLocalReportConfig";
import { unstable_noStore as noStore } from "next/cache";

export async function getUserReportLayout(reportCode: string): Promise<UserReportLayout[] | null> {
  noStore();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    console.error("[getUserReportLayout] Auth error:", userError);
    return null;
  }

  const { data, error } = await supabase
    .from("user_dashboard_preferences")
    .select("report_layouts")
    .eq("user_id", userData.user.id)
    .single();

  if (error) {
    console.error("[getUserReportLayout] DB query error:", error);
    return null;
  }
  if (!data || !data.report_layouts) {
    console.warn("[getUserReportLayout] No data or report_layouts found for user");
    return null;
  }

  const layouts = data.report_layouts as Record<string, UserReportLayout[]>;
  if (!layouts[reportCode]) {
    console.warn(`[getUserReportLayout] Layout for reportCode ${reportCode} not found in user preferences.`);
    return null;
  }

  console.log(`[getUserReportLayout] Successfully loaded layout for ${reportCode}`);
  return layouts[reportCode];
}

import { revalidatePath } from "next/cache";

export async function saveUserReportLayout(reportCode: string, layout: UserReportLayout[]): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return false;

  // First fetch existing preferences
  const { data, error } = await supabase
    .from("user_dashboard_preferences")
    .select("report_layouts")
    .eq("user_id", userData.user.id)
    .single();

  const existingLayouts = data?.report_layouts ? (data.report_layouts as Record<string, UserReportLayout[]>) : {};
  existingLayouts[reportCode] = layout;

  const { error: updateError } = await supabase
    .from("user_dashboard_preferences")
    .upsert({
      user_id: userData.user.id,
      report_layouts: existingLayouts,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

  if (updateError) {
    console.error("Failed to save report layout:", updateError);
    return false;
  }

  // Bust Next.js cache for the tasks and reports pages
  revalidatePath("/tasks");
  revalidatePath("/reports");

  return true;
}

export async function resetUserReportLayout(reportCode: string): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return false;

  // First fetch existing preferences
  const { data, error } = await supabase
    .from("user_dashboard_preferences")
    .select("report_layouts")
    .eq("user_id", userData.user.id)
    .single();

  if (error || !data || !data.report_layouts) return true;

  const existingLayouts = data.report_layouts as Record<string, UserReportLayout[]>;
  if (existingLayouts[reportCode]) {
    delete existingLayouts[reportCode];
    
    const { error: updateError } = await supabase
      .from("user_dashboard_preferences")
      .update({
        report_layouts: existingLayouts,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userData.user.id);

    if (updateError) return false;
  }

  return true;
}
