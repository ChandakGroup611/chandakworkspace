import { createClient } from '@supabase/supabase-js';

// =========================================================================
// SECURE BACKEND-ONLY CLIENT
// This client bypasses all Row Level Security.
// It MUST ONLY be used inside the Repository layer and Server Actions.
// NEVER import this in a frontend/client component.
// =========================================================================

try {
  if (typeof require !== 'undefined') {
    const dotenv = require('dotenv');
    dotenv.config();
    dotenv.config({ path: '.env.production' });
    dotenv.config({ path: '.env.local' });
  }
} catch {}

const DEFAULT_SUPABASE_URL = 'https://tkovzymkubxtpcgynkgd.supabase.co';

const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const serviceKey = (rawKey && !rawKey.includes('your_supabase_service_role_key_here') && rawKey !== 'dummy_key' && rawKey.trim() !== '')
  ? rawKey
  : (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key');

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
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
