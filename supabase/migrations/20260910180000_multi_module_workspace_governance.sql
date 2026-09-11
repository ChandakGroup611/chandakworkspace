-- ==============================================================================
-- Enterprise Multi-Module Workspace Governance
-- Enables module segmentation: Task Workflow, Fleet & Vehicle Management, Design Tracking
-- ==============================================================================

-- 1. Modules Master Table
CREATE TABLE IF NOT EXISTS public.modules_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'FolderKanban',
    route_path TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. User Module Permissions Table
CREATE TABLE IF NOT EXISTS public.user_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_master(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.modules_master(id) ON DELETE CASCADE,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_module UNIQUE (user_id, module_id)
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_modules_user_id ON public.user_modules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_modules_module_id ON public.user_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_modules_master_code ON public.modules_master(code);

-- 4. Enable Row Level Security
ALTER TABLE public.modules_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Allow anyone authenticated to read active modules
DROP POLICY IF EXISTS "Allow authenticated to view active modules" ON public.modules_master;
CREATE POLICY "Allow authenticated to view active modules"
ON public.modules_master
FOR SELECT
TO authenticated, anon
USING (is_active = true);

-- Allow users to view their own assigned modules
DROP POLICY IF EXISTS "Users can view own modules" ON public.user_modules;
CREATE POLICY "Users can view own modules"
ON public.user_modules
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
    )
);

-- Allow admins to manage user modules
DROP POLICY IF EXISTS "Admins can manage user modules" ON public.user_modules;
CREATE POLICY "Admins can manage user modules"
ON public.user_modules
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_master um
        JOIN public.roles r ON um.role_id = r.id
        WHERE um.id = auth.uid() AND r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
    )
);

-- Grant privileges
GRANT SELECT ON public.modules_master TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_modules TO authenticated;

-- 6. Seed Modules Master
INSERT INTO public.modules_master (code, name, description, icon, route_path, display_order, is_active)
VALUES 
  ('TASK_WORKFLOW', 'Task & Operations Workflow', 'Workspaces, tasks, requirements, ticketing & AMC lifecycle', 'FolderKanban', '/', 1, true),
  ('VEHICLE_DESK', 'Fleet & Vehicle Management', 'Vehicle allocation, trip sheets, drivers, fuel & maintenance logs', 'Car', '/vehicle', 2, true),
  ('DESIGN_TRACKING', 'Design Tracking', 'Architectural drawings, CAD revisions, approvals & handover pipeline', 'Compass', '/design', 3, true)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    route_path = EXCLUDED.route_path,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 7. Seed User Modules:
-- Give all active users default access to TASK_WORKFLOW
INSERT INTO public.user_modules (user_id, module_id, is_default)
SELECT 
    um.id,
    mm.id,
    true
FROM public.user_master um
CROSS JOIN public.modules_master mm
WHERE mm.code = 'TASK_WORKFLOW'
  AND um.is_deleted = false
ON CONFLICT (user_id, module_id) DO UPDATE SET is_default = true;

-- Give SUPER_ADMIN and ROLE_ADMIN users access to VEHICLE_DESK and DESIGN_TRACKING
INSERT INTO public.user_modules (user_id, module_id, is_default)
SELECT 
    um.id,
    mm.id,
    false
FROM public.user_master um
JOIN public.roles r ON um.role_id = r.id
CROSS JOIN public.modules_master mm
WHERE r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')
  AND mm.code IN ('VEHICLE_DESK', 'DESIGN_TRACKING')
  AND um.is_deleted = false
ON CONFLICT (user_id, module_id) DO NOTHING;

-- 8. Trigger to automatically assign default TASK_WORKFLOW module to new users
CREATE OR REPLACE FUNCTION public.handle_new_user_module_assignment()
RETURNS TRIGGER AS $$
DECLARE
    task_module_id UUID;
    is_admin BOOLEAN;
BEGIN
    SELECT id INTO task_module_id FROM public.modules_master WHERE code = 'TASK_WORKFLOW' LIMIT 1;
    
    IF task_module_id IS NOT NULL THEN
        INSERT INTO public.user_modules (user_id, module_id, is_default)
        VALUES (NEW.id, task_module_id, true)
        ON CONFLICT (user_id, module_id) DO NOTHING;
    END IF;

    -- If created as admin, also grant other modules
    SELECT (r.code IN ('SUPER_ADMIN', 'ROLE_ADMIN')) INTO is_admin
    FROM public.roles r WHERE r.id = NEW.role_id;

    IF is_admin IS TRUE THEN
        INSERT INTO public.user_modules (user_id, module_id, is_default)
        SELECT NEW.id, mm.id, false
        FROM public.modules_master mm
        WHERE mm.code IN ('VEHICLE_DESK', 'DESIGN_TRACKING')
        ON CONFLICT (user_id, module_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_assign_default_user_modules ON public.user_master;
CREATE TRIGGER trg_assign_default_user_modules
AFTER INSERT ON public.user_master
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_module_assignment();
