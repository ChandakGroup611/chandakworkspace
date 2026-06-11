"use client";

import React, { createContext, useContext, ReactNode, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
interface UnifiedAuthData {
  profile: ProfileData | null;
  permissions: string[];
  roleCode: string | null;
}

  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        queryClient.invalidateQueries({ queryKey: ["global_auth_context"] });
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const { data, isLoading } = useQuery({
    queryKey: ['global_auth_context'],
    queryFn: async (): Promise<UnifiedAuthData> => {
      console.count('[PROFILER] loadAuthContext_executed');
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return { profile: null, permissions: [], roleCode: null };

      // PHASE 5: SAFE WATERFALL FLATTENING
      // Execute independent profile and permissions queries in parallel
      const [profileRes, permsRes] = await Promise.all([
        supabase
          .from("user_master")
          .select("id, full_name, email, profile_photo, role:roles(code)")
          .eq("id", user.id)
          .single(),
        supabase
          .from("user_permissions_snapshot")
          .select("permission_code")
          .eq("user_id", user.id)
      ]);

      const profileData = profileRes.data;
      const snapshot = permsRes.data;
      const error = permsRes.error;

      let baseRoleCode = user.app_metadata?.role || null;
      if (profileData) {
        const dbRoleCode = Array.isArray(profileData.role) ? (profileData.role[0] as any)?.code : (profileData.role as any)?.code;
        if (dbRoleCode === "SUPER_ADMIN") baseRoleCode = "SUPER_ADMIN";
      }

      const profile: ProfileData = { 
        id: user.id, 
        email: user.email, 
        full_name: profileData?.full_name || user.user_metadata?.full_name || "Unknown User",
        profile_photo: profileData?.profile_photo || null,
        roleCode: baseRoleCode
      };

      let finalRoleCode = baseRoleCode;
      let perms: string[] = [];

      if (error) {
        console.warn("[Permissions] Snapshot lookup failed:", error);
        const adminEmails = ["avinash2@gmail.com", "avinash.pise98@gmail.com", "chrome_superadmin@adios.com"];
        if (profile.email && adminEmails.includes(profile.email)) {
          finalRoleCode = "SUPER_ADMIN";
        }
      } else {
        const rawPerms = snapshot ? snapshot.map((r: any) => r.permission_code) : [];
        perms = expandPermissions(rawPerms);
        if (rawPerms.includes("SUPER_ADMIN")) {
          finalRoleCode = "SUPER_ADMIN";
        }
      }

      return { profile, permissions: perms, roleCode: finalRoleCode };
    },
    staleTime: 300000,
    gcTime: 1800000,
  });

  const loading = isLoading;
  const profile = data?.profile || null;
  const permissions = data?.permissions || [];
  const roleCode = data?.roleCode || null;

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
