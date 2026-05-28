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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const t2 = await supabase.from('tickets').select('*').limit(1);
  console.log('Tickets:', t2.data ? Object.keys(t2.data[0]||{}) : t2.error);
  
  const t3 = await supabase.from('requirements').select('*').limit(1);
  console.log('Requirements:', t3.data ? Object.keys(t3.data[0]||{}) : t3.error);
  
  const t4 = await supabase.from('workspaces').select('*').limit(1);
  console.log('Workspaces:', t4.data ? Object.keys(t4.data[0]||{}) : t4.error);
}

run();
