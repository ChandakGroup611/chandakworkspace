const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  });
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: `
      -- Add due_date column to tickets
      ALTER TABLE tickets ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

      -- Add due_date column to requirements
      ALTER TABLE requirements ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

      -- Update tickets due_date based on master_priorities SLA target
      UPDATE tickets t
      SET due_date = t.created_at + (p.sla_target_minutes || ' minutes')::interval
      FROM master_priorities p
      WHERE t.priority_id = p.id AND t.due_date IS NULL;

      -- If priority is null on tickets, default to 7 days
      UPDATE tickets
      SET due_date = created_at + interval '7 days'
      WHERE due_date IS NULL;

      -- Update requirements due_date based on priority if it exists, otherwise default to 14 days
      DO $$
      BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'requirements' AND column_name = 'priority_id') THEN
              EXECUTE 'UPDATE requirements r SET due_date = r.created_at + (p.sla_target_minutes || '' minutes'')::interval FROM master_priorities p WHERE r.priority_id = p.id AND r.due_date IS NULL;';
          END IF;
      END $$;

      UPDATE requirements
      SET due_date = created_at + interval '14 days'
      WHERE due_date IS NULL;
    `
  });
  console.log('Migration output:', JSON.stringify(data, null, 2), error);
}

check();
