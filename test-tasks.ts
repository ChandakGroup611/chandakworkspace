import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Fetching tasks...');
  const { data, error } = await supabase.from('tasks').select('*');
  console.log('Error:', error);
  console.log('Tasks count:', data?.length);
  if (data && data.length > 0) {
    console.log(data[0].id, data[0].subject);
  }
}

test();
