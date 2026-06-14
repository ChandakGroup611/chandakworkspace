"use server";

import { masterCacheMetrics } from "@/lib/cache/master-registry";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { hasPermission } from "@/lib/permissions";

export async function getPerformanceServerMetrics() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const isSuperAdmin = await hasPermission(user.id, "SUPER_ADMIN");
  if (!isSuperAdmin) throw new Error("Forbidden: Super Admin access required");
  
  // Fetch Queue Health
  const { count: pendingCount } = await supabase.from("event_queue").select("*", { count: 'exact', head: true }).eq('status', 'PENDING');
  const { count: processingCount } = await supabase.from("event_queue").select("*", { count: 'exact', head: true }).eq('status', 'PROCESSING');
  const { count: failedCount } = await supabase.from("event_queue").select("*", { count: 'exact', head: true }).eq('status', 'FAILED');

  return {
    cacheHits: masterCacheMetrics.hits,
    cacheMisses: masterCacheMetrics.misses,
    cacheRatio: masterCacheMetrics.getRatio(),
    queue: {
      pending: pendingCount || 0,
      processing: processingCount || 0,
      failed: failedCount || 0
    }
  };
}
