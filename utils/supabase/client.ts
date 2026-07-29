import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tkovzymkubxtpcgynkgd.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrb3Z6eW1rdWJ4dHBjZ3lua2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODA2MjIsImV4cCI6MjA5NjU1NjYyMn0.CHw9iXsbW8Im7Ul4hnShVEOeZLWYHEJbvc3QG0VoK68";

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
