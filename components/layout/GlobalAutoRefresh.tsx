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
        
        // Detect Next.js Server Actions (they use POST with a Next-Action header)
        let isServerAction = false;
        if (opts.headers) {
          // Headers can be a Headers object or a plain record
          if (opts.headers instanceof Headers) {
            isServerAction = opts.headers.has('Next-Action') || opts.headers.has('next-action');
          } else {
            isServerAction = 'Next-Action' in opts.headers || 'next-action' in opts.headers;
          }
        }
        if (!isServerAction && args[0] instanceof Request) {
          isServerAction = args[0].headers.has('Next-Action') || args[0].headers.has('next-action');
        }
          
        // Detect Supabase direct REST mutations (POST, PATCH, DELETE)
        const isSupabaseMutation = url.includes('.supabase.co/rest/v1/') && ['POST', 'PATCH', 'DELETE'].includes(method);
        
        // Trigger auto-refresh if it's a successful mutation
        if ((isServerAction || isSupabaseMutation) && response.ok) {
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
