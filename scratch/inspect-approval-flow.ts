import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
      .from('requirement_approval_flow')
      .select(`
        id, level, status,
        approver:user_master!requirement_approval_flow_approver_id_fkey(id, full_name, profile_photo, designation:designations!fk_user_master_designation(name)),
        department:departments!requirement_approval_flow_department_id_fkey(id, name)
      `)
      .limit(1);

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Result:", JSON.stringify(data, null, 2));
  }
}

main();
