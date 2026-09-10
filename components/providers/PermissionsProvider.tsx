"use client";

import React, { createContext, useContext, ReactNode, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { fetchServerPermissions } from "@/lib/actions/auth-permissions";

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
      expanded.add(`${base}_EDIT`);
      expanded.add(`${base}_DELETE`);
      if (base === "SYSTEM_MASTERS") {
        expanded.add("MASTERS_VIEW");
        expanded.add("MASTERS_CREATE");
        expanded.add("MASTERS_UPDATE");
        expanded.add("MASTERS_EDIT");
        expanded.add("MASTERS_DELETE");
        expanded.add("MASTERS_MANAGE");
      }
      if (base === "MASTERS") {
        expanded.add("SYSTEM_MASTERS_VIEW");
        expanded.add("SYSTEM_MASTERS_CREATE");
        expanded.add("SYSTEM_MASTERS_UPDATE");
        expanded.add("SYSTEM_MASTERS_EDIT");
        expanded.add("SYSTEM_MASTERS_DELETE");
        expanded.add("SYSTEM_MASTERS_MANAGE");
      }
    } else if (p.endsWith("_CREATE") || p.endsWith("_UPDATE") || p.endsWith("_EDIT") || p.endsWith("_DELETE")) {
      const base = p.slice(0, p.lastIndexOf("_"));
      expanded.add(`${base}_VIEW`);
      if (p.endsWith("_UPDATE")) {
        expanded.add(`${base}_EDIT`);
      }
      if (p.endsWith("_EDIT")) {
        expanded.add(`${base}_UPDATE`);
      }
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
  created_at?: string;
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
    // 1. Listen for Auth State Changes (Login, Logout, Token Refresh, Initial Session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" || 
        event === "SIGNED_OUT" || 
        event === "INITIAL_SESSION" || 
        event === "TOKEN_REFRESHED" || 
        event === "USER_UPDATED"
      ) {
        queryClient.invalidateQueries({ queryKey: ["global_auth_context"] });
      }
    });

    // 2. Real-Time IAM Network Invalidation
    // Listen for any capability or role modifications and instantly update all connected sessions globally
    const channel = supabase.channel('iam_global_permissions_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' }, () => {
        console.log("[IAM] Role permissions modified globally. Instantly invalidating cache.");
        queryClient.invalidateQueries({ queryKey: ["global_auth_context"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, () => {
        console.log("[IAM] Role metadata modified globally. Instantly invalidating cache.");
        queryClient.invalidateQueries({ queryKey: ["global_auth_context"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_master' }, () => {
        console.log("[IAM] User profile/role modified globally. Instantly invalidating cache.");
        queryClient.invalidateQueries({ queryKey: ["global_auth_context"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        console.log("[IAM] User secondary roles modified globally. Instantly invalidating cache.");
        queryClient.invalidateQueries({ queryKey: ["global_auth_context"] });
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data, isLoading } = useQuery({
    queryKey: ['global_auth_context'],
    queryFn: async (): Promise<UnifiedAuthData> => {
      console.count('[PROFILER] loadAuthContext_executed');
      
      // PHASE 5: REAL-TIME PERMISSIONS RESOLUTION
      // We directly query the roles and role_permissions tables via Server Action to bypass client cookie/hydration staleness.
      const { profileData, secondaryRoles } = await fetchServerPermissions();

      let clientUser = null;
      if (!profileData) {
        // Fallback: check client session if server action did not find profile (e.g. edge cookie latency)
        const { data: sessionData } = await supabase.auth.getSession();
        clientUser = sessionData.session?.user || null;
      }

      if (!profileData && !clientUser) {
        return { profile: null, permissions: [], roleCode: null };
      }

      // Safety net: if they somehow bypassed the server layout and are deleted
      if (profileData?.is_deleted) {
        supabase.auth.signOut();
        if (typeof window !== 'undefined') window.location.href = '/login?error=account-deleted';
        return { profile: null, permissions: [], roleCode: null };
      }

      let primaryRole = profileData?.role;

      let baseRoleCode = null;
      if (profileData) {
        const dbRoleCode = Array.isArray(primaryRole) ? (primaryRole[0] as any)?.code : (primaryRole as any)?.code;
        if (dbRoleCode) {
          const upper = dbRoleCode.toUpperCase();
          if (upper === "SUPER_ADMIN" || upper === "ROLE_ADMIN" || upper === "ADMIN" || upper === "SUPERADMIN") {
            baseRoleCode = "SUPER_ADMIN";
          } else {
            baseRoleCode = dbRoleCode;
          }
        }
      }

      const profile: ProfileData = { 
        id: profileData?.id || clientUser?.id || "", 
        email: profileData?.email || clientUser?.email, 
        full_name: profileData?.full_name || clientUser?.user_metadata?.full_name || "Unknown User",
        profile_photo: profileData?.profile_photo || null,
        roleCode: baseRoleCode,
        created_at: profileData?.created_at
      };

      let finalRoleCode = baseRoleCode;
      const rawPermsSet = new Set<string>();

      // Extract permissions from primary role
      if (primaryRole) {
        const roleObj = Array.isArray(primaryRole) ? primaryRole[0] : primaryRole;
        if (roleObj?.role_permissions) {
          roleObj.role_permissions.forEach((rp: any) => {
            if (rp.permissions?.code) rawPermsSet.add(rp.permissions.code);
          });
        }
      }

      // Extract permissions from secondary roles
      if (secondaryRoles) {
        secondaryRoles.forEach((ur: any) => {
          const roleObj = Array.isArray(ur.role) ? ur.role[0] : ur.role;
          if (roleObj?.role_permissions) {
            roleObj.role_permissions.forEach((rp: any) => {
              if (rp.permissions?.code) rawPermsSet.add(rp.permissions.code);
            });
          }
        });
      }

      const rawPerms = Array.from(rawPermsSet);
      let perms: string[] = expandPermissions(rawPerms);

      // Force SUPER_ADMIN if detected in roles or explicitly mapped
      if (rawPerms.includes("SUPER_ADMIN")) {
        finalRoleCode = "SUPER_ADMIN";
      }

      return { profile, permissions: perms, roleCode: finalRoleCode };
    },
    staleTime: 10000,
    gcTime: 300000,
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
