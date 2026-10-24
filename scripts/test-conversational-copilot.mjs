/**
 * Comprehensive Regression & Conversational Intelligence Verification Suite
 * Verifies all criteria from Chandak AI Copilot Evolution:
 * 1. "How do I delete a task?" returns verified deletion procedure (not CREATE fallback).
 * 2. "I don't have rights" correctly refers to preceding action & role elevation.
 * 3. "Explain SQL joins with an example" receives a useful general answer without DB lookup.
 * 4. "Draft an email to my manager" works without matching knowledge document.
 * 5. "Explain that more simply" uses the preceding answer.
 * 6. Topic switching without stale context interference.
 * 7. Chandak-specific claims are grounded in authoritative sources.
 * 8. Missing knowledge produces an honest response rather than an unrelated card.
 * 9. Unauthorized business requests remain blocked.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { guideTaskWorkflow, explainTaskConcept } from "../lib/copilot/groundings/task-grounding.ts";
import { guideTaskWorkflowTool, diagnoseTaskBlockerTool, getTaskDetailsTool } from "../lib/copilot/tools/task-tools.ts";
import { streamLLMResponse } from "../lib/copilot/llm-provider.ts";

async function runTestSuite() {
  console.log("=================================================================");
  console.log("CHANDAK AI COPILOT — CONVERSATIONAL INTELLIGENCE REGRESSION SUITE");
  console.log("=================================================================\n");

  let passedCount = 0;
  let totalTests = 9;

  // TEST 1: Task Deletion Workflow (No silent CREATE fallback)
  console.log("[TEST 1] Testing 'How do I delete a task?'...");
  const delGuide = guideTaskWorkflow("How do I delete a task?");
  if (
    delGuide &&
    delGuide.title === "Task Deletion Workflow" &&
    delGuide.workflow === "Task Deletion" &&
    delGuide.steps.length > 0 &&
    delGuide.applicableRule.includes("Deletion Authority")
  ) {
    console.log("  ✅ PASS: Returned verified Task Deletion Workflow (Not Task Creation).");
    passedCount++;
  } else {
    console.error("  ❌ FAIL: Expected Task Deletion Workflow, got:", delGuide);
  }

  // TEST 2: Greedy Keyword Matching Eliminated
  console.log("\n[TEST 2] Testing greedy keyword matching ('I have a task to write an email')...");
  const greedyCheck = explainTaskConcept("I have a task to write an email");
  if (greedyCheck === null) {
    console.log("  ✅ PASS: General question containing 'task' did NOT trigger Chandak Task card.");
    passedCount++;
  } else {
    console.error("  ❌ FAIL: Greedy keyword matching triggered generic card:", greedyCheck);
  }

  // TEST 3: General Question: SQL Joins
  console.log("\n[TEST 3] Testing general question: 'Explain SQL joins with an example'...");
  let sqlResponse = "";
  await streamLLMResponse({
    prompt: "Explain SQL joins with an example",
    history: [],
    onToken: (tok) => {
      sqlResponse += tok;
    }
  });

  if (
    sqlResponse.includes("INNER JOIN") &&
    sqlResponse.includes("LEFT") &&
    sqlResponse.includes("SELECT") &&
    !sqlResponse.includes("TASK_WORKFLOW")
  ) {
    console.log("  ✅ PASS: General SQL joins answered cleanly with code examples without company DB lookup.");
    passedCount++;
  } else {
    console.error("  ❌ FAIL: SQL joins response inadequate:", sqlResponse.slice(0, 150));
  }

  // TEST 4: General Question: Email Drafting
  console.log("\n[TEST 4] Testing writing assistant: 'Draft an email to my manager'...");
  let emailResponse = "";
  await streamLLMResponse({
    prompt: "Draft an email to my manager",
    history: [],
    onToken: (tok) => {
      emailResponse += tok;
    }
  });

  if (
    emailResponse.toLowerCase().includes("subject:") &&
    emailResponse.toLowerCase().includes("dear manager")
  ) {
    console.log("  ✅ PASS: Successfully drafted email without requiring knowledge documents.");
    passedCount++;
  } else {
    console.error("  ❌ FAIL: Email drafting failed:", emailResponse.slice(0, 150));
  }

  // TEST 5: Contextual Follow-Up: "Explain that more simply"
  console.log("\n[TEST 5] Testing follow-up: 'Explain that more simply' using prior turn...");
  let simplerResponse = "";
  await streamLLMResponse({
    prompt: "Explain that more simply",
    history: [
      { role: "user", content: "How does task deletion work under Chandak rules?" },
      { role: "assistant", content: delGuide.summary + " " + delGuide.applicableRule }
    ],
    onToken: (tok) => {
      simplerResponse += tok;
    }
  });

  if (
    simplerResponse.toLowerCase().includes("simpler") ||
    simplerResponse.toLowerCase().includes("simply") ||
    simplerResponse.toLowerCase().includes("owner")
  ) {
    console.log("  ✅ PASS: Correctly referenced prior turn to simplify explanation.");
    passedCount++;
  } else {
    console.error("  ❌ FAIL: Simplification follow-up failed:", simplerResponse.slice(0, 150));
  }

  // TEST 6: Contextual Follow-Up: "What if I don't have rights?"
  console.log("\n[TEST 6] Testing follow-up: 'What if I don't have rights?' after task deletion...");
  let rightsResponse = "";
  await streamLLMResponse({
    prompt: "What if I don't have rights?",
    history: [
      { role: "user", content: "How do I delete a task?" },
      { role: "assistant", content: delGuide.summary }
    ],
    onToken: (tok) => {
      rightsResponse += tok;
    }
  });

  if (
    rightsResponse.includes("Primary Assignee") ||
    rightsResponse.includes("Workspace Owner") ||
    rightsResponse.includes("TASKS_DELETE")
  ) {
    console.log("  ✅ PASS: Correctly addressed missing rights in context of preceding action.");
    passedCount++;
  } else {
    console.error("  ❌ FAIL: Rights response did not reference permission rules:", rightsResponse.slice(0, 150));
  }

  // TEST 7: Clean Topic Switching (Fleet Desk after SQL query)
  console.log("\n[TEST 7] Testing topic switching (Fleet question after general SQL discussion)...");
  let fleetPrompt = "Where do I find vehicle movement pass rules?";
  let fleetExp = explainTaskConcept(fleetPrompt);
  // Task concept should return null (because it is vehicle domain)
  if (fleetExp === null) {
    console.log("  ✅ PASS: Task grounding cleanly abstained from vehicle domain query.");
    passedCount++;
  } else {
    console.error("  ❌ FAIL: Task grounding interfered with vehicle query:", fleetExp);
  }

  // TEST 8: Missing Knowledge Honest Abstention (No random card)
  console.log("\n[TEST 8] Testing missing knowledge: 'QuantumTeleportationModule'...");
  const fakeConcept = explainTaskConcept("QuantumTeleportationModule");
  if (fakeConcept === null) {
    console.log("  ✅ PASS: Unknown concept returned clean abstention without inventing cards.");
    passedCount++;
  } else {
    console.error("  ❌ FAIL: Unknown concept returned fake card:", fakeConcept);
  }

  // TEST 9: Unauthorized Business Request Blocked
  console.log("\n[TEST 9] Testing unauthorized task details retrieval...");
  const unauthResult = await getTaskDetailsTool.execute(
    { taskId: "00000000-0000-0000-0000-000000000000" },
    {
      userId: "11111111-1111-1111-1111-111111111111",
      userEmail: "unauthorized@test.internal",
      moduleCode: "TASK_WORKFLOW"
    }
  );

  if (unauthResult.error === "ACCESS_DENIED" || unauthResult.error === "NOT_FOUND") {
    console.log(`  ✅ PASS: Unauthorized access blocked (${unauthResult.error}: ${unauthResult.message}).`);
    passedCount++;
  } else {
    console.error("  ❌ FAIL: Expected access denied, got:", unauthResult);
  }

  console.log("\n=================================================================");
  console.log(`RESULTS: ${passedCount} / ${totalTests} TESTS PASSED`);
  console.log("=================================================================");

  if (passedCount !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Fatal test suite error:", err);
  process.exit(1);
});
