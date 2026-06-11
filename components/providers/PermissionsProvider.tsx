"use client";

import React, { createContext, useContext, ReactNode, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

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

interface ProfileData {
  id: string;
  email: string | undefined;
  full_name: string;
  profile_photo: string | null;
  roleCode: string | null;
}

interface PermissionsContextValue {
  profile: ProfileData | null;
  permissions: string[];
  roleCode: string | null;
  loading: boolean;
  hasPermission: (permissionCode: string) => boolean;
  hasAnyPermission: (permissionCodes: string[]) => boolean;
  userId: string | null;
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  // Global Profile Query
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return null;

      let roleCode = user.app_metadata?.role || null;

      const { data: profileData } = await supabase
        .from("user_master")
        .select("id, full_name, email, profile_photo, role:roles(code)")
        .eq("id", user.id)
        .single();
      
      if (profileData) {
        const dbRoleCode = Array.isArray(profileData.role) ? (profileData.role[0] as any)?.code : (profileData.role as any)?.code;
        if (dbRoleCode === "SUPER_ADMIN") roleCode = "SUPER_ADMIN";
      }

      return { 
        id: user.id, 
        email: user.email, 
        full_name: profileData?.full_name || user.user_metadata?.full_name || "Unknown User",
        profile_photo: profileData?.profile_photo || null,
        roleCode
      };
    },
    staleTime: 300000,
    gcTime: 1800000,
  });

  // Global Permissions Query
  const { data: permsData, isLoading: isPermsLoading } = useQuery({
    queryKey: ['permissions', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
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
      
      return { permissions: perms, roleCode };
    },
    staleTime: 300000,
    gcTime: 1800000,
  });

  const loading = isProfileLoading || (!!profile?.id && isPermsLoading);
  const permissions = permsData?.permissions || [];
  const roleCode = permsData?.roleCode || profile?.roleCode || null;

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

  const value = {
    profile: profile || null,
    permissions,
    roleCode,
    loading,
    hasPermission,
    hasAnyPermission,
    userId: profile?.id || null
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissionsContext() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error("usePermissionsContext must be used within a PermissionsProvider");
  }
  return context;
}
