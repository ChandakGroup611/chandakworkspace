import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

try {
  if (typeof require !== 'undefined') {
    const dotenv = require('dotenv');
    dotenv.config();
    dotenv.config({ path: '.env.production' });
    dotenv.config({ path: '.env.local' });
  }
} catch {}

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables.");
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const sessionOptions = { 
                ...options,
                sameSite: "lax" as const,
                secure: process.env.NODE_ENV === "production"
              };
              delete sessionOptions.maxAge; // Force session cookie
              delete sessionOptions.expires; // Also delete expires
              cookieStore.set(name, value, sessionOptions);
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};
