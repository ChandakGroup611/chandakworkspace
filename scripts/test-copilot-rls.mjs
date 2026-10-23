import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Client } = pg;
const dbUrl = process.env.DATABASE_URL;

const USER_A = "2f8bb7e1-fee9-4458-886e-479687115968"; // Sagar
const USER_B = "06fadc74-5ef5-4d0a-a880-053efe3804be"; // Vinayak

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function runAdversarialRlsSuite() {
  console.log("=================================================================");
  console.log("CHANDAK AI COPILOT — ADVERSARIAL RLS SECURITY TEST SUITE");
  console.log("=================================================================\n");

  await client.connect();
  let allPassed = true;
  let testConvoId = null;

  try {
    // SETUP: Create a real conversation owned by User A as service role
    const setupRes = await client.query(`
      INSERT INTO public.copilot_conversations (user_id, module_code, title)
      VALUES ($1, 'TASK_WORKFLOW', 'RLS Test Conversation - User A')
      RETURNING id;
    `, [USER_A]);
    testConvoId = setupRes.rows[0].id;
    console.log(`[SETUP] Created test conversation ${testConvoId} owned by User A (${USER_A})\n`);

    // TEST 1: ADV-01 — Cross-User Conversation Snooping
    console.log("[TEST 1 / ADV-01] Testing Cross-User Conversation Snooping (User B querying User A)...");
    await client.query("BEGIN;");
    await client.query("SET LOCAL ROLE authenticated;");
    await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B}';`);
    await client.query(`SET LOCAL "request.jwt.claims" = '{"sub":"${USER_B}","role":"authenticated"}';`);

    const queryRes = await client.query(`
      SELECT * FROM public.copilot_conversations WHERE id = $1;
    `, [testConvoId]);

    await client.query("COMMIT;");

    if (queryRes.rows.length === 0) {
      console.log("  PASS: RLS blocked User B from viewing User A's conversation (0 rows returned).\n");
    } else {
      console.error("  FAIL: User B was able to view User A's conversation!\n");
      allPassed = false;
    }

    // TEST 2: ADV-02a — Role Forgery on Messages (Client inserting role = 'assistant')
    console.log("[TEST 2 / ADV-02a] Testing Role Forgery (Client inserting role = 'assistant')...");
    await client.query("BEGIN;");
    await client.query("SET LOCAL ROLE authenticated;");
    await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A}';`);
    await client.query(`SET LOCAL "request.jwt.claims" = '{"sub":"${USER_A}","role":"authenticated"}';`);

    let forgedRoleBlocked = false;
    try {
      await client.query(`
        INSERT INTO public.copilot_messages (conversation_id, user_id, role, content)
        VALUES ($1, $2, 'assistant', 'Forged assistant completion');
      `, [testConvoId, USER_A]);
    } catch (err) {
      if (err.message.includes("row-level security policy")) {
        forgedRoleBlocked = true;
      } else {
        console.warn("  Caught other error:", err.message);
      }
    } finally {
      await client.query("ROLLBACK;");
    }

    if (forgedRoleBlocked) {
      console.log("  PASS: RLS blocked client from inserting role = 'assistant' message.\n");
    } else {
      console.error("  FAIL: Client was able to insert role = 'assistant' message!\n");
      allPassed = false;
    }

    // TEST 3: ADV-02b — Payload Spoofing (Client inserting action_preview directly)
    console.log("[TEST 3 / ADV-02b] Testing Action Preview Spoofing (Client setting action_preview)...");
    await client.query("BEGIN;");
    await client.query("SET LOCAL ROLE authenticated;");
    await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A}';`);
    await client.query(`SET LOCAL "request.jwt.claims" = '{"sub":"${USER_A}","role":"authenticated"}';`);

    let forgedPreviewBlocked = false;
    try {
      await client.query(`
        INSERT INTO public.copilot_messages (conversation_id, user_id, role, content, action_preview)
        VALUES ($1, $2, 'user', 'Normal message', '{"forged_action": true}');
      `, [testConvoId, USER_A]);
    } catch (err) {
      if (err.message.includes("row-level security policy")) {
        forgedPreviewBlocked = true;
      }
    } finally {
      await client.query("ROLLBACK;");
    }

    if (forgedPreviewBlocked) {
      console.log("  PASS: RLS blocked client from setting action_preview in messages.\n");
    } else {
      console.error("  FAIL: Client was able to set action_preview!\n");
      allPassed = false;
    }

    // TEST 4: ADV-03 — Direct Proposal Modification (Client inserting into copilot_action_proposals)
    console.log("[TEST 4 / ADV-03] Testing Client Proposal Insertion (policy_proposals_deny_insert)...");
    await client.query("BEGIN;");
    await client.query("SET LOCAL ROLE authenticated;");
    await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A}';`);
    await client.query(`SET LOCAL "request.jwt.claims" = '{"sub":"${USER_A}","role":"authenticated"}';`);

    let proposalInsertBlocked = false;
    try {
      await client.query(`
        INSERT INTO public.copilot_action_proposals (
          user_id, conversation_id, action_type, target_entity_type, target_entity_id,
          sanitized_payload, current_state_hash, expires_at, idempotency_key, signature
        ) VALUES (
          $1, $2, 'TASK_DELETE', 'tasks', 'TSK-100',
          '{}', 'hash', now() + interval '5 min', gen_random_uuid(), 'fake_sig'
        );
      `, [USER_A, testConvoId]);
    } catch (err) {
      if (err.message.includes("row-level security policy")) {
        proposalInsertBlocked = true;
      }
    } finally {
      await client.query("ROLLBACK;");
    }

    if (proposalInsertBlocked) {
      console.log("  PASS: RLS strictly blocked client from inserting into copilot_action_proposals.\n");
    } else {
      console.error("  FAIL: Client was able to insert into copilot_action_proposals!\n");
      allPassed = false;
    }

    // TEST 5: ADV-04 — Direct Audit Log Modification (Client inserting into copilot_action_logs)
    console.log("[TEST 5 / ADV-04] Testing Client Audit Log Injection (policy_action_logs_deny_insert)...");
    await client.query("BEGIN;");
    await client.query("SET LOCAL ROLE authenticated;");
    await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A}';`);
    await client.query(`SET LOCAL "request.jwt.claims" = '{"sub":"${USER_A}","role":"authenticated"}';`);

    let auditInsertBlocked = false;
    try {
      await client.query(`
        INSERT INTO public.copilot_action_logs (
          user_id, user_email_snapshot, action_type, target_entity_type, target_entity_id, execution_status
        ) VALUES (
          $1, 'fake@admin.com', 'TASK_DELETE', 'tasks', 'TSK-100', 'SUCCESS'
        );
      `, [USER_A]);
    } catch (err) {
      if (err.message.includes("row-level security policy")) {
        auditInsertBlocked = true;
      }
    } finally {
      await client.query("ROLLBACK;");
    }

    if (auditInsertBlocked) {
      console.log("  PASS: RLS strictly blocked client from inserting into copilot_action_logs.\n");
    } else {
      console.error("  FAIL: Client was able to insert into copilot_action_logs!\n");
      allPassed = false;
    }

    // TEST 6: ADV-05 — Conversation Metadata Tampering Trigger Check
    console.log("[TEST 6 / ADV-05] Testing Conversation Metadata Tampering Trigger (tr_copilot_conversation_update)...");
    let triggerBlocked = false;
    try {
      await client.query(`
        UPDATE public.copilot_conversations
        SET module_code = 'GENERAL'
        WHERE id = $1;
      `, [testConvoId]);
    } catch (err) {
      if (err.message.includes("Cannot modify server-controlled conversation fields")) {
        triggerBlocked = true;
      }
    }

    if (triggerBlocked) {
      console.log("  PASS: Trigger blocked modification of server-controlled conversation fields.\n");
    } else {
      console.error("  FAIL: Client was able to modify server-controlled conversation fields!\n");
      allPassed = false;
    }

    // TEST 7: ADV-06 — Legitimate Client Message Insertion & Service Role Access
    console.log("[TEST 7 / ADV-06] Testing Legitimate User Message Insertion & Service Role Access...");
    await client.query("BEGIN;");
    await client.query("SET LOCAL ROLE authenticated;");
    await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A}';`);
    await client.query(`SET LOCAL "request.jwt.claims" = '{"sub":"${USER_A}","role":"authenticated"}';`);

    const legitRes = await client.query(`
      INSERT INTO public.copilot_messages (conversation_id, user_id, role, content)
      VALUES ($1, $2, 'user', 'What are the task execution rules?')
      RETURNING id, role, content;
    `, [testConvoId, USER_A]);

    await client.query("COMMIT;");

    if (legitRes.rows.length === 1 && legitRes.rows[0].role === "user") {
      console.log("  PASS: User A successfully inserted legitimate user message.\n");
    } else {
      console.error("  FAIL: Legitimate message insertion failed!\n");
      allPassed = false;
    }

  } catch (globalErr) {
    console.error("Unexpected error in test suite:", globalErr);
    allPassed = false;
  } finally {
    // CLEANUP: Delete test conversation (cascades to messages)
    if (testConvoId) {
      console.log(`[CLEANUP] Deleting test conversation ${testConvoId}...`);
      await client.query("DELETE FROM public.copilot_conversations WHERE id = $1;", [testConvoId]);
      console.log("[CLEANUP] Test artifacts cleanly removed.\n");
    }
    await client.end();
  }

  console.log("=================================================================");
  console.log(allPassed ? "ADVERSARIAL RLS SUITE RESULT: ALL 7 CHECKS PASSED (PASS)" : "ADVERSARIAL RLS SUITE RESULT: CHECKS FAILED (FAIL)");
  console.log("=================================================================\n");

  process.exit(allPassed ? 0 : 1);
}

runAdversarialRlsSuite();
