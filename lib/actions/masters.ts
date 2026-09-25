"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { checkServerPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

/**
 * Enterprise Master Data Server Actions
 * Architecture: Scope-Driven, Relational, Real-time safe
 */

export async function fetchScopes() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("ticket_scopes")
    .select("*")
    .order("name");
  
  if (error) {
    console.error("Error fetching ticket scopes:", error);
    return [];
  }
  return data;
}

/**
 * Fetches all baseline masters mapped to a specific scope.
 * Target performance: <200ms
 */
export async function fetchMastersByScope(scopeId: string) {
  if (!scopeId) return {};
  
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  // 1. Resolve architectural mapping for the scope
  const { data: mappings, error: mapError } = await supabase
    .from("scope_master_mapping")
    .select("master_key")
    .eq("scope_id", scopeId);
  
  if (mapError) {
    console.error(`Error fetching mappings for scope ${scopeId}:`, mapError);
    return {};
  }
  
  const masterKeys = mappings.map(m => m.master_key);
  console.log(`[Masters] Fetching for scope: ${scopeId}, keys:`, masterKeys);
  
  // 2. Parallelized Execution of Scoped Master Queries
  const masterData = await Promise.all(masterKeys.map(async (key) => {
    let tableName = "";
    switch (key) {
      case "issue_type": tableName = "issue_types"; break;
      case "issue_subtype": tableName = "issue_subtypes"; break;
      case "ticket_category": tableName = "ticket_categories"; break;
      case "ticket_subcategory": tableName = "ticket_subcategories"; break;
      case "workflow_state": tableName = "status_master"; break;
      case "master_priority": tableName = "priority_master"; break;
      case "asset": tableName = "assets"; break;
      case "software_system": tableName = "software_systems"; break;
      case "software_module": tableName = "software_modules"; break;
      case "software_submodule": tableName = "software_submodules"; break;
    }
    
    if (!tableName) return { key, data: [] };

    let query = supabase.from(tableName).select("*");
    
    // Enforce STRICT scope isolation across all master tables
    query = query.eq("scope_id", scopeId);

    const { data, error } = await query
      .eq("is_active", true)
      .eq("is_deleted", false);
    
    if (error) {
      console.warn(`[Masters] Failed to fetch ${key}:`, error.message);
      return { key, data: [] };
    }
    
    // Polyfill renamed columns from Phase 4 Migration
    let finalData = data || [];
    if (tableName === "priority_master") {
      finalData = finalData.map(d => ({ 
        ...d, 
        name: d.priority_name || d.name, 
        code: d.priority_code || d.code,
        sla_target_minutes: d.max_sla_hours ? d.max_sla_hours * 60 : undefined
      }));
    }
    if (tableName === "status_master") {
      finalData = finalData.map(d => ({ ...d, name: d.status_name || d.name, code: d.status_code || d.code }));
    }
    
    return { key, data: finalData };
  }));

  const results: Record<string, any[]> = {};
  masterData.forEach(item => {
    if (item) results[item.key] = item.data;
  });

  return results;
}

/**
 * Real-time Dependency Filtering (Cascading Masters)
 */
export async function fetchDependentMasters(masterKey: string, parentId: string) {
  if (!parentId) return [];
  
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  let query: any = null;
  
  switch (masterKey) {
    case "issue_subtype":
      query = supabase.from("issue_subtypes").select("*").eq("issue_type_id", parentId);
      break;
    case "ticket_subcategory":
      query = supabase.from("ticket_subcategories").select("*").eq("category_id", parentId);
      break;
    case "software_module":
      query = supabase.from("software_modules").select("*").eq("system_id", parentId);
      break;
    case "software_submodule":
      query = supabase.from("software_submodules").select("*").eq("module_id", parentId);
      break;
    default:
      return [];
  }
  
  const { data, error } = await query
    .eq("is_active", true)
    .eq("is_deleted", false);
    
  if (error) {
    console.error(`Error fetching dependent master ${masterKey}:`, error);
    return [];
  }
  return data || [];
}

/**
 * Generic Master Action
 */
