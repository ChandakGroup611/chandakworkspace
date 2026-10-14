-- Migration: Add bill_id column to public.vehicle_parts to support multi-item invoices
-- Date: 2026-10-14

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'vehicle_parts' 
      AND column_name = 'bill_id'
  ) THEN
    ALTER TABLE public.vehicle_parts ADD COLUMN bill_id VARCHAR(100);
    CREATE INDEX IF NOT EXISTS idx_vehicle_parts_bill_id ON public.vehicle_parts(bill_id);
  END IF;
END $$;
