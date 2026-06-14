import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('requirements').select(`
    creator:user_master!requirements_creator_id_fkey(full_name)
  `).limit(1).single();
  console.log('Error user_master!requirements_creator_id_fkey:', error?.message || 'Success');

  const { data: d2, error: e2 } = await supabase.from('requirements').select(`
    creator:user_master!requirements_creator_id_fkey1(full_name)
  `).limit(1).single();
  console.log('Error user_master!requirements_creator_id_fkey1:', e2?.message || 'Success');

  const { data: d3, error: e3 } = await supabase.from('requirements').select(`
    creator:user_master(full_name)
  `).limit(1).single();
  console.log('Error user_master(full_name):', e3?.message || 'Success');
}
test();
