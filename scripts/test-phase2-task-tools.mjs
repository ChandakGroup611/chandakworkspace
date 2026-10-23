/**
 * Phase 2 Verification Suite: Task Workflow Read-Only Tools
 * Tests:
 * 1. Explain: Verified terminology and concepts from documentation
 * 2. Guide: Verified step-by-step guidance for Task creation and resolution
 * 3. Retrieve: Authorized retrieval vs. Unauthorized abstention
 * 4. Diagnose: Evidence-based blocker analysis (facts vs. hypotheses separation)
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { 
  explainTaskTool, 
  guideTaskWorkflowTool, 
  getTaskDetailsTool, 
  diagnoseTaskBlockerTool 
} from "../lib/copilot/tools/task-tools.ts";

const SAMPLE_TASK_ID = "763b4433-833d-4c63-bb09-c7e456d53616";
const PRIMARY_ASSIGNEE_ID = "77034b52-f8c3-4990-b331-1d40b03ef40d";
const UNAUTHORIZED_USER_ID = "11111111-1111-1111-1111-111111111111";

async function runPhase2Tests() {
  console.log("=================================================================");
  console.log("CHANDAK AI COPILOT — PHASE 2 TASK TOOLS VERIFICATION SUITE");
  console.log("=================================================================\n");

  let allPassed = true;

  // TEST 1: Capability 1 — Explain Task Terminology (Grounded)
  console.log("[TEST 1] Testing Capability 1: Explain Task Terminology...");
  const primaryAssigneeExp = await explainTaskTool.execute({ concept: "Primary Assignee" });
  if (primaryAssigneeExp.found && primaryAssigneeExp.sourceDocument.includes("BUSINESS_RULES.md")) {
    console.log(`  PASS: Found definition for 'Primary Assignee' citing ${primaryAssigneeExp.sourceDocument}.`);
  } else {
    console.error("  FAIL: Grounded explanation for Primary Assignee failed.");
    allPassed = false;
  }

  const fakeConceptExp = await explainTaskTool.execute({ concept: "QuantumTeleportationModule" });
  if (!fakeConceptExp.found && fakeConceptExp.safeGuidance) {
    console.log("  PASS: Fake concept returned safe abstention without hallucination.\n");
  } else {
    console.error("  FAIL: Expected abstention for fake concept, got:", fakeConceptExp);
    allPassed = false;
  }

  // TEST 2: Capability 2 — Guide Task Workflow
  console.log("[TEST 2] Testing Capability 2: Guide Task Workflow...");
  const createGuide = await guideTaskWorkflowTool.execute({ action: "CREATE" });
  if (createGuide.steps.length > 0 && createGuide.requiredFields.includes("Priority (LOW, MEDIUM, HIGH, URGENT)")) {
    console.log(`  PASS: Guide for Task Creation returned ${createGuide.steps.length} ordered steps and verified required fields.\n`);
  } else {
    console.error("  FAIL: Task Creation guidance missing steps or required fields.");
    allPassed = false;
  }

  // TEST 3: Capability 3 — Retrieve Task Details (Authorized vs. Unauthorized)
  console.log("[TEST 3] Testing Capability 3: Retrieve Live Authorized Task Details...");
  const authorizedContext = {
    userId: PRIMARY_ASSIGNEE_ID,
    userEmail: "assignee@chandakgroup.com",
    moduleCode: "TASK_WORKFLOW"
  };

  const authRes = await getTaskDetailsTool.execute({ taskId: SAMPLE_TASK_ID }, authorizedContext);
  if (authRes.success && authRes.verifiedRecord.id === SAMPLE_TASK_ID) {
    console.log(`  PASS: Authorized retrieval returned verified record (Title: '${authRes.verifiedRecord.title}').`);
  } else {
    console.error("  FAIL: Authorized task retrieval failed:", authRes);
    allPassed = false;
  }

  // Unauthorized retrieval
  const unauthorizedContext = {
    userId: UNAUTHORIZED_USER_ID,
    userEmail: "stranger@external.com",
    moduleCode: "TASK_WORKFLOW"
  };

  const unauthRes = await getTaskDetailsTool.execute({ taskId: SAMPLE_TASK_ID }, unauthorizedContext);
  if (unauthRes.error === "ACCESS_DENIED") {
    console.log("  PASS: Unauthorized user query was strictly blocked with 'ACCESS_DENIED'.\n");
  } else {
    console.error("  FAIL: Unauthorized query was not blocked!", unauthRes);
    allPassed = false;
  }

  // Non-existent task query (Abstention)
  const notFoundRes = await getTaskDetailsTool.execute({ taskId: "00000000-0000-0000-0000-000000000000" }, authorizedContext);
  if (notFoundRes.error === "NOT_FOUND" || notFoundRes.error === "ACCESS_DENIED") {
    console.log("  PASS: Non-existent task query returned safe abstention without hallucinating.\n");
  } else {
    console.error("  FAIL: Non-existent task produced invalid output:", notFoundRes);
    allPassed = false;
  }

  // TEST 4: Capability 4 — Diagnose Task Blocker (Facts vs. Hypotheses)
  console.log("[TEST 4] Testing Capability 4: Diagnose Task Blocker...");
  // Diagnose with an unauthorized user attempting to edit schedule
  const diagRes = await diagnoseTaskBlockerTool.execute(
    { taskId: SAMPLE_TASK_ID, attemptedAction: "EDIT_SCHEDULE" },
    unauthorizedContext
  );

  if (diagRes.isBlocked && diagRes.verifiedFacts.length > 0 && diagRes.workingHypotheses.length > 0) {
    console.log("  PASS: Blocker diagnosed with explicit separation:");
    console.log(`    - Verified Facts: ${diagRes.verifiedFacts[0]}`);
    console.log(`    - Working Hypotheses: ${diagRes.workingHypotheses[0]}`);
    console.log(`    - Safe Recommendation: ${diagRes.recommendedSafeAction}\n`);
  } else {
    console.error("  FAIL: Diagnose blocker failed to separate facts from hypotheses:", diagRes);
    allPassed = false;
  }

  console.log("=================================================================");
  console.log(allPassed ? "PHASE 2 TASK TOOLS STATUS: ALL CHECKS PASSED (PASS)" : "PHASE 2 TASK TOOLS STATUS: CHECKS FAILED (FAIL)");
  console.log("=================================================================\n");

  process.exit(allPassed ? 0 : 1);
}

runPhase2Tests();
