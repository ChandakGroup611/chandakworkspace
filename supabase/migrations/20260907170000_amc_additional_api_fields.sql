-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: AMC & Subscription Additional API & Support Software Fields
-- ============================================================================

ALTER TABLE public.software_amc
    ADD COLUMN IF NOT EXISTS additional_api TEXT,
    ADD COLUMN IF NOT EXISTS additional_api_amount NUMERIC(15, 2);

-- End of Script
