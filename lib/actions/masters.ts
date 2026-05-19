"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

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
      case "workflow_state": tableName = "workflow_states"; break;
      case "master_priority": tableName = "master_priorities"; break;
      case "asset": tableName = "assets"; break;
      case "software_system": tableName = "software_systems"; break;
      case "software_module": tableName = "software_modules"; break;
      case "software_submodule": tableName = "software_submodules"; break;
    }
    
    if (!tableName) return { key, data: [] };

    let query = supabase.from(tableName).select("*");
    
    // Support global/shared masters (scope_id is null)
    if (key === "workflow_state" || key === "master_priority") {
      query = query.or(`scope_id.eq.${scopeId},scope_id.is.null`);
    } else {
      query = query.eq("scope_id", scopeId);
    }

    const { data, error } = await query
      .eq("is_active", true)
      .eq("is_deleted", false);
    
    if (error) {
      console.warn(`[Masters] Failed to fetch ${key}:`, error.message);
      return { key, data: [] };
    }
    return { key, data: data || [] };
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
