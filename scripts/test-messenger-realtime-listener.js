require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRealtimeFlow() {
  console.log('Testing live realtime event delivery...');
  let messageReceived = false;
  let participantReceived = false;

  // Get a real participant
  const { data: part } = await adminClient.from('messenger_participants').select('conversation_id, user_id').limit(1).single();
  console.log('Using real participant:', part);

  const channel = anonClient.channel('qa_realtime_stream')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messenger_messages' }, (p) => {
      console.log('✔ Realtime Message Received:', p.new?.id, p.new?.content);
      messageReceived = true;
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messenger_participants' }, (p) => {
      console.log('✔ Realtime Participant Update Received:', p.new?.user_id, p.new?.last_read_at);
      participantReceived = true;
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to realtime channel. Simulating live message & read receipt...');
        const { data: msg } = await adminClient.from('messenger_messages').insert({
          conversation_id: part.conversation_id,
          sender_id: part.user_id,
          content: 'Live QA message: ' + Date.now()
        }).select().single();

        const { data: updatedPart } = await adminClient.from('messenger_participants').update({
          last_read_at: new Date().toISOString()
        }).eq('conversation_id', part.conversation_id).eq('user_id', part.user_id).select();
        console.log('Updated rows in participants:', updatedPart?.length);

        setTimeout(async () => {
          if (msg) await adminClient.from('messenger_messages').delete().eq('id', msg.id);
          console.log('\n--- Realtime QA Results ---');
          console.log('Message Event Received:', messageReceived);
          console.log('Participant Event Received:', participantReceived);
          if (messageReceived && participantReceived) {
            console.log('🎉 ALL REALTIME EVENTS DELIVERED INSTANTLY WITHOUT REFRESH!');
            process.exit(0);
          } else {
            console.error('❌ Realtime event delivery failed');
            process.exit(1);
          }
        }, 2500);
      }
    });
}

testRealtimeFlow().catch((err) => {
  console.error(err);
  process.exit(1);
});