export async function saveMasterEntity(tableName: string, payload: any, editId?: string) {
  const isAuthorized = await checkServerPermission("SUPER_ADMIN") || 
                       await checkServerPermission("MASTERS_MANAGE") || 
                       await checkServerPermission("SYSTEM_MASTERS_MANAGE") ||
                       (editId ? (await checkServerPermission("MASTERS_UPDATE") || await checkServerPermission("MASTERS_EDIT")) : await checkServerPermission("MASTERS_CREATE"));
  if (!isAuthorized) return { success: false, error: "Unauthorized." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let res;
  if (editId) {
    res = await supabase.from(tableName).update(payload).eq("id", editId);
  } else {
    res = await supabase.from(tableName).insert([payload]);
  }

  if (res.error) return { success: false, error: res.error.message };
  return { success: true };
}

export async function deleteMasterEntity(tableName: string, id: string, hardDelete = false) {
  const isAuthorized = await checkServerPermission("SUPER_ADMIN") || 
                       await checkServerPermission("MASTERS_MANAGE") || 
                       await checkServerPermission("SYSTEM_MASTERS_MANAGE") ||
                       await checkServerPermission("MASTERS_DELETE");
  if (!isAuthorized) return { success: false, error: "Unauthorized." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let res;
  if (hardDelete) {
    res = await supabase.from(tableName).delete().eq("id", id);
  } else {
    res = await supabase.from(tableName).update({ is_deleted: true }).eq("id", id);
  }

  if (res.error) return { success: false, error: res.error.message };
  return { success: true };
}

/**
 * Handles Dynamic Masters (with audit & notifications)
 */
export async function executeMasterMutation(table: string, payload: any, action: "CREATE" | "UPDATE" | "ACTIVATE" | "DEACTIVATE" | "DELETE", editId?: string, originalRecord?: any) {
  const isAuthorized = await checkServerPermission("SUPER_ADMIN") || 
                       await checkServerPermission("MASTERS_MANAGE") || 
                       await checkServerPermission("SYSTEM_MASTERS_MANAGE") ||
                       (action === "CREATE" ? await checkServerPermission("MASTERS_CREATE") : 
                        action === "DELETE" ? await checkServerPermission("MASTERS_DELETE") : 
                        (await checkServerPermission("MASTERS_UPDATE") || await checkServerPermission("MASTERS_EDIT")));
  if (!isAuthorized) return { success: false, error: "Unauthorized." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  let recordId = editId;
  
  try {
    // 1. Core Mutation
    if (action === "CREATE") {
      const { data, error } = await supabase.from(table).insert([payload]).select().single();
      if (error) throw error;
      recordId = data?.id;
    } else if (action === "DELETE") {
      const { data, error } = await supabase.from(table).delete().eq('id', editId!).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Deletion failed. It may have already been deleted, or you don't have permission.");
    } else {
      let updateRes = await supabase.from(table).update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editId!);
      if (updateRes.error && updateRes.error.message?.includes('updated_at')) {
        updateRes = await supabase.from(table).update(payload).eq('id', editId!);
      }
      if (updateRes.error) throw updateRes.error;
    }

    // 2. Audit Log
    const auditPayload: any = {
      master_table: table,
      record_id: recordId || editId || "00000000-0000-0000-0000-000000000000",
      operation: action
    };
    if (action === "CREATE" || action === "UPDATE") auditPayload.after_values = payload;
    if (action === "DELETE") auditPayload.before_values = originalRecord;
    if (action === "ACTIVATE" || action === "DEACTIVATE") {
      auditPayload.before_values = { is_active: action === "DEACTIVATE" };
      auditPayload.after_values = { is_active: action === "ACTIVATE" };
    }
    await supabase.from("master_audit_logs").insert([auditPayload]);

    // 3. Notification (Skip for DELETE)
    if (action !== "DELETE") {
      const actionType = action === "CREATE" ? "create" : "update";
      let msg = `Master record status modified to '${action === "ACTIVATE" ? "ACTIVE" : "DISABLED"}' on relation '${table}'.`;
      if (action === "CREATE" || action === "UPDATE") {
        msg = `Master record '${payload.code || payload.name}' ${action.toLowerCase()}d in relation '${table}'.`;
      }
      
      await supabase.from("notification_queue").insert([{
        entity_type: table,
        entity_id: payload?.code || payload?.name || recordId || editId || "00000000-0000-0000-0000-000000000000",
        module: "masters",
        action_type: actionType,
        actor: "System Administrator",
        target_user_id: "GLOBAL_OPS",
        payload: { message: msg, values: payload },
        redirect_url: `/masters?scope=OTHER`,
        priority_level: "MEDIUM",
        is_read: false
      }]);
    }

    return { success: true, data: { id: recordId } };
  } catch (err: any) {
    return { success: false, error: err.message || JSON.stringify(err) };
  }
}

export async function fetchBusinessValues() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from('business_values')
    .select('*')
    .eq('is_deleted', false)
    .order('name');
  if (error) {
    console.error('Error fetching business values:', error);
    return [];
  }
  return data;
}

export async function createBusinessValue(name: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from('business_values')
    .insert([{ name }])
    .select()
    .single();
    
  if (error) {
    console.error('Error creating business value:', error);
    throw new Error(error.message);
  }
  return data;
}

export async function createIssueType(name: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from('issue_types')
    .insert([{ name, code: name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 30) }])
    .select()
    .single();
    
  if (error) {
    console.error('Error creating issue type:', error);
    throw new Error(error.message);
  }
  return data;
}

