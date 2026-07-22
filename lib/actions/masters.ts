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
  const isAuthorized = await checkServerPermission("SUPER_ADMIN");
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
  const isAuthorized = await checkServerPermission("SUPER_ADMIN");
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
  const isAuthorized = await checkServerPermission("SUPER_ADMIN");
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
      const { error } = await supabase.from(table).update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editId!);
      if (error) throw error;
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
