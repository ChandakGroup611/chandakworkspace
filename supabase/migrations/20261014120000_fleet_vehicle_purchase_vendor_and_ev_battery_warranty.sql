-- ==============================================================================
-- Migration: Add Purchase Vendor (Showroom Name) and EV Inbuilt Battery Warranty
-- Date: 2026-10-14
-- Module: VEHICLE_DESK (Fleet Management)
-- Description: Adds Showroom / Purchase Vendor selection fields and dual-basis
--              inbuilt battery warranty calculations (KM and Period from Purchase Date)
-- ==============================================================================

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS purchase_vendor VARCHAR(255),
  ADD COLUMN IF NOT EXISTS purchase_vendor_id TEXT,
  ADD COLUMN IF NOT EXISTS purchase_date DATE,
  ADD COLUMN IF NOT EXISTS battery_warranty_km INTEGER DEFAULT 160000,
  ADD COLUMN IF NOT EXISTS battery_warranty_years NUMERIC(4, 1) DEFAULT 8.0,
  ADD COLUMN IF NOT EXISTS battery_warranty_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS battery_capacity_kwh NUMERIC(6, 2);

-- Populate purchase_date from registration_date where purchase_date is null
UPDATE public.vehicles
SET purchase_date = registration_date
WHERE purchase_date IS NULL AND registration_date IS NOT NULL;

-- For existing electric vehicles, initialize battery warranty fields
UPDATE public.vehicles
SET 
  battery_warranty_km = COALESCE(battery_warranty_km, 160000),
  battery_warranty_years = COALESCE(battery_warranty_years, 8.0),
  battery_warranty_expiry_date = CASE
    WHEN battery_warranty_expiry_date IS NULL AND purchase_date IS NOT NULL THEN (purchase_date + INTERVAL '8 years')::DATE
    WHEN battery_warranty_expiry_date IS NULL AND registration_date IS NOT NULL THEN (registration_date + INTERVAL '8 years')::DATE
    ELSE battery_warranty_expiry_date
  END
WHERE fuel_type ILIKE '%electric%' OR fuel_type ILIKE '%ev%';

-- Comment on columns for schema clarity
COMMENT ON COLUMN public.vehicles.purchase_vendor IS 'Showroom or Dealership Vendor where vehicle was purchased';
COMMENT ON COLUMN public.vehicles.purchase_vendor_id IS 'Foreign ID reference to dealer or vendor master if applicable';
COMMENT ON COLUMN public.vehicles.purchase_date IS 'Vehicle purchase or invoice date from showroom';
COMMENT ON COLUMN public.vehicles.battery_warranty_km IS 'Inbuilt EV Battery warranty threshold in KM (Whichever is earlier with period)';
COMMENT ON COLUMN public.vehicles.battery_warranty_years IS 'Inbuilt EV Battery warranty period in years from purchase date';
COMMENT ON COLUMN public.vehicles.battery_warranty_expiry_date IS 'Computed or specified expiry date for EV battery warranty';
COMMENT ON COLUMN public.vehicles.battery_capacity_kwh IS 'Electric vehicle battery capacity rating in kWh';
