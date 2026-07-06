-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: Software AMC Extended JSON Fields
-- ============================================================================

ALTER TABLE public.software_amc
    ADD COLUMN IF NOT EXISTS solution_line_items JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS vendor_contact_json JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS taxation_json JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS bank_details_json JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS vendor_address_json JSONB DEFAULT '{}'::jsonb;

-- End of Script
