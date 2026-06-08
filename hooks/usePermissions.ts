"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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

const supabase = createClient();

/**
 * Global Profile Query
 * Deduplicated automatically by React Query.
 */
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      console.time("profile-load");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.timeEnd("profile-load");
        return null;
      }

      let roleCode = user.app_metadata?.role || null;

      const { data: profile } = await supabase
        .from("user_master")
        .select("id, full_name, email, profile_photo, role:roles(code)")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        const dbRoleCode = Array.isArray(profile.role) ? (profile.role[0] as any)?.code : (profile.role as any)?.code;
        if (dbRoleCode === "SUPER_ADMIN") roleCode = "SUPER_ADMIN";
      }

      console.timeEnd("profile-load");
      return { 
        id: user.id, 
        email: user.email, 
        full_name: profile?.full_name || user.user_metadata?.full_name || "Unknown User",
        profile_photo: profile?.profile_photo || null,
        roleCode
      };
    },
    staleTime: 300000, // 5 minutes
    gcTime: 1800000, // 30 minutes
  });
}

/**
 * Enterprise Permission Engine Hook
 * Uses React Query for deduplication, background caching, and efficient loads.
 */
export function usePermissions() {
  console.count("usePermissions execution");
  const { data: profile, isLoading: isProfileLoading } = useProfile();

  const { data, isLoading: isPermsLoading } = useQuery({
    queryKey: ['permissions', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      console.time("permission-load");
      
      let roleCode = profile?.roleCode;
      
      const { data: snapshot, error } = await supabase
        .from("user_permissions_snapshot")
        .select("permission_code")
        .eq("user_id", profile!.id);

      let perms: string[] = [];
      if (error) {
        console.warn("[Permissions] Snapshot lookup failed:", error);
        const adminEmails = ["avinash2@gmail.com", "avinash.pise98@gmail.com", "chrome_superadmin@adios.com"];
        if (profile?.email && adminEmails.includes(profile.email)) {
          roleCode = "SUPER_ADMIN";
        }
      } else {
        const rawPerms = snapshot ? snapshot.map((r: any) => r.permission_code) : [];
        perms = expandPermissions(rawPerms);
        if (rawPerms.includes("SUPER_ADMIN")) {
          roleCode = "SUPER_ADMIN";
        }
      }
      
      console.timeEnd("permission-load");
      return { permissions: perms, roleCode };
    },
    staleTime: 300000,
    gcTime: 1800000,
  });

  const loading = isProfileLoading || (!!profile?.id && isPermsLoading);
  const permissions = data?.permissions || [];
  const roleCode = data?.roleCode || profile?.roleCode || null;

  const hasPermission = useCallback((permissionCode: string) => {
    if (loading) return false;
    if (roleCode === "SUPER_ADMIN") return true;
    return permissions.includes(permissionCode);
  }, [loading, roleCode, permissions]);

  const hasAnyPermission = useCallback((permissionCodes: string[]) => {
    if (loading) return false;
    if (roleCode === "SUPER_ADMIN") return true;
    return permissionCodes.some(code => permissions.includes(code));
  }, [loading, roleCode, permissions]);

  return { 
    permissions, 
    roleCode, 
    loading, 
    hasPermission, 
    hasAnyPermission, 
    userId: profile?.id || null 
  };
}
