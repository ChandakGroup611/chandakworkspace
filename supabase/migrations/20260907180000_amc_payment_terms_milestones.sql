-- Migration: Add payment_terms_json to software_amc
ALTER TABLE public.software_amc 
ADD COLUMN IF NOT EXISTS payment_terms_json JSONB DEFAULT '{}'::jsonb;
