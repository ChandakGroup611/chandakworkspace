const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("Testing notification_queue insertion...");
  const { data: testUser } = await supabase.from('user_master').select('id, full_name, email').limit(1).single();
  console.log("Test user:", testUser);

  const { data, error } = await supabase.from('notification_queue').insert([{
    target_user_id: testUser.id,
    recipient_id: testUser.id,
    entity_type: 'task',
    entity_id: '1effca77-11ce-4156-b2b2-787ef8b0d276',
    module: 'tasks',
    action_type: 'mention',
    actor: testUser.id,
    redirect_url: '/tasks/1effca77-11ce-4156-b2b2-787ef8b0d276',
    priority_level: 'MEDIUM',
    is_read: false,
    payload: {
      title: 'Test Notification Title',
      message: 'Test notification message body'
    }
  }]).select();

  console.log("Insert result:", error ? error.message : data);

  if (data && data.length > 0) {
    const { data: fetched, error: fetchErr } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('id', data[0].id)
      .single();
    console.log("Fetched notification item:", fetched);

    // Clean up
    await supabase.from('notification_queue').delete().eq('id', data[0].id);
    console.log("Cleaned up notification test row");
  }
}

main().catch(console.error);
