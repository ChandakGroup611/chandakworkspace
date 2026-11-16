"use client";

/**
 * Finishes an invite / magic-link sign-in whose session arrives in the URL fragment
 * (#access_token=…&refresh_token=…), then hands over to /auth/callback (?resume=1), which applies the
 * usual checks: active account, assigned modules and landing page.
 */
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function AcceptInvitePage() {
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const next = query.get("next") || "/select-module";

    const errorCode = hash.get("error_code") || hash.get("error") || query.get("error_code") || query.get("error");
    if (errorCode) {
      const desc = hash.get("error_description") || query.get("error_description") || "Authentication failed";
      const code = /expired/i.test(errorCode + desc) ? "invitation-expired" : "invitation-error";
      window.location.replace(`/login?error=${code}&error_description=${encodeURIComponent(desc)}`);
      return;
    }

    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (!access_token || !refresh_token) {
      window.location.replace("/login?error=auth-callback-failed");
      return;
    }

    createClient().auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        setMessage("This sign-in link could not be used.");
        window.location.replace(`/login?error=invitation-error&error_description=${encodeURIComponent(error.message)}`);
        return;
      }
      // drop the tokens from the address bar before moving on
      window.history.replaceState(null, "", window.location.pathname);
      window.location.replace(`/auth/callback?resume=1&next=${encodeURIComponent(next)}`);
    });
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 text-center text-[14px] text-muted" role="status" aria-live="polite">
      {message}
    </div>
  );
}
