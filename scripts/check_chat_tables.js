const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("Checking DB tables...");
  
  const tables = [
    'task_chat_messages', 
    'ticket_chat_messages', 
    'ticket_chats', 
    'ticket_comments',
    'task_notifications',
    'notification_queue',
    'notification_history',
    'task_mentions'
  ];

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (error) {
        console.log(`Table ${t}: ERROR -> ${error.message} (${error.code})`);
      } else {
        console.log(`Table ${t}: OK (Sample data: ${JSON.stringify(data)})`);
      }
    } catch (e) {
      console.log(`Table ${t}: EXCEPTION -> ${e.message}`);
    }
  }

  // Check Storage buckets
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.log("Storage buckets error:", bErr.message);
  } else {
    console.log("Storage buckets:", buckets.map(b => b.name));
  }
}

main().catch(console.error);
