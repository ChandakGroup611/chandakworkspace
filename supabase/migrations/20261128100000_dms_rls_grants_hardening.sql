-- ============================================================================
-- DMS Post-Audit Security Hardening: Remove recursive RLS & residual grants
-- ============================================================================

-- 1. Remove legacy recursive SELECT policies on dms_folders / dms_documents / dms_document_versions
DROP POLICY IF EXISTS "rls_dms_folders_select" ON public.dms_folders;
DROP POLICY IF EXISTS "rls_dms_documents_select" ON public.dms_documents;
DROP POLICY IF EXISTS "rls_dms_doc_versions_select" ON public.dms_document_versions;

-- Replace with explicit client-deny policies (all DMS access runs server-side via service_role + SECURITY DEFINER RPCs)
DROP POLICY IF EXISTS "rls_dms_folders_deny" ON public.dms_folders;
CREATE POLICY "rls_dms_folders_deny" ON public.dms_folders
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "rls_dms_documents_deny" ON public.dms_documents;
CREATE POLICY "rls_dms_documents_deny" ON public.dms_documents
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "rls_dms_document_versions_deny" ON public.dms_document_versions;
CREATE POLICY "rls_dms_document_versions_deny" ON public.dms_document_versions
  FOR ALL USING (false) WITH CHECK (false);

-- 2. Revoke residual anon/authenticated/PUBLIC table grants on remaining DMS tables
REVOKE ALL ON public.dms_document_favourites FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.dms_document_folder_tags FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.dms_document_permissions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.dms_share_policy FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.dms_folders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.dms_documents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.dms_document_versions FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.dms_document_favourites TO service_role;
GRANT ALL ON public.dms_document_folder_tags TO service_role;
GRANT ALL ON public.dms_document_permissions TO service_role;
GRANT ALL ON public.dms_share_policy TO service_role;
GRANT ALL ON public.dms_folders TO service_role;
GRANT ALL ON public.dms_documents TO service_role;
GRANT ALL ON public.dms_document_versions TO service_role;
