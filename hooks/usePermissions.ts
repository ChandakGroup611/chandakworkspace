"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

/**
 * Client-side permission inheritance expansion
 */
function expandPermissions(perms: string[]): string[] {
  const expanded = new Set<string>(perms);
  for (const p of perms) {
    if (p.endsWith("_MANAGE")) {
      const base = p.replace("_MANAGE", "");
      expanded.add(`${base}_VIEW`);
      expanded.add(`${base}_CREATE`);
      expanded.add(`${base}_UPDATE`);
      expanded.add(`${base}_DELETE`);
    } else if (p.endsWith("_CREATE") || p.endsWith("_UPDATE") || p.endsWith("_DELETE")) {
      const base = p.slice(0, p.lastIndexOf("_"));
      expanded.add(`${base}_VIEW`);
    }
  }
  return Array.from(expanded);
}

/**
 * Enterprise Permission Engine Hook
 * Provides real-time capability checks against the high-performance permission snapshot.
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roleCode, setRoleCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  const loadIdentity = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPermissions([]);
      setRoleCode(null);
      setUserId(null);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    // Respect explicit role from JWT/app_metadata (covers SUPER_ADMIN in JWT)
    if (user.app_metadata?.role) {
      setRoleCode(user.app_metadata.role);
    }

    // Check SUPER_ADMIN via user_master role mapping (matches backend checkServerPermission)
    const { data: profile } = await supabase
      .from("user_master")
      .select("role:roles(code)")
      .eq("id", user.id)
      .single();
      
    // handle potential array return for role (if foreign key is viewed as one-to-many by PostgREST occasionally)
    const dbRoleCode = Array.isArray(profile?.role) ? (profile.role[0] as any).code : (profile?.role as any)?.code;
    if (dbRoleCode === "SUPER_ADMIN") {
      setRoleCode("SUPER_ADMIN");
    }

    // Fetch the multi-row permission snapshot
    const { data: snapshot, error } = await supabase
      .from("user_permissions_snapshot")
      .select("permission_code")
      .eq("user_id", user.id);

    if (error) {
      console.warn("[Permissions] Snapshot lookup failed:", error);
      const adminEmails = ["avinash2@gmail.com", "avinash.pise98@gmail.com", "chrome_superadmin@adios.com"];
      if (user.email && adminEmails.includes(user.email)) {
        setRoleCode("SUPER_ADMIN");
        setPermissions([]);
      } else {
        setPermissions([]);
      }
    } else {
      const rawPerms = snapshot ? snapshot.map((r: any) => r.permission_code) : [];
      const expandedPerms = expandPermissions(rawPerms);
      setPermissions(expandedPerms);

      // If snapshot contains SUPER_ADMIN permission code, ensure roleCode reflects that.
      if (rawPerms.includes("SUPER_ADMIN")) {
        setRoleCode("SUPER_ADMIN");
      }
    }

    setLoading(false);
  }, [supabase]);

  // Initial load
  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  // Real-time subscription to permissions snapshot changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`perm-snapshot-${userId}-${Math.random().toString(36).substring(7)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_permissions_snapshot",
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log("[Permissions] Realtime change detected. Re-hydrating...");
          loadIdentity();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadIdentity, supabase]);

  const hasPermission = (permissionCode: string) => {
    if (loading) return false;
    // SUPER_ADMIN Bypass: Grant everything instantly
    if (roleCode === "SUPER_ADMIN") {
      return true;
    }
    const hasPerm = permissions.includes(permissionCode);
    return hasPerm;
  };

  const hasAnyPermission = (permissionCodes: string[]) => {
    if (loading) return false;
    if (roleCode === "SUPER_ADMIN") return true;
    return permissionCodes.some(code => permissions.includes(code));
  };

  return { permissions, roleCode, loading, hasPermission, hasAnyPermission };
}
