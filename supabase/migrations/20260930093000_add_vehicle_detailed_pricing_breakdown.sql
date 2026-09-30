-- Migration: Add detailed vehicle pricing breakdown columns from Basic Price to On-Road Price
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS basic_price NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5, 2) DEFAULT 28.00,
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS cess_percentage NUMERIC(5, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS cess_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS ex_showroom_price NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS rto_road_tax NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS tcs_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS insurance_cost NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS hsrp_smart_card_fee NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS fastag_charges NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS accessories_cost NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS extended_warranty_cost NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS other_charges NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS on_road_price NUMERIC(12, 2) DEFAULT 0.00;

-- Backfill on_road_price and ex_showroom_price from existing purchase_price/purchase_cost
UPDATE public.vehicles
SET 
  on_road_price = COALESCE(purchase_price, purchase_cost, 0.00),
  ex_showroom_price = CASE 
    WHEN ex_showroom_price IS NULL OR ex_showroom_price = 0 THEN COALESCE(purchase_price, purchase_cost, 0.00)
    ELSE ex_showroom_price 
  END
WHERE (on_road_price IS NULL OR on_road_price = 0) AND (purchase_price > 0 OR purchase_cost > 0);
