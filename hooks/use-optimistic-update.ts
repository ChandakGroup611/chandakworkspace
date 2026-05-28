"use client";

import { useQueryClient } from "@tanstack/react-query";

/**
 * Enterprise standard for Optimistic Updates with Rollback strategy.
 */
export function useOptimisticMutation() {
  const queryClient = useQueryClient();

  const performOptimisticUpdate = async (
    queryKey: string[],
    updateFn: (oldData: any) => any
  ) => {
    // Cancel any outgoing refetches so they don't overwrite our optimistic update
    await queryClient.cancelQueries({ queryKey });

    // Snapshot the previous value
    const previousData = queryClient.getQueryData(queryKey);

    // Optimistically update to the new value
    queryClient.setQueryData(queryKey, updateFn);

    // Return a context with the snapshotted value
    return { previousData };
  };

  const rollbackOptimisticUpdate = (queryKey: string[], context: any) => {
    if (context?.previousData) {
      queryClient.setQueryData(queryKey, context.previousData);
    }
  };

  const finalizeOptimisticUpdate = (queryKey: string[]) => {
    // Always refetch after error or success to ensure server sync
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    performOptimisticUpdate,
    rollbackOptimisticUpdate,
    finalizeOptimisticUpdate
  };
}
