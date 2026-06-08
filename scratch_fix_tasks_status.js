const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const NEED_TO_CHECK_ID = 'f499ada2-9354-49ff-8635-e39672546eea';
  const NEW_STATUS_ID = 'e6a4e794-b694-45a1-a55d-4baaed5062f9';

  console.log(`Fixing tasks from ${NEED_TO_CHECK_ID} to ${NEW_STATUS_ID}`);
  const { data, error } = await supabase.from('tasks').update({ status_id: NEW_STATUS_ID }).eq('status_id', NEED_TO_CHECK_ID).select('id, subject');
  console.log(`Fixed ${data?.length} tasks!`, error || '');
}
run();
