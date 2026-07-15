-- Description: Expand vendor_master to include Contact, Address, Taxation, and Bank details for AMC integration.

BEGIN;

ALTER TABLE public.vendor_master
    -- Contact & Address Details
    ADD COLUMN IF NOT EXISTS contact_name TEXT,
    ADD COLUMN IF NOT EXISTS address_line1 TEXT,
    ADD COLUMN IF NOT EXISTS address_line2 TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT,
    ADD COLUMN IF NOT EXISTS pincode TEXT,
    -- Financial & Taxation Details
    ADD COLUMN IF NOT EXISTS tax_gstin TEXT,
    ADD COLUMN IF NOT EXISTS tax_pan TEXT,
    ADD COLUMN IF NOT EXISTS tax_code TEXT,
    -- Bank Details
    ADD COLUMN IF NOT EXISTS bank_name TEXT,
    ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
    ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
    ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;

COMMIT;
