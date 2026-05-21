import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  const { data, error } = await supabase.rpc('get_columns', { table_name: 'user_permissions_snapshot' });
  if (error) {
    // try querying the table directly
    const { data: rows, error: rErr } = await supabase.from('user_permissions_snapshot').select('*').limit(1);
    console.log("Rows:", rows);
    console.log("Error:", rErr);
  } else {
    console.log("Columns:", data);
  }
}

check();
