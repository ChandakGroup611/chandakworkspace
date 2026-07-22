require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: task, error } = await supabaseAdmin.from('tasks').select('id').limit(1).single();
  if (task) {
    console.log("Found task ID:", task.id);
  }
}
test();
