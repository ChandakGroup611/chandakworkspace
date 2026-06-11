"use client";

import { usePermissionsContext } from "@/components/providers/PermissionsProvider";

/**
 * Global Profile Query
 * Now deduplicated via PermissionsProvider React Context.
 */
export function useProfile() {
  const context = usePermissionsContext();
  return {
    data: context.profile,
    isLoading: context.loading
  };
}

/**
 * Enterprise Permission Engine Hook
 * Now deduplicated via PermissionsProvider React Context.
 */
export function usePermissions() {
  return usePermissionsContext();
}
