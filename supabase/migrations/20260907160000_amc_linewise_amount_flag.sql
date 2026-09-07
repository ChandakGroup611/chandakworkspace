-- ============================================================================
-- Enterprise Database Architecture Migration Script
-- Feature: AMC & Subscription Line-Item Wise Amount Calculation Flag
-- ============================================================================

ALTER TABLE public.software_amc
    ADD COLUMN IF NOT EXISTS is_line_item_wise BOOLEAN DEFAULT false;

-- End of Script
