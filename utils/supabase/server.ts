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

const DEFAULT_SUPABASE_URL = "https://tkovzymkubxtpcgynkgd.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb3Z6eW1rdWJ4dHBjZ3lua2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODA2MjIsImV4cCI6MjA5NjU1NjYyMn0.CHw9iXsbW8Im7Ul4hnShVEOeZLWYHEJbvc3QG0VoK68";

export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY)!;

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
              const sessionOptions = { ...options };
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
