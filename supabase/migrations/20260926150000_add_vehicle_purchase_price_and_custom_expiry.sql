-- Migration: Add Purchase Price and Custom Extended Expiry Date to vehicles master
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS custom_extended_expiry_date DATE;

-- Synchronize purchase_price with existing purchase_cost
UPDATE public.vehicles
SET purchase_price = purchase_cost
WHERE (purchase_price IS NULL OR purchase_price = 0) AND purchase_cost > 0;
