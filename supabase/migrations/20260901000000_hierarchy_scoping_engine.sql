-- ============================================================================
-- Enterprise Hierarchy Scoping Engine Migration
-- Platform: ADIOS OperationsOS
-- Purpose: Provides cycle-safe recursive CTEs for Reporting Manager Lineage
--          and Multi-Department Scoping (e.g. CFO / Multi-Department Heads)
-- ============================================================================

-- 1. Create Performance Indexes for Fast Tree Traversal
CREATE INDEX IF NOT EXISTS idx_user_master_manager_id_active
ON public.user_master(manager_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_user_master_department_id_active
ON public.user_master(department_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_departments_manager_id_active
ON public.departments(manager_id, is_deleted);

-- 2. Recursive CTE to get all direct & indirect subordinate users
CREATE OR REPLACE FUNCTION public.get_subordinate_user_ids(root_manager_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
AS $$
  WITH RECURSIVE subordinates(id, path) AS (
    -- Base case: users reporting directly to root_manager_id
    SELECT id, ARRAY[id]
    FROM public.user_master
    WHERE manager_id = root_manager_id 
      AND is_deleted = false

    UNION ALL

    -- Recursive case: users reporting to those subordinates
    SELECT u.id, s.path || u.id
    FROM public.user_master u
    JOIN subordinates s ON u.manager_id = s.id
    WHERE u.is_deleted = false
      AND NOT u.id = ANY(s.path) -- Cycle protection
  )
  SELECT id FROM subordinates
  UNION
  SELECT root_manager_id; -- Include root manager
$$;

-- 3. Function to get all managed department IDs (Direct + Subordinate Departments)
CREATE OR REPLACE FUNCTION public.get_user_managed_department_ids(target_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
AS $$
  -- Departments where user is direct manager / HOD
  SELECT id FROM public.departments 
  WHERE manager_id = target_user_id AND is_deleted = false
  
  UNION
  
  -- User's own assigned department
  SELECT department_id FROM public.user_master
  WHERE id = target_user_id AND department_id IS NOT NULL AND is_deleted = false
  
  UNION
  
  -- Departments of all subordinates in the manager's reporting line (e.g. for CFO / VP)
  SELECT department_id FROM public.user_master
  WHERE manager_id IN (SELECT public.get_subordinate_user_ids(target_user_id))
    AND department_id IS NOT NULL 
    AND is_deleted = false;
$$;
