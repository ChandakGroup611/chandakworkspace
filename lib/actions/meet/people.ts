"use server";

import { supabaseAdmin } from "@/lib/supabase/service_role";
import { requireMeet } from "@/lib/permissions/meet";

/** Everyone active in the company, for person pickers. */
export async function getPeopleForPicker(): Promise<{ id: string; full_name: string; email: string | null }[]> {
  await requireMeet("MEET_VIEW");
  const { data } = await supabaseAdmin.from("user_master").select("id, full_name, email").eq("is_deleted", false).eq("is_active", true).order("full_name").limit(2000);
  return (data || []).map((u: any) => ({ id: u.id, full_name: u.full_name || u.email || "—", email: u.email || null }));
}
