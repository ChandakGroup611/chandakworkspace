-- Add columns for line_item_id and remark
ALTER TABLE public.amc_license_views
ADD COLUMN IF NOT EXISTS line_item_id TEXT,
ADD COLUMN IF NOT EXISTS remark TEXT;
