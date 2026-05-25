import { createClient } from '@supabase/supabase-js';

// =========================================================================
// SECURE BACKEND-ONLY CLIENT
// This client bypasses all Row Level Security.
// It MUST ONLY be used inside the Repository layer and Server Actions.
// NEVER import this in a frontend/client component.
// =========================================================================

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key',
  {
    auth: {
      persistSession: false
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, { ...options, cache: 'no-store' });
      }
    }
  }
);
