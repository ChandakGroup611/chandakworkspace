-- Down Migration: 20261119140000_wp7_email_templates_module_code_down.sql
-- Description: Revert module_code column and restore backup if required

DROP INDEX IF EXISTS idx_email_templates_module_code;

ALTER TABLE email_templates
DROP COLUMN IF EXISTS module_code;

-- Revert backup table if requested
-- DROP TABLE IF EXISTS backup_email_templates_20261119;
