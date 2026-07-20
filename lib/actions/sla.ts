"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

export async function fetchSLARules() {
  noStore();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("ticket_sla_policies")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });
    
  if (error) {
    console.error("[SLA] Error fetching rules:", error);
    return [];
  }
  return data || [];
}

export async function saveSLARule(payload: any) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  // Protect codes for existing rows if needed
  if (payload.id) {
    const { error } = await supabase
      .from("ticket_sla_policies")
      .update({
        name: payload.name,
        code: payload.code,
        response_target_minutes: payload.response_target_minutes,
        resolution_target_minutes: payload.resolution_target_minutes,
        working_hours_code: payload.working_hours_code,
        escalation_level: payload.escalation_level
      })
      .eq("id", payload.id);
      
    if (error) throw new Error(`Failed to update SLA Rule: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("ticket_sla_policies")
      .insert([{
        name: payload.name,
        code: payload.code,
        response_target_minutes: payload.response_target_minutes,
        resolution_target_minutes: payload.resolution_target_minutes,
        working_hours_code: payload.working_hours_code,
        escalation_level: payload.escalation_level
      }]);
      
    if (error) throw new Error(`Failed to create SLA Rule: ${error.message}`);
  }
  
  revalidatePath("/sla/rules");
}

export async function deleteSLARule(id: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { error } = await supabase
    .from("ticket_sla_policies")
    .update({ is_deleted: true })
    .eq("id", id);
    
  if (error) throw new Error(`Failed to delete SLA Rule: ${error.message}`);
  
  revalidatePath("/sla/rules");
}
