-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Purpose: Create attachments table and storage buckets
-- ============================================================================

-- 1. Create centralized attachments table
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_type TEXT NOT NULL, -- e.g. 'ticket', 'chat', 'resolution'
    record_id UUID NOT NULL, -- The ID of the ticket or chat message
    file_name TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_attachments_record ON public.attachments(record_id, module_type) WHERE NOT is_deleted;

-- 2. Configure RLS for attachments table
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies for `attachments` will check if the user has access to the underlying record. 
-- Since a ticket could be fetched using `canAccessTicket` backend logic, it's safest to let the backend `service_role` 
-- evaluate visibility and generate signed URLs, or implement generic RLS mirroring `tickets` visibility.
-- For now, we allow SELECT if the user is the uploader, or via backend bypass.
DROP POLICY IF EXISTS policy_attachments_select ON public.attachments;
CREATE POLICY policy_attachments_select ON public.attachments
    FOR SELECT TO authenticated
    USING (uploaded_by = auth.uid() OR public.has_permission_snapshot('ATTACHMENTS_VIEW'));

DROP POLICY IF EXISTS policy_attachments_insert ON public.attachments;
CREATE POLICY policy_attachments_insert ON public.attachments
    FOR INSERT TO authenticated
    WITH CHECK (public.has_permission_snapshot('ATTACHMENTS_UPLOAD'));


-- 3. Configure Supabase Storage Buckets
-- (Assuming `storage.buckets` and `storage.objects` exist in Supabase standard schema)

INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('resolution-files', 'resolution-files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS for strictly private buckets
-- Note: Signed URLs bypass some RLS for reading if properly signed by service_role
DROP POLICY IF EXISTS "Deny public access to ticket-attachments" ON storage.objects;
CREATE POLICY "Deny public access to ticket-attachments" ON storage.objects FOR SELECT USING (bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated');

-- We'll manage uploads/downloads explicitly via Backend Server Actions using service_role and signed URLs.
