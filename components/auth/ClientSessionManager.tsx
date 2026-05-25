"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ClientSessionManager() {
  useEffect(() => {
    const lastClosed = localStorage.getItem("adios_last_tab_closed");
    if (lastClosed) {
      const timeSinceClosed = Date.now() - parseInt(lastClosed);
      if (timeSinceClosed > 2500) {
        console.log("All tabs were closed previously. Forcing fresh login.");
        const supabase = createClient();
        supabase.auth.signOut().then(() => {
          localStorage.removeItem("adios_last_tab_closed");
          window.location.href = "/login?reason=timeout";
        });
        return;
      }
    }

    const keepAlive = setInterval(() => {
      localStorage.removeItem("adios_last_tab_closed");
    }, 1000);

    const handleUnload = () => {
      localStorage.setItem("adios_last_tab_closed", Date.now().toString());
    };
    
    window.addEventListener("beforeunload", handleUnload);
    
    return () => {
      clearInterval(keepAlive);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  return null;
}
