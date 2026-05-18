-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Cloud Storage Infrastructure for User Identity
-- Purpose: Establishes a secure, RLS-governed storage bucket for personnel 
--          profile imagery with automated visibility policies.
-- ============================================================================

-- 1. Initialize Profiles Storage Bucket
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Configure Zero-Trust Access Policies for Storage
-- ----------------------------------------------------------------------------

-- Allow public read access to profile photos (to show in Navbar/Directory)
DROP POLICY IF EXISTS "Public Profile Read Access" ON storage.objects;
CREATE POLICY "Public Profile Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

-- Allow authenticated users to upload their own profile photo
-- Path format expected: profiles/{user_id}/avatar.png
DROP POLICY IF EXISTS "User Self-Service Upload" ON storage.objects;
CREATE POLICY "User Self-Service Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profiles' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update/overwrite their own profile photo
DROP POLICY IF EXISTS "User Self-Service Update" ON storage.objects;
CREATE POLICY "User Self-Service Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profiles' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own profile photo
DROP POLICY IF EXISTS "User Self-Service Delete" ON storage.objects;
CREATE POLICY "User Self-Service Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profiles' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);