/**
 * Bulk Import Master Records from Spreadsheet (.xlsx / .csv)
 * Handles auto-mapping, parent resolution, and duplicate strategies
 */
export async function bulkImportMasterRecords(
  table: string,
  records: Array<{
    code?: string;
    name?: string;
    description?: string;
    parent_id?: string;
    parent_code?: string;
    parent_name?: string;
    asset_tag?: string;
    status_color?: string;
    priority_color?: string;
    sla_minutes?: number;
    scope_id?: string | null;
    [key: string]: any;
  }>,
  duplicateStrategy: "SKIP" | "OVERWRITE" = "SKIP",
  scopeId?: string | null,
  parentKey?: string | null,
  parentTable?: string | null
): Promise<{ success: boolean; added: number; updated: number; skipped: number; error?: string }> {
  try {
    const isAuthorized = await checkServerPermission("SUPER_ADMIN") || 
                         await checkServerPermission("MASTERS_MANAGE") || 
                         await checkServerPermission("SYSTEM_MASTERS_MANAGE") ||
                         await checkServerPermission("MASTERS_CREATE");
    if (!isAuthorized) {
      return { success: false, added: 0, updated: 0, skipped: 0, error: "Unauthorized. Missing master administration privileges." };
    }

    if (!records || records.length === 0) {
      return { success: false, added: 0, updated: 0, skipped: 0, error: "No records to import." };
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Fetch existing records for duplicate resolution
    let existingQuery = supabase.from(table).select("*");
    if (scopeId) {
      existingQuery = existingQuery.eq("scope_id", scopeId);
    }
    const { data: existingData, error: fetchErr } = await existingQuery;
    if (fetchErr) {
      console.warn(`[BulkImport] Could not fetch existing records for ${table}:`, fetchErr.message);
    }
    const existingList = (existingData || []).filter((r: any) => r.is_deleted !== true);

    // 2. Fetch parent records map if parent lookup is needed
    let parentMap: Map<string, string> = new Map();
    if (parentKey && parentTable) {
      try {
        const { data: pData } = await supabase.from(parentTable).select("id, code, name").eq("is_deleted", false);
        if (pData) {
          pData.forEach((p: any) => {
            if (p.id) parentMap.set(String(p.id).toLowerCase(), p.id);
            if (p.code) parentMap.set(String(p.code).toLowerCase(), p.id);
            if (p.name) parentMap.set(String(p.name).toLowerCase(), p.id);
          });
        }
      } catch (err) {
        console.warn(`[BulkImport] Parent lookup failed for ${parentTable}:`, err);
      }
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const raw of records) {
      const cleanCode = (raw.code || "").trim().toUpperCase();
      const cleanName = (raw.name || "").trim();
      if (!cleanCode && !cleanName) {
        skipped++;
        continue;
      }

      // Check existing duplicate by code or name
      const existing = existingList.find((ex: any) => {
        const exCode = (ex.code || ex.status_code || ex.priority_code || ex.company_code || "").trim().toUpperCase();
        const exName = (ex.name || ex.status_name || ex.priority_name || ex.company_name || "").trim().toLowerCase();
        if (cleanCode && exCode && exCode === cleanCode) return true;
        if (cleanName && exName && exName === cleanName.toLowerCase()) return true;
        return false;
      });

      // Resolve parent key if required
      let resolvedParentId = raw.parent_id || null;
      if (!resolvedParentId && (raw.parent_code || raw.parent_name) && parentMap.size > 0) {
        resolvedParentId = parentMap.get((raw.parent_code || raw.parent_name || "").trim().toLowerCase()) || null;
      }

      const payload: Record<string, any> = {
        description: raw.description ? String(raw.description).trim() : null,
        is_active: raw.is_active !== undefined ? Boolean(raw.is_active) : true,
        scope_id: scopeId || raw.scope_id || null
      };

      if (table === "status_master") {
        payload.status_code = cleanCode || cleanName.slice(0, 4).toUpperCase();
        payload.status_name = cleanName || cleanCode;
        payload.status_color = raw.status_color || raw.color || "#808080";
        if (scopeId === "e1f8e8e8-e1e1-4e1e-a1e1-e1e1e1e1e1e1") {
          payload.module = "infra"; payload.scope_type = "INFRA";
        } else if (scopeId === "e2f8e8e8-e2e2-4e2e-a2e2-e2e2e2e2e2e2") {
          payload.module = "erp"; payload.scope_type = "ERP";
        } else if (scopeId === "e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3") {
          payload.module = "workspaces"; payload.scope_type = "TASK";
        } else {
          payload.module = "requirements"; payload.scope_type = "REQUIREMENT";
        }
      } else if (table === "priority_master") {
        payload.priority_code = cleanCode || cleanName.slice(0, 4).toUpperCase();
        payload.priority_name = cleanName || cleanCode;
        payload.priority_color = raw.priority_color || raw.color || "#808080";
        const standardMinutes = Number(raw.sla_minutes) || 120;
        payload.max_sla_hours = Math.ceil(standardMinutes / 60);
        payload.warning_sla_hours = Math.max(1, Math.floor(standardMinutes / 60));
        payload.min_sla_hours = Math.max(1, Math.floor(standardMinutes * 0.5 / 60));
      } else if (table === "assets") {
        payload.code = cleanCode;
        payload.name = cleanName;
        payload.asset_tag = (raw.asset_tag || cleanCode).trim().toUpperCase();
        payload.status = raw.status || "OPERATIONAL";
        if (resolvedParentId) payload.department_id = resolvedParentId;
      } else if (table === "company_master") {
        payload.company_code = cleanCode;
        payload.company_name = cleanName;
        payload.short_name = raw.short_name || null;
        payload.email = raw.email || null;
        payload.phone = raw.phone || null;
        payload.address = raw.address || null;
        payload.remarks = raw.remarks || raw.description || null;
      } else if (table === "fleet_insurance_vendors") {
        payload.vendor_name = cleanName || cleanCode;
        payload.contact_person = raw.contact_person || raw.contact_name || null;
        payload.phone = raw.phone || null;
        payload.email = raw.email || null;
      } else if (table === "vendor_master") {
        payload.name = cleanName || cleanCode;
        payload.website = raw.website || null;
        payload.contact_name = raw.contact_name || raw.contact_person || null;
        payload.contact_email = raw.contact_email || raw.email || null;
        payload.phone = raw.phone || null;
        payload.address_line1 = raw.address_line1 || raw.address || null;
        payload.city = raw.city || null;
        payload.state = raw.state || null;
        payload.pincode = raw.pincode || null;
        payload.tax_gstin = raw.tax_gstin || raw.gstin || null;
        payload.tax_pan = raw.tax_pan || raw.pan || null;
      } else {
        payload.code = cleanCode;
        payload.name = cleanName;
        if (parentKey && resolvedParentId) {
          payload[parentKey] = resolvedParentId;
        }
      }

      if (existing) {
        if (duplicateStrategy === "OVERWRITE") {
          const { error: updErr } = await supabase.from(table).update({ ...payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
          if (!updErr) {
            updated++;
          } else {
            console.error(`[BulkImport] Update error on ${table}:`, updErr);
            skipped++;
          }
        } else {
          skipped++;
        }
      } else {
        const { error: insErr } = await supabase.from(table).insert([payload]);
        if (!insErr) {
          added++;
        } else {
          console.error(`[BulkImport] Insert error on ${table}:`, insErr);
          skipped++;
        }
      }
    }

    // 3. Audit Log
    try {
      await supabase.from("master_audit_logs").insert([{
        master_table: table,
        record_id: "00000000-0000-0000-0000-000000000000",
        operation: "BULK_IMPORT",
        after_values: { added, updated, skipped, totalRows: records.length, duplicateStrategy }
      }]);
    } catch (auditErr) {
      console.warn("[BulkImport] Audit log non-blocking error:", auditErr);
    }

    return { success: true, added, updated, skipped };
  } catch (err: any) {
    console.error(`[BulkImport] Fatal error on ${table}:`, err);
    return { success: false, added: 0, updated: 0, skipped: 0, error: err.message || "Failed to process bulk import." };
  }
}

