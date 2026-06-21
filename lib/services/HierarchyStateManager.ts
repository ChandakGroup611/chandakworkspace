/**
 * HierarchyStateManager
 *
 * Provides shared utilities for managing hierarchical React UI state, specifically:
 * - O(n) Single-traversal count bubbling
 * - O(n) Optimistic state preservation during prefetch merges
 * - Trash compliance (ignoring is_deleted records)
 */

export class HierarchyStateManager {
  /**
   * Bubbles task counts up the hierarchy in a single traversal.
   * Returns a tuple: { found: boolean, nodes: any[] }
   * 
   * @param nodes The current hierarchy level
   * @param targetId The ID of the parent node to which a task was added
   * @param countDelta Amount to increment (usually 1)
   */
  static bubbleTaskCount(nodes: any[], targetId: string, countDelta: number = 1): { found: boolean; nodes: any[] } {
    let foundInLevel = false;
    
    const updatedNodes = nodes.map(node => {
      // W3 Trash Compliance: Ignore deleted nodes
      if (node.is_deleted) return node;

      // Base Case: This is the target node
      if (node.id === targetId) {
        foundInLevel = true;
        const isWorkspace = node.type === 'WORKSPACE' || node.type === 'SUB_WORKSPACE';
        return {
          ...node,
          total_hierarchy_task_count: isWorkspace ? (node.total_hierarchy_task_count || 0) + countDelta : node.total_hierarchy_task_count,
          direct_task_count: isWorkspace ? (node.direct_task_count || 0) + countDelta : node.direct_task_count,
          child_task_count: (node.type === 'TASK' || node.type === 'SUB_TASK') ? (node.child_task_count || 0) + countDelta : node.child_task_count
        };
      }

      // Recursive Case: Check children
      if (node.children && node.children.length > 0) {
        const { found, nodes: newChildren } = this.bubbleTaskCount(node.children, targetId, countDelta);
        if (found) {
          foundInLevel = true;
          const isWorkspace = node.type === 'WORKSPACE' || node.type === 'SUB_WORKSPACE';
          return {
            ...node,
            children: newChildren,
            // Only increment hierarchy total on ancestors, not direct task counts
            total_hierarchy_task_count: isWorkspace ? (node.total_hierarchy_task_count || 0) + countDelta : node.total_hierarchy_task_count
          };
        }
      }

      return node;
    });

    return { found: foundInLevel, nodes: updatedNodes };
  }

  /**
   * Intelligently merges background fetched children into local state.
   * O(n) complexity via Set lookups.
   * Preserves optimistic inserts and respects optimistic deletions.
   * 
   * @param localChildren Existing children array in UI
   * @param fetchedChildren Children fetched from database
   */
  static mergePrefetchedChildren(localChildren: any[] | undefined, fetchedChildren: any[]): any[] {
    console.log("[PROFILER] PrefetchMerge_Start");
    console.time("PrefetchMerge_Duration");

    // Filter out deleted records from backend (W3 compliance backup)
    const validFetched = fetchedChildren.filter(c => !c.is_deleted);
    
    if (!localChildren || localChildren.length === 0) {
      console.timeEnd("PrefetchMerge_Duration");
      console.log("[PROFILER] PrefetchMerge_End");
      return validFetched;
    }

    const fetchedIds = new Set(validFetched.map(c => c.id));
    const merged = [...validFetched];

    // O(n) pass over local children to preserve optimistic states
    for (const local of localChildren) {
      if (local.is_deleted || local.isPendingDelete) {
        // Respect local deletions by removing from merged array if backend still returned it
        const idx = merged.findIndex(c => c.id === local.id);
        if (idx !== -1) merged.splice(idx, 1);
        continue;
      }

      if (local.isOptimistic) {
        // If it's optimistic and backend has it now, backend version replaces it (handled by initial copy)
        // If backend DOES NOT have it, we preserve the optimistic node
        if (!fetchedIds.has(local.id)) {
          merged.unshift(local);
        }
      }
    }

    console.timeEnd("PrefetchMerge_Duration");
    console.log("[PROFILER] PrefetchMerge_End");
    
    return merged;
  }
}
