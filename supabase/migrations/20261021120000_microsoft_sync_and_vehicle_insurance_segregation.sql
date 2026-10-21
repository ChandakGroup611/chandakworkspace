-- ==============================================================================
-- Migration: Microsoft Profile Sync & Vehicle Insurance Segregation
-- 
-- 1. Adds non-destructive profile synchronization columns to user_master
-- 2. Adds insurance_category to insurance_policies
-- 3. Adds segregated Own & Third Party insurance columns to vehicles
-- ==============================================================================

-- 1. USER MASTER: Microsoft Profile Fields
ALTER TABLE public.user_master
  ADD COLUMN IF NOT EXISTS microsoft_id text,
  ADD COLUMN IF NOT EXISTS user_principal_name text,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS department_name text,
  ADD COLUMN IF NOT EXISTS office_location text,
  ADD COLUMN IF NOT EXISTS mobile_phone text,
  ADD COLUMN IF NOT EXISTS business_phone text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS ms_profile_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_master_microsoft_id ON public.user_master (microsoft_id) WHERE microsoft_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_master_upn ON public.user_master (user_principal_name) WHERE user_principal_name IS NOT NULL;

-- 2. INSURANCE POLICIES: Category (Own Insurance vs Third Party Insurance)
ALTER TABLE public.insurance_policies
  ADD COLUMN IF NOT EXISTS insurance_category text DEFAULT 'Own Insurance';

-- Backfill existing policies to 'Own Insurance' if null
UPDATE public.insurance_policies
SET insurance_category = 'Own Insurance'
WHERE insurance_category IS NULL;

-- 3. VEHICLES: Segregated Insurance Fields for Own & Third Party
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS own_insurance_policy_number text,
  ADD COLUMN IF NOT EXISTS own_insurance_expiry_date date,
  ADD COLUMN IF NOT EXISTS own_insurance_vendor text,
  ADD COLUMN IF NOT EXISTS own_insurance_vendor_id uuid,
  ADD COLUMN IF NOT EXISTS tp_insurance_policy_number text,
  ADD COLUMN IF NOT EXISTS tp_insurance_expiry_date date,
  ADD COLUMN IF NOT EXISTS tp_insurance_vendor text,
  ADD COLUMN IF NOT EXISTS tp_insurance_vendor_id uuid;

-- Backfill vehicles own_insurance fields from existing insurance fields
UPDATE public.vehicles
SET 
  own_insurance_policy_number = COALESCE(own_insurance_policy_number, insurance_policy_number),
  own_insurance_expiry_date = COALESCE(own_insurance_expiry_date, insurance_expiry_date),
  own_insurance_vendor = COALESCE(own_insurance_vendor, insurance_vendor),
  own_insurance_vendor_id = COALESCE(own_insurance_vendor_id, insurance_vendor_id)
WHERE insurance_policy_number IS NOT NULL AND own_insurance_policy_number IS NULL;
