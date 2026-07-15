-- Migration to add remaining fields to vendor_master
ALTER TABLE public.vendor_master
    ADD COLUMN IF NOT EXISTS industry_type TEXT,
    ADD COLUMN IF NOT EXISTS vendor_type TEXT,
    ADD COLUMN IF NOT EXISTS bank_branch TEXT,
    ADD COLUMN IF NOT EXISTS bank_state TEXT,
    ADD COLUMN IF NOT EXISTS bank_city TEXT;
