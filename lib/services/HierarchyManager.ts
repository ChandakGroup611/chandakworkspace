import { supabaseAdmin } from "@/lib/supabase/service_role";

export class HierarchyManager {
  /**
   * Retrieves all descendant IDs for a given hierarchical entity.
   * Leverages Postgres Recursive CTEs for performance.
   * Enforces W3 Lifecycle Trash isolation (ignores is_deleted = true).
   *
   * @param entityType The type of entity (e.g., 'WORKSPACE', 'PROJECT')
   * @param entityId The root ID
   * @returns Array of UUID strings including the root and all descendants
   */
  static async getDescendants(entityType: string, entityId: string): Promise<string[]> {
    if (!entityId) return [];

    if (entityType === 'WORKSPACE') {
      const { data: descendants, error } = await supabaseAdmin
        .rpc('get_workspace_descendants', { root_id: entityId });

      if (error) {
        console.error(`[HierarchyManager] Error fetching workspace descendants for ${entityId}:`, error);
        // Fallback or throw based on strictness. Let's throw to avoid data corruption masking.
        throw new Error(`Failed to resolve hierarchy: ${error.message}`);
      }

      // RPC returns an array of strings if SETOF UUID, or objects if SETOF record
      if (!descendants || !Array.isArray(descendants)) return [entityId];

      return descendants.map((row: any) => {
        if (typeof row === 'string') return row;
        return row.get_workspace_descendants || row.id || Object.values(row)[0];
      });
    }

    // Future modules (PROJECT, etc.) will have their own RPCs mapped here
    throw new Error(`[HierarchyManager] Unsupported entity type for descendant resolution: ${entityType}`);
  }
}
