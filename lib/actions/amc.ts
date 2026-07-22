"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { checkServerPermission } from "@/lib/permissions";

/**
 * AMC Lifecycle Server Actions
 * Handles software_amc, amc_allocations, amc_invoices, amc_renewals, amc_transactions
 */

export async function saveAMCEntity(tableName: string, payload: any, editId?: string) {
  const isAuthorized = await checkServerPermission("SUPER_ADMIN");
  if (!isAuthorized) return { success: false, error: "Unauthorized." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let res;
  if (editId) {
    res = await supabase
      .from(tableName)
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", editId)
      .select()
      .single();
  } else {
    res = await supabase
      .from(tableName)
      .insert([payload])
      .select()
      .single();
  }

  if (res.error) return { success: false, error: res.error.message };
  return { success: true, data: res.data };
}

export async function deleteAMCEntity(tableName: string, id: string, hardDelete = false) {
  const isAuthorized = await checkServerPermission("SUPER_ADMIN");
  if (!isAuthorized) return { success: false, error: "Unauthorized." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let res;
  if (hardDelete) {
    res = await supabase.from(tableName).delete().eq("id", id);
  } else {
    res = await supabase.from(tableName).update({ is_deleted: true, updated_at: new Date().toISOString() }).eq("id", id);
  }

  if (res.error) return { success: false, error: res.error.message };
  return { success: true };
}
