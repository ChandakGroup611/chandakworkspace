-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Software AMC Extended Fields & Attachments Storage
-- ============================================================================

ALTER TABLE public.software_amc
    ADD COLUMN IF NOT EXISTS solution_name TEXT,
    ADD COLUMN IF NOT EXISTS po_number TEXT,
    ADD COLUMN IF NOT EXISTS po_date DATE,
    ADD COLUMN IF NOT EXISTS put_to_use_date DATE,
    ADD COLUMN IF NOT EXISTS renewal_period_type TEXT CHECK (renewal_period_type IN ('Yearly', 'Half-Yearly', 'Quarterly', 'Monthly', 'Custom') OR renewal_period_type IS NULL),
    ADD COLUMN IF NOT EXISTS vendor_contact_details TEXT,
    ADD COLUMN IF NOT EXISTS taxation_details TEXT,
    ADD COLUMN IF NOT EXISTS bank_details TEXT,
    ADD COLUMN IF NOT EXISTS industry_type TEXT,
    ADD COLUMN IF NOT EXISTS vendor_type TEXT,
    ADD COLUMN IF NOT EXISTS vendor_address TEXT,
    ADD COLUMN IF NOT EXISTS msme_number TEXT,
    ADD COLUMN IF NOT EXISTS specifications TEXT;

-- Storage Bucket for AMC Attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('amc-attachments', 'amc-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies
DROP POLICY IF EXISTS "Public View AMC Attachments" ON storage.objects;
CREATE POLICY "Public View AMC Attachments" ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'amc-attachments');

DROP POLICY IF EXISTS "Authenticated Upload AMC Attachments" ON storage.objects;
CREATE POLICY "Authenticated Upload AMC Attachments" ON storage.objects 
    FOR INSERT TO authenticated 
    WITH CHECK (bucket_id = 'amc-attachments');

DROP POLICY IF EXISTS "Authenticated Delete AMC Attachments" ON storage.objects;
CREATE POLICY "Authenticated Delete AMC Attachments" ON storage.objects 
    FOR DELETE TO authenticated 
    USING (bucket_id = 'amc-attachments');

-- End of Script
