-- ==============================================================================
-- Migration: Unrestrict Character Lengths on Service Repair Scope & Maintenance
-- Date: 2026-09-28
-- Module: Fleet Management (VEHICLE_DESK) & Service Maintenance
-- Description: Converts VARCHAR length-restricted columns (e.g. service_type VARCHAR(100),
--              service_center VARCHAR(255), maintenance titles) to TEXT so users can enter
--              detailed, multi-line, unrestricted service repair scopes and descriptions.
-- ==============================================================================

-- 1. Service Records Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_records') THEN
    ALTER TABLE public.service_records ALTER COLUMN service_type TYPE TEXT;
    ALTER TABLE public.service_records ALTER COLUMN service_center TYPE TEXT;
    ALTER TABLE public.service_records ALTER COLUMN technician_name TYPE TEXT;
  END IF;
END $$;

-- 2. Maintenance Schedules Table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_schedules') THEN
    ALTER TABLE public.maintenance_schedules ALTER COLUMN title TYPE TEXT;
    ALTER TABLE public.maintenance_schedules ALTER COLUMN notes TYPE TEXT;
  END IF;
END $$;

-- 3. Service Entitlements & Free Service Vouchers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_entitlements') THEN
    ALTER TABLE public.service_entitlements ALTER COLUMN service_title TYPE TEXT;
    ALTER TABLE public.service_entitlements ALTER COLUMN service_type TYPE TEXT;
    ALTER TABLE public.service_entitlements ALTER COLUMN coverage_scope TYPE TEXT;
    ALTER TABLE public.service_entitlements ALTER COLUMN provider_vendor TYPE TEXT;
    ALTER TABLE public.service_entitlements ALTER COLUMN workshop_center TYPE TEXT;
  END IF;
END $$;
