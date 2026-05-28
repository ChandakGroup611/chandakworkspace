"use server";

import { masterCacheMetrics } from "@/lib/cache/master-registry";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function getPerformanceServerMetrics() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
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
