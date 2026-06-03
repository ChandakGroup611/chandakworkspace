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

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION public.get_workspace_task_counts(p_workspace_ids UUID[])
      RETURNS TABLE(workspace_id UUID, task_count BIGINT)
      LANGUAGE sql STABLE SECURITY DEFINER AS $$
        SELECT workspace_id, count(*) as task_count
        FROM public.tasks
        WHERE workspace_id = ANY(p_workspace_ids)
        AND is_deleted = false
        GROUP BY workspace_id;
      $$;
    `
  });
  console.log('Migration output:', JSON.stringify(data, null, 2), error);
}

run();
