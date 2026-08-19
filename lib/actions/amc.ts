"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { checkServerPermission } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabase/service_role";

/**
 * AMC Lifecycle Server Actions
 * Handles software_amc, amc_allocations, amc_invoices, amc_renewals, amc_transactions
 */

export async function saveAMCEntity(tableName: string, payload: any, editId?: string) {
  const isAuthorized = await checkServerPermission("SUPER_ADMIN");
  if (!isAuthorized) return { success: false, error: "Unauthorized." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Prevent setting updated_at on tables that don't have this column
  const tablesWithoutUpdatedAt = [
    "amc_invoices",
    "amc_transactions", 
    "amc_renewals",
    "amc_license_allocations"
  ];

  let res;
  if (editId) {
    const updatePayload = { ...payload };
    if (!tablesWithoutUpdatedAt.includes(tableName)) {
      updatePayload.updated_at = new Date().toISOString();
    }

    res = await supabase
      .from(tableName)
      .update(updatePayload)
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

  // Prevent setting updated_at on tables that don't have this column
  const tablesWithoutUpdatedAt = [
    "amc_invoices",
    "amc_transactions", 
    "amc_renewals",
    "amc_license_allocations"
  ];

  // If we are deleting the main AMC, check for active transactions or invoices
  if (tableName === 'software_amc' && !hardDelete) {
    const { data: activeTx } = await supabaseAdmin.from('amc_transactions').select('id').eq('amc_id', id).eq('is_deleted', false).limit(1);
    if (activeTx && activeTx.length > 0) return { success: false, error: "Cannot delete AMC because it has active transactions." };
    
    const { data: activeInv } = await supabaseAdmin.from('amc_invoices').select('id').eq('amc_id', id).eq('is_deleted', false).limit(1);
    if (activeInv && activeInv.length > 0) return { success: false, error: "Cannot delete AMC because it has active invoices." };
  }

  let res;
  if (hardDelete) {
    res = await supabase.from(tableName).delete().eq("id", id);
  } else {
    const updatePayload: any = { is_deleted: true };
    if (!tablesWithoutUpdatedAt.includes(tableName)) {
      updatePayload.updated_at = new Date().toISOString();
    }
    res = await supabase.from(tableName).update(updatePayload).eq("id", id);
  }

  if (res.error) return { success: false, error: res.error.message };
  return { success: true };
}
