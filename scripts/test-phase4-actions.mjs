/**
 * Chandak AI Copilot — Phase 4: Action Proposal Engine Verification Suite
 * Tests:
 * 1. Proposal Generation with HMAC cryptographic signature
 * 2. Tamper resistance (tampered signature / parameters rejected)
 * 3. User ownership mismatch rejected
 * 4. TOCTOU precondition validation (concurrent task modification aborted)
 * 5. Atomic CAS execution & Replay / Double-execution protection
 * 6. Audit trail verification in copilot_action_logs
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { 
  createActionProposal, 
  executeActionProposal 
} from "../lib/copilot/actions/proposal-engine.ts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SAMPLE_TASK_ID = "763b4433-833d-4c63-bb09-c7e456d53616";
const PRIMARY_ASSIGNEE_ID = "77034b52-f8c3-4990-b331-1d40b03ef40d";
const OTHER_USER_ID = "bfd462a0-bf5d-4e76-98d4-f67c7f25b40f";

async function runPhase4Tests() {
  console.log("=================================================================");
  console.log("CHANDAK AI COPILOT — PHASE 4 ACTION PROPOSAL ENGINE VERIFICATION");
  console.log("=================================================================\n");

  let allPassed = true;

  // Setup: Fetch original task status to restore later
  const { data: originalTask } = await supabase
    .from("tasks")
    .select("status_id, updated_at")
    .eq("id", SAMPLE_TASK_ID)
    .single();

  const originalStatusId = originalTask.status_id;
  console.log(`Original Task Status: '${originalStatusId}'`);

  // Setup: Create a temporary test conversation
  const { data: testConvo, error: convoErr } = await supabase
    .from("copilot_conversations")
    .insert({
      user_id: PRIMARY_ASSIGNEE_ID,
      title: "Phase 4 Automated Verification Conversation",
      module_code: "TASK_WORKFLOW"
    })
    .select()
    .single();

  if (convoErr || !testConvo) {
    console.error("Failed to setup test conversation:", convoErr);
    process.exit(1);
  }

  const conversationId = testConvo.id;

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Proposal Generation & HMAC Signature
    // ------------------------------------------------------------------------
    console.log("[TEST 1] Testing Action Proposal Generation & Cryptographic Signing...");
    const prop1 = await createActionProposal({
      conversationId,
      userId: PRIMARY_ASSIGNEE_ID,
      userEmail: "assignee@chandakgroup.com",
      actionType: "UPDATE_TASK_STATUS",
      targetEntityType: "task",
      targetEntityId: SAMPLE_TASK_ID,
      payload: {
        newStatusId: originalStatusId,
        remark: "Phase 4 Automated Test Verification"
      },
      previewData: {
        field: "status",
        action: "Verification Test Status Transition"
      }
    });

    if (prop1.proposalId && prop1.status === "PENDING_CONFIRMATION" && prop1.requiresExplicitConfirmation) {
      console.log(`  PASS: Action proposal created (${prop1.proposalId}) with status 'PENDING_CONFIRMATION'.\n`);
    } else {
      console.error("  FAIL: Proposal creation failed:", prop1);
      allPassed = false;
    }

    // ------------------------------------------------------------------------
    // TEST 2: Tamper Resistance (Tampered Signature / Parameters)
    // ------------------------------------------------------------------------
    console.log("[TEST 2] Testing Tamper Resistance (Invalid Signature)...");
    // Manually tamper with signature in the database
    await supabase
      .from("copilot_action_proposals")
      .update({ signature: "tampered-forged-signature-hex-1234567890abcdef" })
      .eq("id", prop1.proposalId);

    const tamperedRes = await executeActionProposal(
      prop1.proposalId,
      PRIMARY_ASSIGNEE_ID,
      "assignee@chandakgroup.com"
    );

    if (!tamperedRes.success && tamperedRes.errorCode === "SIGNATURE_INVALID") {
      console.log("  PASS: Tampered proposal strictly rejected with 'SIGNATURE_INVALID'.\n");
    } else {
      console.error("  FAIL: Tampered proposal was NOT rejected properly:", tamperedRes);
      allPassed = false;
    }

    // ------------------------------------------------------------------------
    // TEST 3: User Ownership Mismatch
    // ------------------------------------------------------------------------
    console.log("[TEST 3] Testing User Ownership Mismatch Check...");
    const prop3 = await createActionProposal({
      conversationId,
      userId: PRIMARY_ASSIGNEE_ID,
      userEmail: "assignee@chandakgroup.com",
      actionType: "UPDATE_TASK_STATUS",
      targetEntityType: "task",
      targetEntityId: SAMPLE_TASK_ID,
      payload: { newStatusId: originalStatusId },
      previewData: { action: "Ownership test" }
    });

    // Try executing with a different user
    const mismatchRes = await executeActionProposal(
      prop3.proposalId,
      OTHER_USER_ID,
      "other@chandakgroup.com"
    );

    if (!mismatchRes.success && mismatchRes.errorCode === "USER_MISMATCH") {
      console.log("  PASS: Different user execution strictly blocked with 'USER_MISMATCH'.\n");
    } else {
      console.error("  FAIL: User mismatch was not blocked!", mismatchRes);
      allPassed = false;
    }

    // ------------------------------------------------------------------------
    // TEST 4: TOCTOU Precondition Verification (Concurrent Task Change)
    // ------------------------------------------------------------------------
    console.log("[TEST 4] Testing TOCTOU Precondition Check (Concurrent Modification)...");
    const prop4 = await createActionProposal({
      conversationId,
      userId: PRIMARY_ASSIGNEE_ID,
      userEmail: "assignee@chandakgroup.com",
      actionType: "UPDATE_TASK_STATUS",
      targetEntityType: "task",
      targetEntityId: SAMPLE_TASK_ID,
      payload: { newStatusId: originalStatusId },
      previewData: { action: "TOCTOU test" }
    });

    // Simulate concurrent modification of the task by another user
    await supabase
      .from("tasks")
      .update({ updated_at: new Date(Date.now() + 1000).toISOString() })
      .eq("id", SAMPLE_TASK_ID);

    const toctouRes = await executeActionProposal(
      prop4.proposalId,
      PRIMARY_ASSIGNEE_ID,
      "assignee@chandakgroup.com"
    );

    if (!toctouRes.success && toctouRes.errorCode === "STATE_CHANGED_CONCURRENTLY") {
      console.log("  PASS: Concurrent state modification detected; proposal safely aborted with 'STATE_CHANGED_CONCURRENTLY'.\n");
    } else {
      console.error("  FAIL: TOCTOU check failed to abort:", toctouRes);
      allPassed = false;
    }

    // ------------------------------------------------------------------------
    // TEST 5: Atomic CAS Execution & Replay / Double-Execution Protection
    // ------------------------------------------------------------------------
    console.log("[TEST 5] Testing Atomic CAS Execution & Replay Protection...");
    const prop5 = await createActionProposal({
      conversationId,
      userId: PRIMARY_ASSIGNEE_ID,
      userEmail: "assignee@chandakgroup.com",
      actionType: "UPDATE_TASK_STATUS",
      targetEntityType: "task",
      targetEntityId: SAMPLE_TASK_ID,
      payload: { 
        newStatusId: originalStatusId,
        remark: "Phase 4 Execution Test Verified"
      },
      previewData: { action: "CAS Execution test" }
    });

    // First execution (Valid)
    const execRes1 = await executeActionProposal(
      prop5.proposalId,
      PRIMARY_ASSIGNEE_ID,
      "assignee@chandakgroup.com"
    );

    if (execRes1.success && execRes1.status === "EXECUTED") {
      console.log("  PASS: First execution succeeded and transitioned proposal to 'EXECUTED'.");
    } else {
      console.error("  FAIL: Execution failed:", execRes1);
      allPassed = false;
    }

    // Second execution (Replay attack / Double-click)
    const execRes2 = await executeActionProposal(
      prop5.proposalId,
      PRIMARY_ASSIGNEE_ID,
      "assignee@chandakgroup.com"
    );

    if (!execRes2.success && execRes2.errorCode === "CONCURRENT_CONFLICT") {
      console.log("  PASS: Replay / Double execution blocked with 'CONCURRENT_CONFLICT'.\n");
    } else {
      console.error("  FAIL: Replay execution was not blocked!", execRes2);
      allPassed = false;
    }

    // ------------------------------------------------------------------------
    // TEST 6: Audit Trail Verification in copilot_action_logs
    // ------------------------------------------------------------------------
    console.log("[TEST 6] Testing Compliance Audit Logging in copilot_action_logs...");
    const { data: logs, error: logErr } = await supabase
      .from("copilot_action_logs")
      .select("*")
      .eq("proposal_id", prop5.proposalId)
      .eq("execution_status", "SUCCESS")
      .maybeSingle();

    if (!logErr && logs && logs.execution_status === "SUCCESS" && logs.action_type === "UPDATE_TASK_STATUS") {
      console.log(`  PASS: Immutable audit record verified in copilot_action_logs (Log ID: ${logs.id}, Status: ${logs.execution_status}).\n`);
    } else {
      console.error("  FAIL: Audit log verification failed:", logErr, logs);
      allPassed = false;
    }

  } finally {
    // Teardown: Restore original task status
    await supabase
      .from("tasks")
      .update({ status_id: originalStatusId })
      .eq("id", SAMPLE_TASK_ID);

    // Teardown: Clean up test conversation (cascades to proposals/messages)
    await supabase
      .from("copilot_conversations")
      .delete()
      .eq("id", conversationId);

    console.log("Teardown: Task status restored and test conversation cleaned up.");
  }

  console.log("=================================================================");
  console.log(allPassed ? "PHASE 4 ACTION ENGINE STATUS: ALL CHECKS PASSED (PASS)" : "PHASE 4 ACTION ENGINE STATUS: CHECKS FAILED (FAIL)");
  console.log("=================================================================\n");

  process.exit(allPassed ? 0 : 1);
}

runPhase4Tests();
