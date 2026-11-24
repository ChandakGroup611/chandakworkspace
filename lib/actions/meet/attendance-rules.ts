"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";
import { graceMinutes } from "@/lib/utils/meet-attendance";

export async function getAttendanceGrace(): Promise<number> {
  await requireMeet("MEET_VIEW");
  return graceMinutes();
}

export async function saveAttendanceGrace(minutes: number): Promise<{ success: boolean; error?: string }> {
  const auth = await requireMeet("MEET_ADMIN", { requireAdmin: true });
  const m = Math.round(Number(minutes));
  if (!Number.isFinite(m) || m < 0 || m > 120) return { success: false, error: "Enter 0 to 120 minutes." };
  const { error } = await supabaseAdmin.from("core_module_settings").upsert(
    { module_key: "meet", key: "attendance_rules", value_json: { grace_minutes: m }, updated_by: auth.userId, updated_at: new Date().toISOString() },
    { onConflict: "module_key,key" }
  );
  if (error) return { success: false, error: error.message };
  revalidatePath("/meet/admin");
  return { success: true };
}
