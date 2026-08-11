const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("Checking ticket tables schema...");
  
  // Insert test row into ticket_chat_messages
  const { data: d1, error: e1 } = await supabase.from('ticket_chat_messages').insert([{
    ticket_id: '51b610f1-16d8-4345-8659-0ed567a7fec7',
    user_id: '53b7dbae-6049-44a7-a9c1-4ba769b4c324',
    message: 'Test message'
  }]).select();
  console.log("ticket_chat_messages insert result:", e1 ? e1.message : d1);

  // Clean up
  if (d1 && d1.length > 0) {
    await supabase.from('ticket_chat_messages').delete().eq('id', d1[0].id);
    console.log("Cleaned up test row");
  }

  // Check task_chat_messages insert
  const { data: d2, error: e2 } = await supabase.from('task_chat_messages').insert([{
    task_id: '1effca77-11ce-4156-b2b2-787ef8b0d276',
    user_id: '77034b52-f8c3-4990-b331-1d40b03ef40d',
    message: 'Diagnostic test message'
  }]).select();
  console.log("task_chat_messages insert result:", e2 ? e2.message : d2);

  if (d2 && d2.length > 0) {
    await supabase.from('task_chat_messages').delete().eq('id', d2[0].id);
    console.log("Cleaned up task chat test row");
  }
}

main().catch(console.error);
