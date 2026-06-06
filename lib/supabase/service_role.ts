import { createClient } from '@supabase/supabase-js';

// =========================================================================
// SECURE BACKEND-ONLY CLIENT
// This client bypasses all Row Level Security.
// It MUST ONLY be used inside the Repository layer and Server Actions.
// NEVER import this in a frontend/client component.
// =========================================================================

const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const serviceKey = (rawKey && !rawKey.includes('your_supabase_service_role_key_here') && rawKey !== 'dummy_key' && rawKey.trim() !== '')
  ? rawKey
  : (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy_key');

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
  serviceKey,
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
