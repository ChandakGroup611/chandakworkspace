-- Migration: Add Pre-GST Historical Vehicle Taxes (VAT, Central Excise, Swachh Bharat Cess, Entry Tax)
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS pre_gst_vat_percentage NUMERIC(5, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pre_gst_vat_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pre_gst_excise_percentage NUMERIC(5, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pre_gst_excise_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pre_gst_bharat_cess_percentage NUMERIC(5, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pre_gst_bharat_cess_amount NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pre_gst_entry_tax_amount NUMERIC(12, 2) DEFAULT 0.00;
