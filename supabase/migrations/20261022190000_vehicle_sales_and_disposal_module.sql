-- ==============================================================================
-- Migration: Vehicle Sales & Disposals Module
-- 
-- 1. Adds non-destructive columns to public.vehicle_sales for buyer, payment, 
--    and document tracking
-- 2. Ensures RLS policies allow authenticated operations
-- ==============================================================================

-- 1. VEHICLE SALES: Add Buyer, Payment, Document & Tracking fields
ALTER TABLE public.vehicle_sales
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS buyer_phone text,
  ADD COLUMN IF NOT EXISTS buyer_email text,
  ADD COLUMN IF NOT EXISTS sale_type text DEFAULT 'Full Sale',
  ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'Bank Transfer',
  ADD COLUMN IF NOT EXISTS sale_document_url text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS recorded_by text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT CURRENT_TIMESTAMP;

-- 2. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_vehicle_sales_vehicle_id ON public.vehicle_sales (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_sales_sale_date ON public.vehicle_sales (sale_date DESC);

-- 3. RLS Policies
ALTER TABLE public.vehicle_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access vehicle_sales" ON public.vehicle_sales;
CREATE POLICY "Public full access vehicle_sales" ON public.vehicle_sales FOR ALL USING (true) WITH CHECK (true);
