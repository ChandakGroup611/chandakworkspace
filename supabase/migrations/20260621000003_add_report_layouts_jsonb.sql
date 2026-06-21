ALTER TABLE user_dashboard_preferences ADD COLUMN IF NOT EXISTS report_layouts JSONB DEFAULT '{}'::jsonb;
