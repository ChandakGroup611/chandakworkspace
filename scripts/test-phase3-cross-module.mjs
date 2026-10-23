/**
 * Chandak AI Copilot — Phase 3: Cross-Module Read-Only Tools Verification Suite
 * Verifies Vehicle Desk and Design Tracking read-only tools:
 * 1. Explain: Grounded explanations vs safe abstention
 * 2. Guide: Role-aware step-by-step guidance
 * 3. Retrieve: Authorized retrieval vs strictly blocked unauthorized queries
 * 4. Diagnose: Evidence-based blocker diagnosis with facts vs hypotheses separation
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { 
  explainVehicleTool, 
  guideVehicleWorkflowTool, 
  getVehicleDetailsTool, 
  diagnoseVehicleBlockerTool 
} from "../lib/copilot/tools/vehicle-tools.ts";

import { 
  explainDesignTool, 
  guideDesignWorkflowTool, 
  getDesignProjectDetailsTool, 
  diagnoseDesignBlockerTool 
} from "../lib/copilot/tools/design-tools.ts";

const FLEET_AUTHORIZED_USER = "d1b0c396-eeb2-4567-a6bd-cb04adb8327a"; // FLEET_STAFF with can_dispatch_trips: true
const FLEET_WORKSHOP_USER = "2f8bb7e1-fee9-4458-886e-479687115968";   // FLEET_WORKSHOP with can_dispatch_trips: false
const DESIGN_COORDINATOR_USER = "bfd462a0-bf5d-4e76-98d4-f67c7f25b40f"; // DESIGN_COORDINATOR (ROLE_AGENT) with can_drawings_approve_gfc: false
const UNAUTHORIZED_USER = "11111111-1111-1111-1111-111111111111";     // External / non-enrolled user

const SAMPLE_VEHICLE_ID = "veh-mu41ekf2"; // MH-02-EE-8522 (Volvo XC90)

async function runPhase3Tests() {
  console.log("=================================================================");
  console.log("CHANDAK AI COPILOT — PHASE 3 CROSS-MODULE TOOLS VERIFICATION");
  console.log("=================================================================\n");

  let allPassed = true;

  // --------------------------------------------------------------------------
  // SECTION A: VEHICLE DESK TOOLS
  // --------------------------------------------------------------------------
  console.log("--- [A] VEHICLE DESK CAPABILITIES ---");

  // A1. Explain Vehicle Concept
  console.log("[TEST A1] Testing Explain Vehicle Concept...");
  const passExp = await explainVehicleTool.execute({ concept: "Movement Pass" });
  if (passExp.found && passExp.sourceDocument.includes("Movement Gate Passes")) {
    console.log(`  PASS: Found definition for 'Movement Pass' citing '${passExp.sourceDocument}'.`);
  } else {
    console.error("  FAIL: Expected definition for Movement Pass, got:", passExp);
    allPassed = false;
  }

  const fakeVehExp = await explainVehicleTool.execute({ concept: "HyperloopPodThruster" });
  if (!fakeVehExp.found && fakeVehExp.safeGuidance) {
    console.log("  PASS: Fake concept returned safe abstention without hallucination.\n");
  } else {
    console.error("  FAIL: Expected abstention for fake concept, got:", fakeVehExp);
    allPassed = false;
  }

  // A2. Guide Vehicle Workflow
  console.log("[TEST A2] Testing Guide Vehicle Workflow...");
  const dispatchGuide = await guideVehicleWorkflowTool.execute({ action: "DISPATCH_TRIP" });
  if (dispatchGuide.steps.length > 0 && dispatchGuide.requiredFields.includes("Opening Odometer Reading")) {
    console.log(`  PASS: Guide for Trip Dispatch returned ${dispatchGuide.steps.length} ordered steps and verified fields.\n`);
  } else {
    console.error("  FAIL: Trip Dispatch guidance missing steps or required fields:", dispatchGuide);
    allPassed = false;
  }

  // A3. Retrieve Live Vehicle Details
  console.log("[TEST A3] Testing Retrieve Live Authorized Vehicle Details...");
  const fleetAuthCtx = {
    userId: FLEET_AUTHORIZED_USER,
    userEmail: "fleetstaff@chandakgroup.com",
    moduleCode: "VEHICLE_DESK"
  };

  const vehRes = await getVehicleDetailsTool.execute({ vehicleId: SAMPLE_VEHICLE_ID }, fleetAuthCtx);
  if (vehRes.success && vehRes.verifiedRecord.registrationNumber === "MH-02-EE-8522") {
    console.log(`  PASS: Authorized retrieval returned verified vehicle '${vehRes.verifiedRecord.make} ${vehRes.verifiedRecord.model}' (${vehRes.verifiedRecord.registrationNumber}).`);
  } else {
    console.error("  FAIL: Authorized vehicle retrieval failed:", vehRes);
    allPassed = false;
  }

  // Unauthorized user query
  const unauthCtx = {
    userId: UNAUTHORIZED_USER,
    userEmail: "stranger@external.com",
    moduleCode: "VEHICLE_DESK"
  };

  const unauthVehRes = await getVehicleDetailsTool.execute({ vehicleId: SAMPLE_VEHICLE_ID }, unauthCtx);
  if (unauthVehRes.error === "ACCESS_DENIED") {
    console.log("  PASS: Unauthorized user vehicle query strictly blocked with 'ACCESS_DENIED'.");
  } else {
    console.error("  FAIL: Unauthorized query was not blocked!", unauthVehRes);
    allPassed = false;
  }

  // Non-existent vehicle query
  const notFoundVeh = await getVehicleDetailsTool.execute({ vehicleId: "veh-non-existent-999" }, fleetAuthCtx);
  if (notFoundVeh.error === "NOT_FOUND") {
    console.log("  PASS: Non-existent vehicle returned safe abstention without hallucinating.\n");
  } else {
    console.error("  FAIL: Expected NOT_FOUND for non-existent vehicle, got:", notFoundVeh);
    allPassed = false;
  }

  // A4. Diagnose Vehicle Blocker
  console.log("[TEST A4] Testing Diagnose Vehicle Action Blocker...");
  const workshopCtx = {
    userId: FLEET_WORKSHOP_USER,
    userEmail: "workshop@chandakgroup.com",
    moduleCode: "VEHICLE_DESK"
  };

  const diagVehRes = await diagnoseVehicleBlockerTool.execute(
    { vehicleId: SAMPLE_VEHICLE_ID, attemptedAction: "DISPATCH" },
    workshopCtx
  );

  if (diagVehRes.isBlocked && diagVehRes.blockerType === "PERMISSION_DENIED" && diagVehRes.verifiedFacts.length > 0 && diagVehRes.workingHypotheses.length > 0) {
    console.log("  PASS: Vehicle blocker diagnosed with explicit separation:");
    console.log(`    - Verified Fact: ${diagVehRes.verifiedFacts[1]}`);
    console.log(`    - Working Hypothesis: ${diagVehRes.workingHypotheses[0]}`);
    console.log(`    - Recommended Safe Action: ${diagVehRes.recommendedSafeAction}\n`);
  } else {
    console.error("  FAIL: Diagnose vehicle blocker failed:", diagVehRes);
    allPassed = false;
  }

  // --------------------------------------------------------------------------
  // SECTION B: DESIGN TRACKING TOOLS
  // --------------------------------------------------------------------------
  console.log("--- [B] DESIGN TRACKING CAPABILITIES ---");

  // B1. Explain Design Concept
  console.log("[TEST B1] Testing Explain Design Concept...");
  const gfcExp = await explainDesignTool.execute({ concept: "GFC" });
  if (gfcExp.found && gfcExp.rules.length > 0) {
    console.log(`  PASS: Found definition for 'GFC' citing '${gfcExp.sourceDocument}'.`);
  } else {
    console.error("  FAIL: Expected definition for GFC, got:", gfcExp);
    allPassed = false;
  }

  const fakeDesignExp = await explainDesignTool.execute({ concept: "SubOrbitalCantilever" });
  if (!fakeDesignExp.found && fakeDesignExp.safeGuidance) {
    console.log("  PASS: Fake design concept returned safe abstention without hallucination.\n");
  } else {
    console.error("  FAIL: Expected abstention for fake concept, got:", fakeDesignExp);
    allPassed = false;
  }

  // B2. Guide Design Workflow
  console.log("[TEST B2] Testing Guide Design Workflow...");
  const transmittalGuide = await guideDesignWorkflowTool.execute({ action: "CREATE_TRANSMITTAL" });
  if (transmittalGuide.steps.length > 0 && transmittalGuide.requiredFields.includes("Purpose of Issue")) {
    console.log(`  PASS: Guide for Transmittal Creation returned ${transmittalGuide.steps.length} steps and verified fields.\n`);
  } else {
    console.error("  FAIL: Transmittal guidance missing steps or required fields:", transmittalGuide);
    allPassed = false;
  }

  // B3. Retrieve Design Project Details
  console.log("[TEST B3] Testing Retrieve Design Project Details...");
  const unauthDesignRes = await getDesignProjectDetailsTool.execute({ projectId: "PRJ-999" }, unauthCtx);
  if (unauthDesignRes.error === "ACCESS_DENIED") {
    console.log("  PASS: Unauthorized user design query strictly blocked with 'ACCESS_DENIED'.");
  } else {
    console.error("  FAIL: Unauthorized query was not blocked!", unauthDesignRes);
    allPassed = false;
  }

  const designAuthCtx = {
    userId: DESIGN_COORDINATOR_USER,
    userEmail: "coordinator@chandakgroup.com",
    moduleCode: "DESIGN_TRACKING"
  };

  const notFoundDesign = await getDesignProjectDetailsTool.execute({ projectId: "NON-EXISTENT-PROJECT" }, designAuthCtx);
  if (notFoundDesign.error === "NOT_FOUND") {
    console.log("  PASS: Non-existent design project returned safe abstention.\n");
  } else {
    console.error("  FAIL: Expected NOT_FOUND, got:", notFoundDesign);
    allPassed = false;
  }

  // B4. Diagnose Design Blocker
  console.log("[TEST B4] Testing Diagnose Design Action Blocker...");
  // Coordinator trying to approve GFC (can_drawings_approve_gfc: false)
  const diagDesignRes = await diagnoseDesignBlockerTool.execute(
    { projectId: "PRJ-01", attemptedAction: "APPROVE_GFC" },
    designAuthCtx
  );

  if (diagDesignRes.isBlocked && diagDesignRes.blockerType === "PERMISSION_DENIED" && diagDesignRes.verifiedFacts.length > 0 && diagDesignRes.workingHypotheses.length > 0) {
    console.log("  PASS: Design blocker diagnosed with explicit separation:");
    console.log(`    - Verified Fact: ${diagDesignRes.verifiedFacts[1]}`);
    console.log(`    - Working Hypothesis: ${diagDesignRes.workingHypotheses[0]}`);
    console.log(`    - Recommended Safe Action: ${diagDesignRes.recommendedSafeAction}\n`);
  } else {
    console.error("  FAIL: Diagnose design blocker failed:", diagDesignRes);
    allPassed = false;
  }

  console.log("=================================================================");
  console.log(allPassed ? "PHASE 3 CROSS-MODULE STATUS: ALL CHECKS PASSED (PASS)" : "PHASE 3 CROSS-MODULE STATUS: CHECKS FAILED (FAIL)");
  console.log("=================================================================\n");

  process.exit(allPassed ? 0 : 1);
}

runPhase3Tests();
