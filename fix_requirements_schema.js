const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = 'd:/adios/.env.local';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSchema() {
  const sql = `
    -- Rename columns to match API
    DO $$ BEGIN
      ALTER TABLE requirements RENAME COLUMN code TO requirement_code;
    EXCEPTION WHEN undefined_column THEN END $$;

    DO $$ BEGIN
      ALTER TABLE requirements RENAME COLUMN creator_id TO created_by;
    EXCEPTION WHEN undefined_column THEN END $$;

    -- Add missing columns
    ALTER TABLE requirements ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    ALTER TABLE requirements ADD COLUMN IF NOT EXISTS sub_workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    ALTER TABLE requirements ADD COLUMN IF NOT EXISTS business_value TEXT;
    ALTER TABLE requirements ADD COLUMN IF NOT EXISTS risk_assessment TEXT;
    
    ALTER TABLE requirements ADD COLUMN IF NOT EXISTS budget_impact NUMERIC;
    ALTER TABLE requirements ADD COLUMN IF NOT EXISTS estimated_effort TEXT;
    ALTER TABLE requirements ADD COLUMN IF NOT EXISTS dependency_notes TEXT;
    ALTER TABLE requirements ADD COLUMN IF NOT EXISTS scope TEXT;
    ALTER TABLE requirements ADD COLUMN IF NOT EXISTS source_ticket_id UUID;

    -- Drop NOT NULL constraints that break inserts
    ALTER TABLE requirements ALTER COLUMN department_id DROP NOT NULL;
    ALTER TABLE requirements ALTER COLUMN status_id DROP NOT NULL;
  `;

  const { data, error } = await supabase.rpc('execute_sql', { sql: sql });
  if (error) {
    console.error("RPC execute_sql failed:", error);
  } else {
    console.log("Schema fixed successfully via RPC:", data);
  }
}

fixSchema();
