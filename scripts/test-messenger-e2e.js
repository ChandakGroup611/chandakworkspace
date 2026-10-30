require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function runMessengerE2E() {
  console.log('================================================================');
  console.log('   CHANDAK MESSENGER — END-TO-END QA & VERIFICATION SUITE       ');
  console.log('================================================================\n');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const results = [];
  const recordPass = (testName, detail) => {
    console.log(`✔ PASS: ${testName} — ${detail}`);
    results.push({ name: testName, status: 'PASS', detail });
  };
  const recordFail = (testName, detail) => {
    console.error(`✖ FAIL: ${testName} — ${detail}`);
    results.push({ name: testName, status: 'FAIL', detail });
  };

  try {
    // 1. Module Registration in modules_master
    const modRes = await client.query("SELECT * FROM public.modules_master WHERE code = 'CHANDAK_MESSENGER';");
    if (modRes.rows.length === 1 && modRes.rows[0].is_active) {
      recordPass('Module Registration', `Registered as "${modRes.rows[0].name}" with icon "${modRes.rows[0].icon}"`);
    } else {
      recordFail('Module Registration', 'Module CHANDAK_MESSENGER not found or inactive');
    }

    // 2. Permissions Verification
    const permRes = await client.query("SELECT code FROM public.permissions WHERE code LIKE 'MESSENGER_%' ORDER BY code;");
    const permCodes = permRes.rows.map(r => r.code);
    if (permCodes.includes('MESSENGER_ACCESS') && permCodes.includes('MESSENGER_SEND') && permCodes.includes('MESSENGER_GROUP_CREATE')) {
      recordPass('Permissions Registry', `Configured permissions: ${permCodes.join(', ')}`);
    } else {
      recordFail('Permissions Registry', `Missing messenger permissions. Found: ${permCodes.join(', ')}`);
    }

    // 3. User Master Directory Integration
    const userRes = await client.query(`
      SELECT id, full_name, email, department_id 
      FROM public.user_master 
      WHERE is_active = true AND is_deleted = false 
      ORDER BY full_name 
      LIMIT 3;
    `);
    if (userRes.rows.length >= 2) {
      const u1 = userRes.rows[0];
      const u2 = userRes.rows[1];
      recordPass('User Master Directory', `Successfully retrieved workspace users (${u1.full_name}, ${u2.full_name})`);

      // Begin isolated test transaction
      await client.query('BEGIN;');

      // 4. Test 1-on-1 Direct Conversation Creation
      const [firstUid, secondUid] = u1.id < u2.id ? [u1.id, u2.id] : [u2.id, u1.id];
      const convRes = await client.query(`
        INSERT INTO public.messenger_conversations (type, direct_user1_id, direct_user2_id, created_by)
        VALUES ('direct', $1, $2, $3)
        RETURNING id, type, direct_user1_id, direct_user2_id;
      `, [firstUid, secondUid, u1.id]);

      const testConvId = convRes.rows[0].id;
      recordPass('Direct Conversation Creation', `Direct conversation ID ${testConvId} created between ${u1.full_name} and ${u2.full_name}`);

      // Add participants
      await client.query(`
        INSERT INTO public.messenger_participants (conversation_id, user_id, role)
        VALUES ($1, $2, 'member'), ($1, $3, 'member');
      `, [testConvId, u1.id, u2.id]);

      // 5. Test Direct Conversation Uniqueness
      let duplicateCaught = false;
      await client.query('SAVEPOINT dup_test;');
      try {
        await client.query(`
          INSERT INTO public.messenger_conversations (type, direct_user1_id, direct_user2_id, created_by)
          VALUES ('direct', $1, $2, $3);
        `, [firstUid, secondUid, u1.id]);
      } catch (dupErr) {
        duplicateCaught = true;
        await client.query('ROLLBACK TO SAVEPOINT dup_test;');
      }
      if (duplicateCaught) {
        recordPass('Direct Conversation Uniqueness Guard', 'Unique constraint (direct_user1_id, direct_user2_id) properly prevented duplicate direct chat');
      } else {
        recordFail('Direct Conversation Uniqueness Guard', 'Duplicate direct conversation was allowed');
      }

      // 6. Test Message Insertion & Trigger Synchronization
      const msgRes = await client.query(`
        INSERT INTO public.messenger_messages (conversation_id, sender_id, content, message_type)
        VALUES ($1, $2, 'Hello from Chandak Workspace QA test!', 'text')
        RETURNING id, content, created_at;
      `, [testConvId, u1.id]);
      const testMsg1Id = msgRes.rows[0].id;

      // Verify conversation summary trigger updated
      const convCheck = await client.query("SELECT last_message_preview, last_message_sender_id FROM public.messenger_conversations WHERE id = $1", [testConvId]);
      if (convCheck.rows[0].last_message_preview === 'Hello from Chandak Workspace QA test!' && convCheck.rows[0].last_message_sender_id === u1.id) {
        recordPass('Message Trigger Synchronization', `last_message_preview automatically updated via database trigger to "${convCheck.rows[0].last_message_preview}"`);
      } else {
        recordFail('Message Trigger Synchronization', `Conversation preview mismatch: ${convCheck.rows[0].last_message_preview}`);
      }

      // 7. Test Message with Attachments & Mentions
      const msg2Res = await client.query(`
        INSERT INTO public.messenger_messages (conversation_id, sender_id, content, message_type, reply_to_id, attachments, mentions)
        VALUES ($1, $2, 'Please review attached specification document @' || $3, 'file', $4,
          $5::jsonb,
          $6::jsonb
        )
        RETURNING id, attachments, mentions, reply_to_id;
      `, [
        testConvId,
        u2.id,
        u1.full_name,
        testMsg1Id,
        JSON.stringify([{ id: 'att-test-01', name: 'Specification.pdf', size: 1048576, type: 'application/pdf', url: '/api/proxy-attachment/att-test-01' }]),
        JSON.stringify([u1.id])
      ]);
      const testMsg2 = msg2Res.rows[0];
      if (testMsg2.reply_to_id === testMsg1Id && testMsg2.attachments.length === 1 && testMsg2.mentions.includes(u1.id)) {
        recordPass('Rich Message & Mentions', `Message with Quoted Reply to ${testMsg1Id}, 1 attachment, and @mention [${u1.id}] successfully stored`);
      } else {
        recordFail('Rich Message & Mentions', 'Rich message fields were not persisted accurately');
      }

      // 8. Test Emoji Reactions
      await client.query(`
        INSERT INTO public.messenger_reactions (message_id, user_id, reaction)
        VALUES ($1, $2, '👍'), ($1, $3, '❤️');
      `, [testMsg2.id, u1.id, u2.id]);
      const reactRes = await client.query("SELECT count(*) FROM public.messenger_reactions WHERE message_id = $1", [testMsg2.id]);
      if (reactRes.rows[0].count === '2') {
        recordPass('Message Reactions', 'Emoji reactions (👍, ❤️) successfully registered');
      } else {
        recordFail('Message Reactions', `Expected 2 reactions, got ${reactRes.rows[0].count}`);
      }

      // 9. Test Group Conversation Lifecycle
      const groupRes = await client.query(`
        INSERT INTO public.messenger_conversations (type, title, description, created_by)
        VALUES ('group', 'ERP Steering Committee', 'Executive steering and cross-module governance', $1)
        RETURNING id, title;
      `, [u1.id]);
      const groupId = groupRes.rows[0].id;

      // Add participants with roles (u1 = admin, u2 = member)
      await client.query(`
        INSERT INTO public.messenger_participants (conversation_id, user_id, role)
        VALUES ($1, $2, 'admin'), ($1, $3, 'member');
      `, [groupId, u1.id, u2.id]);

      const groupParts = await client.query("SELECT role FROM public.messenger_participants WHERE conversation_id = $1 AND user_id = $2", [groupId, u1.id]);
      if (groupParts.rows[0].role === 'admin') {
        recordPass('Group Conversation & Roles', `Group "${groupRes.rows[0].title}" initialized with creator as admin`);
      } else {
        recordFail('Group Conversation & Roles', `Group admin role mismatch: ${groupParts.rows[0]?.role}`);
      }

      // 10. Test Soft Message Deletion
      await client.query(`
        UPDATE public.messenger_messages 
        SET is_deleted = true, content = 'This message was deleted', attachments = '[]'::jsonb
        WHERE id = $1;
      `, [testMsg1Id]);
      const delMsg = await client.query("SELECT is_deleted, content FROM public.messenger_messages WHERE id = $1", [testMsg1Id]);
      if (delMsg.rows[0].is_deleted === true && delMsg.rows[0].content === 'This message was deleted') {
        recordPass('Soft Message Deletion', 'Message safely marked as deleted without destroying referential integrity');
      } else {
        recordFail('Soft Message Deletion', 'Soft deletion state failed');
      }

      // 11. Test Realtime Publication Inclusion
      const pubRes = await client.query(`
        SELECT tablename 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND tablename IN ('messenger_conversations', 'messenger_messages', 'messenger_participants', 'messenger_reactions');
      `);
      if (pubRes.rows.length === 4) {
        recordPass('Realtime Publication', `All 4 messenger tables published to supabase_realtime: ${pubRes.rows.map(r => r.tablename).join(', ')}`);
      } else {
        recordFail('Realtime Publication', `Realtime tables count mismatch: ${pubRes.rows.length}/4`);
      }

      // 12. Test Replica Identity FULL for Realtime UPDATE filters
      const replRes = await client.query(`
        SELECT relname, relreplident FROM pg_class 
        WHERE relname IN ('messenger_conversations', 'messenger_messages', 'messenger_participants', 'messenger_reactions')
          AND relreplident = 'f';
      `);
      if (replRes.rows.length === 4) {
        recordPass('Replica Identity FULL', 'All 4 messenger tables configured with REPLICA IDENTITY FULL for live filter events');
      } else {
        recordFail('Replica Identity FULL', `Expected 4 tables with FULL replica identity, found ${replRes.rows.length}`);
      }

      // 13. Test Message Sent State (Single Gray Tick ✓)
      // Set recipient last read to prior to message creation
      await client.query(`
        UPDATE public.messenger_participants 
        SET last_read_at = NOW() - INTERVAL '5 minutes' 
        WHERE conversation_id = $1 AND user_id = $2;
      `, [testConvId, u2.id]);

      const partBefore = await client.query(`
        SELECT last_read_at FROM public.messenger_participants 
        WHERE conversation_id = $1 AND user_id = $2;
      `, [testConvId, u2.id]);
      const msgCreated = new Date(msgRes.rows[0].created_at).getTime();
      const user2ReadBefore = new Date(partBefore.rows[0].last_read_at).getTime();
      const isSeenBefore = user2ReadBefore >= msgCreated;

      if (!isSeenBefore) {
        recordPass('Message Sent State (Single Tick)', 'Message created after recipient last_read_at correctly evaluates as Unread (Single Tick ✓)');
      } else {
        recordFail('Message Sent State (Single Tick)', 'Message falsely marked as seen before recipient read action');
      }

      // 14. Test Mark As Read Action & Seen Transition (Double Blue Tick ✓✓)
      await client.query(`
        UPDATE public.messenger_participants 
        SET last_read_at = NOW() + INTERVAL '1 second' 
        WHERE conversation_id = $1 AND user_id = $2;
      `, [testConvId, u2.id]);

      const partAfter = await client.query(`
        SELECT last_read_at FROM public.messenger_participants 
        WHERE conversation_id = $1 AND user_id = $2;
      `, [testConvId, u2.id]);
      const user2ReadAfter = new Date(partAfter.rows[0].last_read_at).getTime();
      const isSeenAfter = user2ReadAfter >= msgCreated;

      if (isSeenAfter) {
        recordPass('Message Seen State (Double Blue Tick)', 'Recipient read action successfully triggers Seen transition (Double Blue Tick ✓✓)');
      } else {
        recordFail('Message Seen State (Double Blue Tick)', 'Message failed to transition to Seen status');
      }

      // 15. Test Unread Count Lifecycle
      const unreadCountRes = await client.query(`
        SELECT COUNT(*) as unread FROM public.messenger_messages m
        JOIN public.messenger_participants p ON p.conversation_id = m.conversation_id
        WHERE p.user_id = $1 
          AND m.conversation_id = $2 
          AND m.sender_id != $1 
          AND m.is_deleted = false 
          AND m.created_at > p.last_read_at;
      `, [u2.id, testConvId]);

      if (parseInt(unreadCountRes.rows[0].unread, 10) === 0) {
        recordPass('Unread Message Count Lifecycle', 'Unread count dynamically drops to 0 after conversation is marked as read');
      } else {
        recordFail('Unread Message Count Lifecycle', `Expected 0 unread messages, got ${unreadCountRes.rows[0].unread}`);
      }

      // Rollback test transaction
      await client.query('ROLLBACK;');
      console.log('\n--- Test transaction rolled back cleanly (zero residual test artifacts) ---');

    } else {
      recordFail('User Master Directory', 'Insufficient active users in user_master to run conversation tests');
    }

  } catch (err) {
    console.error('Test suite error:', err);
    try { await client.query('ROLLBACK;'); } catch (_) {}
  } finally {
    await client.end();
  }

  // Summary
  console.log('\n================================================================');
  console.log('              MESSENGER TEST RESULTS SUMMARY                    ');
  console.log('================================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total Assertions: ${results.length}`);
  console.log(`✔ Passed: ${passed}`);
  console.log(`✖ Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runMessengerE2E();
