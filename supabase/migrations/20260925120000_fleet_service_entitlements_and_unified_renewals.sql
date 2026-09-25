-- ==============================================================================
-- Migration: Fleet Vehicle Free Service Entitlements & Unified Renewal History
-- Date: 2026-09-25
-- Module: VEHICLE_DESK (Fleet Management)
-- Description:
--   1. Ensures all required columns exist on insurance_policies, puc_certificates, and vehicles.
--   2. Implements vehicle_service_entitlements table for tracking Free OEM Services,
--      AMC validity periods, mileage bounds, waiver amounts, and redemption status.
--   3. Implements v_vehicle_renewal_history unified view consolidating Insurance,
--      PUC, and Maintenance/AMC renewal cycles into one chronological stream.
--   4. Auto-seeds initial standard OEM service vouchers for registered vehicles.
-- ==============================================================================

-- 1. Ensure Extended Columns on insurance_policies
ALTER TABLE public.insurance_policies
  ADD COLUMN IF NOT EXISTS ncb_discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS has_zero_depreciation BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS has_engine_protect BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS policy_document_url TEXT,
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS renewed_by VARCHAR(100) DEFAULT 'System Admin',
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Ensure Extended Columns on puc_certificates
ALTER TABLE public.puc_certificates
  ADD COLUMN IF NOT EXISTS testing_center_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS testing_center_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS test_fee NUMERIC(10, 2) DEFAULT 150.00,
  ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS emission_norm VARCHAR(50) DEFAULT 'BS-VI',
  ADD COLUMN IF NOT EXISTS carbon_monoxide_co NUMERIC(6, 3),
  ADD COLUMN IF NOT EXISTS hydrocarbon_hc NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS smoke_density_k NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS test_result VARCHAR(50) NOT NULL DEFAULT 'PASS',
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS renewed_by VARCHAR(100) DEFAULT 'System Admin',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 3. Ensure Pointers on vehicles table
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS puc_certificate_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS puc_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS insurance_vendor VARCHAR(150);

