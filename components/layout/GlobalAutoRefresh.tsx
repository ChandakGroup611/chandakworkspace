"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Intercepts all outgoing fetch requests on the client side.
 * If a Server Action or a Supabase REST mutation (POST, PATCH, DELETE) succeeds,
 * it globally triggers `router.refresh()` to ensure the UI instantly reflects 
 * the database changes without a manual browser refresh.
 */
export default function GlobalAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : '');
        const opts = args[1] || {};
        
        // Extract method
        let method = 'GET';
        if (opts.method) {
          method = opts.method.toUpperCase();
        } else if (args[0] instanceof Request && args[0].method) {
          method = args[0].method.toUpperCase();
        }
        
        // NOTE: Next.js Server Actions (POST with Next-Action) MUST NOT trigger router.refresh().
        // In Next.js App Router, ALL Server Actions (including pure read queries like fetchLiveDashboardMetrics,
        // fetchServerPermissions, and registerUserSession) are sent as POST with the Next-Action header.
        // Intercepting them caused an infinite server-action refresh loop and continuous server CPU/query churn.
        // Components performing business mutations already invoke router.refresh() or state invalidation explicitly.

        // Detect direct Supabase REST mutations (POST, PATCH, DELETE) on business resource tables
        const isSupabaseMutation = 
          url.includes('.supabase.co/rest/v1/') && 
          ['POST', 'PATCH', 'DELETE'].includes(method) &&
          !url.includes('active_sessions') &&
          !url.includes('auth_session_logs');
        
        // Trigger auto-refresh only for explicit Supabase REST data mutations
        if (isSupabaseMutation && response.ok) {
           setTimeout(() => {
             router.refresh();
           }, 100);
        }
      } catch (e) {
        // Silently ignore intercept errors to ensure fetch always completes safely
        console.warn("Auto-refresh interceptor error:", e);
      }
      
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  return null;
}
