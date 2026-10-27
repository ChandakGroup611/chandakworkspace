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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL environment variable is missing.");
}

const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!rawKey || rawKey.includes('your_supabase_service_role_key_here') || rawKey === 'dummy_key' || rawKey.trim() === '') {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is missing or invalid. Backend admin client cannot initialize.");
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  rawKey.trim(),
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
