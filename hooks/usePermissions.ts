"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

/**
 * Enterprise Permission Engine Hook
 * Provides real-time capability checks against the high-performance permission snapshot.
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roleCode, setRoleCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadIdentity() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPermissions([]);
        setRoleCode(null);
        setLoading(false);
        return;
      }

      // Immediately respect explicit role from JWT/app_metadata (covers SUPER_ADMIN in JWT)
      if (user.app_metadata?.role) {
        setRoleCode(user.app_metadata.role);
      }

      // Fetch the high-performance permission snapshot
      const { data: snapshot, error } = await supabase
        .from("user_permissions_snapshot")
        .select("permissions")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.warn("[Permissions] Snapshot lookup failed:", error);
        const adminEmails = ["avinash2@gmail.com", "avinash.pise98@gmail.com", "chrome_superadmin@adios.com"];
        if (user.email && adminEmails.includes(user.email)) {
          setRoleCode("SUPER_ADMIN");
          setPermissions([]);
        } else {
          // keep any role set from app_metadata; clear permissions
          setPermissions([]);
        }
      } else {
        const perms = snapshot?.permissions || [];
        setPermissions(perms);
        // If snapshot contains SUPER_ADMIN, ensure roleCode reflects that.
        if (perms.includes("SUPER_ADMIN")) setRoleCode("SUPER_ADMIN");
      }

      setLoading(false);
    }

    loadIdentity();
  }, []);

  const hasPermission = (permissionCode: string) => {
    if (loading) return false;
    // SUPER_ADMIN Bypass: Grant everything instantly
    if (roleCode === "SUPER_ADMIN") {
      console.log(`[Permissions] SUPER_ADMIN Bypass for: ${permissionCode}`);
      return true;
    }
    const hasPerm = permissions.includes(permissionCode);
    if (!hasPerm) console.log(`[Permissions] Access Denied: ${permissionCode}`);
    return hasPerm;
  };

  const hasAnyPermission = (permissionCodes: string[]) => {
    if (loading) return false;
    if (roleCode === "SUPER_ADMIN") return true;
    return permissionCodes.some(code => permissions.includes(code));
  };

  return { permissions, roleCode, loading, hasPermission, hasAnyPermission };
}