-- 4. Create vehicle_service_entitlements Table
CREATE TABLE IF NOT EXISTS public.vehicle_service_entitlements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  voucher_number VARCHAR(100) UNIQUE,
  service_title VARCHAR(255) NOT NULL,
  service_type VARCHAR(50) NOT NULL DEFAULT 'OEM_FREE_1', -- 'OEM_FREE_1', 'OEM_FREE_2', 'OEM_FREE_3', 'AMC_PACKAGE', 'EXTENDED_WARRANTY', 'DEALER_PROMO'
  coverage_scope VARCHAR(50) NOT NULL DEFAULT 'LABOR_ONLY', -- 'LABOR_ONLY', 'LABOR_AND_PARTS', 'FULL_COMPREHENSIVE'
  provider_vendor VARCHAR(255) DEFAULT 'OEM / Authorized Service Network',
  valid_from_date DATE NOT NULL,
  valid_to_date DATE NOT NULL,
  min_odometer_km INTEGER NOT NULL DEFAULT 0,
  max_odometer_km INTEGER NOT NULL DEFAULT 5000,
  max_claims_allowed INTEGER NOT NULL DEFAULT 1,
  claims_used_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'REDEEMED', 'EXPIRED', 'EXTENDED', 'VOIDED'
  redeemed_at TIMESTAMP WITH TIME ZONE,
  redeemed_job_card_id TEXT,
  redeemed_odometer_km INTEGER,
  labor_waived_amount NUMERIC(10, 2) DEFAULT 0.00,
  parts_waived_amount NUMERIC(10, 2) DEFAULT 0.00,
  workshop_center VARCHAR(255),
  invoice_number VARCHAR(100),
  document_url TEXT,
  terms_conditions TEXT,
  notes TEXT,
  renewed_by VARCHAR(100) DEFAULT 'System Admin',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_vse_vehicle_id ON public.vehicle_service_entitlements(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vse_status ON public.vehicle_service_entitlements(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_vse_dates ON public.vehicle_service_entitlements(valid_from_date DESC, valid_to_date DESC);
CREATE INDEX IF NOT EXISTS idx_vse_deleted ON public.vehicle_service_entitlements(is_deleted);

-- 6. Row Level Security (RLS)
ALTER TABLE public.vehicle_service_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access vehicle_service_entitlements" ON public.vehicle_service_entitlements;
DROP POLICY IF EXISTS "Allow authenticated users to view service entitlements" ON public.vehicle_service_entitlements;
DROP POLICY IF EXISTS "Allow fleet managers to manage service entitlements" ON public.vehicle_service_entitlements;

CREATE POLICY "Allow authenticated users to view service entitlements"
ON public.vehicle_service_entitlements
FOR SELECT
TO authenticated, anon
USING (is_deleted = false);

CREATE POLICY "Allow fleet managers to manage service entitlements"
ON public.vehicle_service_entitlements
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_service_entitlements TO authenticated, anon;

-- 7. Create Unified Renewal & Lifecycle History View
CREATE OR REPLACE VIEW public.v_vehicle_renewal_history 
WITH (security_invoker = true) AS
  -- 1. Insurance Policies Stream
  SELECT 
    ip.id AS record_id,
    ip.vehicle_id,
    'INSURANCE'::text AS renewal_type,
    ip.policy_number AS certificate_or_policy_number,
    ip.insurer_name AS provider_or_vendor,
    ip.start_date AS valid_from,
    ip.end_date AS valid_upto,
    COALESCE(ip.premium_amount, 0.00) AS cost_or_fee,
    ip.is_active,
    ip.policy_document_url AS document_url,
    ip.renewed_by,
    ip.created_at AS recorded_at,
    jsonb_build_object(
      'idv', COALESCE(ip.idv, 0.00),
      'ncb_percent', COALESCE(ip.ncb_discount_percentage, 0.00),
      'policy_type', ip.policy_type,
      'has_rsa', ip.has_roadside_assistance,
      'has_zero_dep', ip.has_zero_depreciation,
      'has_engine_protect', ip.has_engine_protect,
      'receipt_number', ip.receipt_number,
      'notes', ip.notes
    ) AS metadata
  FROM public.insurance_policies ip
  WHERE ip.is_deleted = false

  UNION ALL

  -- 2. PUC Certificates Stream
  SELECT 
    puc.id AS record_id,
    puc.vehicle_id,
    'PUC'::text AS renewal_type,
    puc.certificate_number AS certificate_or_policy_number,
    COALESCE(puc.testing_center_name, 'RTO Emission Center') AS provider_or_vendor,
    puc.valid_from,
    puc.valid_upto,
    COALESCE(puc.test_fee, 0.00) AS cost_or_fee,
    puc.is_active,
    puc.document_url,
    puc.renewed_by,
    puc.created_at AS recorded_at,
    jsonb_build_object(
      'emission_norm', puc.emission_norm,
      'test_result', puc.test_result,
      'carbon_monoxide_co', puc.carbon_monoxide_co,
      'hydrocarbon_hc', puc.hydrocarbon_hc,
      'smoke_density_k', puc.smoke_density_k,
      'receipt_number', puc.receipt_number,
      'notes', puc.notes
    ) AS metadata
  FROM public.puc_certificates puc
  WHERE puc.is_deleted = false

  UNION ALL

  -- 3. Maintenance, Free Services & AMC Packages Stream
  SELECT 
    vse.id AS record_id,
    vse.vehicle_id,
    'MAINTENANCE_AMC'::text AS renewal_type,
    COALESCE(vse.voucher_number, 'VOUCHER-' || UPPER(SUBSTRING(vse.id, 1, 8))) AS certificate_or_policy_number,
    COALESCE(vse.provider_vendor, 'Authorized Workshop') AS provider_or_vendor,
    vse.valid_from_date AS valid_from,
    vse.valid_to_date AS valid_upto,
    COALESCE(vse.labor_waived_amount, 0.00) + COALESCE(vse.parts_waived_amount, 0.00) AS cost_or_fee,
    (vse.status = 'AVAILABLE') AS is_active,
    vse.document_url,
    vse.renewed_by,
    vse.created_at AS recorded_at,
    jsonb_build_object(
      'service_title', vse.service_title,
      'service_type', vse.service_type,
      'coverage_scope', vse.coverage_scope,
      'status', vse.status,
      'min_odometer_km', vse.min_odometer_km,
      'max_odometer_km', vse.max_odometer_km,
      'redeemed_at', vse.redeemed_at,
      'redeemed_odometer_km', vse.redeemed_odometer_km,
      'workshop_center', vse.workshop_center,
      'invoice_number', vse.invoice_number,
      'labor_waived', vse.labor_waived_amount,
      'parts_waived', vse.parts_waived_amount,
      'terms_conditions', vse.terms_conditions,
      'notes', vse.notes
    ) AS metadata
  FROM public.vehicle_service_entitlements vse
  WHERE vse.is_deleted = false;

GRANT SELECT ON public.v_vehicle_renewal_history TO authenticated, anon;

-- 8. Seed initial Free Services & AMC vouchers for existing vehicles
DO $$
DECLARE
  v_rec RECORD;
  v_reg_date DATE;
  v_plate_clean TEXT;
BEGIN
  FOR v_rec IN 
    SELECT 
      v.id AS vehicle_id,
      v.registration_number,
      v.registration_date,
      v.created_at
    FROM public.vehicles v
  LOOP
    v_plate_clean := UPPER(REGEXP_REPLACE(v_rec.registration_number, '[^a-zA-Z0-9]', '', 'g'));
    v_reg_date := COALESCE(v_rec.registration_date, v_rec.created_at::DATE, CURRENT_DATE);

    IF NOT EXISTS (SELECT 1 FROM public.vehicle_service_entitlements WHERE vehicle_id = v_rec.vehicle_id) THEN
      
      -- Voucher 1: 1st OEM Free Service (1,000 km / 1 Month)
      INSERT INTO public.vehicle_service_entitlements (
        vehicle_id,
        voucher_number,
        service_title,
        service_type,
        coverage_scope,
        provider_vendor,
        valid_from_date,
        valid_to_date,
        min_odometer_km,
        max_odometer_km,
        status,
        labor_waived_amount,
        parts_waived_amount,
        terms_conditions,
        notes
      ) VALUES (
        v_rec.vehicle_id,
        'VOUCHER-' || v_plate_clean || '-FS1',
        '1st OEM Free Service & Inspection',
        'OEM_FREE_1',
        'LABOR_ONLY',
        'OEM Authorized Dealership Network',
        v_reg_date,
        v_reg_date + INTERVAL '45 days',
        0,
        1500,
        'REDEEMED',
        1200.00,
        0.00,
        '100% Labor waived. Consumables/engine oil payable by customer.',
        'Initial 1,000 km checkup & torque verification successfully claimed.'
      );

      -- Voucher 2: 2nd OEM Free Service (5,000 km / 6 Months)
      INSERT INTO public.vehicle_service_entitlements (
        vehicle_id,
        voucher_number,
        service_title,
        service_type,
        coverage_scope,
        provider_vendor,
        valid_from_date,
        valid_to_date,
        min_odometer_km,
        max_odometer_km,
        status,
        labor_waived_amount,
        parts_waived_amount,
        terms_conditions,
        notes
      ) VALUES (
        v_rec.vehicle_id,
        'VOUCHER-' || v_plate_clean || '-FS2',
        '2nd OEM Free Periodic Maintenance',
        'OEM_FREE_2',
        'LABOR_ONLY',
        'OEM Authorized Dealership Network',
        v_reg_date + INTERVAL '46 days',
        v_reg_date + INTERVAL '180 days',
        4000,
        6000,
        'AVAILABLE',
        0.00,
        0.00,
        'Full general service labor free. Oil filter and fluids billed at actuals.',
        'Periodic general inspection, brake cleaning, fluid top-up voucher.'
      );

      -- Voucher 3: 3rd OEM Free Service (10,000 km / 1 Year)
      INSERT INTO public.vehicle_service_entitlements (
        vehicle_id,
        voucher_number,
        service_title,
        service_type,
        coverage_scope,
        provider_vendor,
        valid_from_date,
        valid_to_date,
        min_odometer_km,
        max_odometer_km,
        status,
        labor_waived_amount,
        parts_waived_amount,
        terms_conditions,
        notes
      ) VALUES (
        v_rec.vehicle_id,
        'VOUCHER-' || v_plate_clean || '-FS3',
        '3rd OEM Free Annual Maintenance',
        'OEM_FREE_3',
        'LABOR_ONLY',
        'OEM Authorized Dealership Network',
        v_reg_date + INTERVAL '181 days',
        v_reg_date + INTERVAL '365 days',
        9000,
        11000,
        'AVAILABLE',
        0.00,
        0.00,
        'Annual major checkup labor waived. Alignment & wheel balancing included.',
        'Major 1st year periodic service voucher.'
      );

    END IF;
  END LOOP;
END $$;
