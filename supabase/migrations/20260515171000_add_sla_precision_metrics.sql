-- ============================================================================
-- Enterprise SLA Precision Metrics Migration
-- Feature: Granular Resolution Thresholds (Min, Max, Standard)
-- ============================================================================

-- 1. Extend master_priorities with precision SLA metrics
ALTER TABLE master_priorities 
ADD COLUMN IF NOT EXISTS sla_min_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sla_max_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sla_standard_minutes INTEGER DEFAULT 0;

-- 2. Update existing records with baseline thresholds if they have a target_minutes
UPDATE master_priorities 
SET 
  sla_min_minutes = floor(sla_target_minutes * 0.5),
  sla_max_minutes = floor(sla_target_minutes * 1.5),
  sla_standard_minutes = sla_target_minutes
WHERE sla_target_minutes > 0 AND sla_min_minutes = 0;

-- 3. Ensure all priority scopes are initialized for the new categories
-- Flag 1 (Infra), Flag 2 (ERP), Flag 3 (Others)
INSERT INTO master_priorities (id, code, name, sla_target_minutes, sla_min_minutes, sla_max_minutes, sla_standard_minutes, scope_id, description)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'PRIO_URGENT_OTH', 'Urgent Priority (Others)', 60, 30, 90, 60, 3, 'General high-priority resolution flow.')
ON CONFLICT (id) DO NOTHING;
