const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("Checking columns and RLS...");

  // Check columns of task_chat_messages
  const { data: cols1 } = await supabase.from('task_chat_messages').select('*').limit(1);
  console.log("task_chat_messages sample:", cols1);

  // Check columns of ticket_chat_messages
  const { data: cols2 } = await supabase.from('ticket_chat_messages').select('*').limit(1);
  console.log("ticket_chat_messages sample:", cols2);

  // Check notification_queue sample
  const { data: nQueue } = await supabase.from('notification_queue').select('*').order('created_at', { ascending: false }).limit(3);
  console.log("notification_queue recent:", nQueue);

  // Check task_notifications sample
  const { data: tNotifs } = await supabase.from('task_notifications').select('*').order('created_at', { ascending: false }).limit(3);
  console.log("task_notifications recent:", tNotifs);
}

main().catch(console.error);
