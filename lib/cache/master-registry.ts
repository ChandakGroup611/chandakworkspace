import { unstable_cache, revalidateTag } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cache } from "react";

// The master registry utilizes a dedicated Server-Side Supabase Client (Service Role)
// to fetch masters globally, ensuring no RLS policies artificially segment global dictionaries.
function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ------------------------------------------------------------------
// GLOBAL CACHE METRICS (In-Memory for Command Center)
// ------------------------------------------------------------------
class CacheMetricsStore {
  public hits = 0;
  public misses = 0;

  recordHit() { this.hits++; }
  recordMiss() { this.misses++; }
  
  getRatio() {
    const total = this.hits + this.misses;
    if (total === 0) return 100;
    return (this.hits / total) * 100;
  }
}
export const masterCacheMetrics = new CacheMetricsStore();

// ------------------------------------------------------------------
// 1. GLOBAL MASTERS (Cached globally via Next.js unstable_cache)
// ------------------------------------------------------------------

export const getPriorities = unstable_cache(
  async () => {
    masterCacheMetrics.recordMiss();
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("priority_master")
      .select("id, name:priority_name, code:priority_code")
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("priority_name", { ascending: true });
    
    if (error) console.error("[Cache] Failed to fetch priorities", error);
    return data || [];
  },
  ["global_masters_priorities"],
  { tags: ["masters", "priorities"], revalidate: 3600 } // 1 hour TTL backup
);

export const getStatuses = unstable_cache(
  async () => {
    masterCacheMetrics.recordMiss();
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("status_master")
      .select("id, name:status_name, code:status_code, category")
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("status_name", { ascending: true });
      
    if (error) console.error("[Cache] Failed to fetch statuses", error);
    return data || [];
  },
  ["global_masters_statuses"],
  { tags: ["masters", "statuses"], revalidate: 3600 }
);

export const getCompanies = unstable_cache(
  async () => {
    masterCacheMetrics.recordMiss();
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from("company_master")
      .select("id, name:company_name, code:company_code")
      .eq("is_active", true)
      .eq("is_deleted", false)
      .order("company_name", { ascending: true });
      
    if (error) console.error("[Cache] Failed to fetch companies", error);
    return data || [];
  },
  ["global_masters_companies"],
  { tags: ["masters", "companies"], revalidate: 3600 }
);

// ------------------------------------------------------------------
// 2. CACHE INVALIDATION
// ------------------------------------------------------------------
export async function invalidateMasterCache(tag: 'masters' | 'priorities' | 'statuses' | 'companies') {
  // @ts-expect-error Types in some Next versions expect a second param
  revalidateTag(tag);
}

// ------------------------------------------------------------------
// 3. USER-SCOPED MASTERS (Cached per-request via React cache)
// ------------------------------------------------------------------
// We DO NOT use unstable_cache here because user-scoped data could leak across sessions.
// React's cache() ensures deduplication only within a single React Server Component request tree.

export const getUserScopedWorkspaces = cache(async (userId: string, tenantId: string = 'default') => {
  masterCacheMetrics.recordMiss();
  // We require the caller to pass the authenticated supabase client or user context
  const supabase = getAdminSupabase(); 
  
  // Example of isolated fetch mapping to a user
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(name, status_id)")
    .eq("user_id", userId);
    
  if (error) console.error("[Cache] Failed to fetch user workspaces", error);
  return data || [];
});

export const getUserScopedTeams = cache(async (userId: string, tenantId: string = 'default') => {
  masterCacheMetrics.recordMiss();
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("user_master")
    .select("id, full_name, role_id")
    .eq("is_active", true)
    // Add department scope filtering here in the future
    .order("full_name", { ascending: true });
    
  if (error) console.error("[Cache] Failed to fetch teams", error);
  return data || [];
});
