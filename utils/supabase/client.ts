import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = () => {
  const options: any = {};
  if (typeof window !== "undefined") {
    options.auth = {
      storage: window.localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    };
  }
  return createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
    options
  );
};
