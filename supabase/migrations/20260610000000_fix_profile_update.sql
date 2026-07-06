-- ==============================================================================
-- FIX FOR PROFILE UPDATES & STORAGE UPSERTS
-- ==============================================================================

-- 1. Fix User Master Update Policy (Added WITH CHECK clause)
DROP POLICY IF EXISTS "user_master_super_admin_update" ON public.user_master;
DROP POLICY IF EXISTS "user_master_super_admin_update" ON public.user_master;
DROP POLICY IF EXISTS "user_master_super_admin_update" ON public.user_master;
CREATE POLICY "user_master_super_admin_update" ON public.user_master FOR UPDATE TO authenticated
USING (public.is_super_admin() OR id = auth.uid())
WITH CHECK (public.is_super_admin() OR id = auth.uid());

-- 2. Fix Storage Profiles Update Policy (Added WITH CHECK clause)
DROP POLICY IF EXISTS "User Self-Service Update" ON storage.objects;
CREATE POLICY "User Self-Service Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profiles' AND 
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'profiles' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Just in case, grant INSERT/SELECT/UPDATE for authenticated users explicitly for storage
-- (Already handled by policies, but ensuring no missing grants)
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
