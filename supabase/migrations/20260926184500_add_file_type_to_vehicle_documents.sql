-- Migration: Add optional file_type column to vehicle_documents if not already present
ALTER TABLE IF EXISTS public.vehicle_documents ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);
