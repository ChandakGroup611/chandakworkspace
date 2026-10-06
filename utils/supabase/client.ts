import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

  return createBrowserClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name) {
          if (typeof document === "undefined") return undefined;
          const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
          return match ? decodeURIComponent(match[2]) : undefined;
        },
        set(name, value, options) {
          if (typeof document === "undefined") return;
          const sessionOptions = { ...options };
          // Removing maxAge turns this into a session cookie (cleared on browser close)
          delete sessionOptions.maxAge;
          
          let cookieStr = `${name}=${encodeURIComponent(value)}; path=${sessionOptions.path || "/"}`;
          if (sessionOptions.domain) cookieStr += `; domain=${sessionOptions.domain}`;
          if (sessionOptions.secure) cookieStr += `; secure`;
          if (sessionOptions.sameSite) cookieStr += `; samesite=${sessionOptions.sameSite}`;
          
          document.cookie = cookieStr;
        },
        remove(name, options) {
          if (typeof document === "undefined") return;
          document.cookie = `${name}=; path=${options.path || "/"}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        },
      },
    }
  );
};
