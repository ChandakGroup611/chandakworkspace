"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCompanies, fetchPriorities } from "@/lib/actions/workspaces";
import { createClient } from "@/utils/supabase/client";

// Global masters: Long cache (60 minutes)
export function usePriorities() {
  return useQuery({
    queryKey: ["masters", "priorities"],
    queryFn: async () => {
      // In P2, fetchPriorities was wrapped in unstable_cache on the server.
      // So this client fetch will hit a very fast server endpoint, and then React Query caches it in the browser.
      const data = await fetchPriorities();
      return data || [];
    },
    staleTime: 60 * 60 * 1000, // 60 minutes
  });
}

export function useCompanies() {
  return useQuery({
    queryKey: ["masters", "companies"],
    queryFn: async () => {
      const data = await fetchCompanies();
      return data || [];
    },
    staleTime: 60 * 60 * 1000,
  });
}

// Statuses might be in another action, for now we can mock or use a generic fetch if not implemented
export function useStatuses() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["masters", "statuses"],
    queryFn: async () => {
      // Direct DB call, relying on PostgREST cache if we don't have a Server Action for it yet
      const { data } = await supabase
        .from("status_master")
        .select("id, status_name, status_code, category")
        .eq("is_active", true)
        .eq("is_deleted", false);
      return data || [];
    },
    staleTime: 60 * 60 * 1000,
  });
}

// User-scoped masters: Short cache (5 minutes) and strict keys
export function useWorkspaceMembers(userId: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["masters", "workspaces", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(name, status_id)")
        .eq("user_id", userId);
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });
}
