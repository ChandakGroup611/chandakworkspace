-- Migration: Enhance amc_transactions with line_item association and document attachment support

ALTER TABLE public.amc_transactions
ADD COLUMN IF NOT EXISTS line_item_id TEXT,
ADD COLUMN IF NOT EXISTS line_item_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_file_path TEXT,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_amc_transactions_line_item ON public.amc_transactions(amc_id, line_item_id);
