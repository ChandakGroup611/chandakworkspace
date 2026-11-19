-- Migration: 20261119140000_wp7_email_templates_module_code.sql
-- Description: Additive module_code column on email_templates with backup and backfill (Master Programme WP7.7)

-- 1. Create backup table
CREATE TABLE IF NOT EXISTS backup_email_templates_20261119 AS
SELECT * FROM email_templates;

-- 2. Add additive module_code column
ALTER TABLE email_templates
ADD COLUMN IF NOT EXISTS module_code text;

-- 3. Backfill module_code deterministically from existing module column and events
UPDATE email_templates
SET module_code = CASE
  WHEN lower(module) LIKE '%task%' THEN 'TASK_WORKFLOW'
  WHEN lower(module) LIKE '%workspace%' THEN 'TASK_WORKFLOW'
  WHEN lower(module) LIKE '%ticket%' THEN 'TASK_WORKFLOW'
  WHEN lower(module) LIKE '%req%' THEN 'TASK_WORKFLOW'
  WHEN lower(module) LIKE '%vehicle%' OR lower(module) LIKE '%fleet%' OR lower(module) LIKE '%trip%' THEN 'VEHICLE_DESK'
  WHEN lower(module) LIKE '%design%' OR lower(module) LIKE '%drawing%' OR lower(module) LIKE '%dms%' THEN 'DESIGN_TRACKING'
  WHEN lower(module) LIKE '%meet%' THEN 'CHANDAK_MEET'
  WHEN lower(module) LIKE '%budget%' THEN 'ORG_BUDGET'
  WHEN lower(module) LIKE '%amc%' THEN 'TASK_WORKFLOW'
  WHEN lower(module) LIKE '%dash%' THEN 'DASHBOARDS'
  ELSE 'GENERAL'
END
WHERE module_code IS NULL;

-- 4. Create performance index for module-scoped queries and notification dispatch
CREATE INDEX IF NOT EXISTS idx_email_templates_module_code ON email_templates(module_code, event);
