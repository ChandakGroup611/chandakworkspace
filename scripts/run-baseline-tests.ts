/**
 * CHANDAK WORKSPACE — P1 CURRENT BASELINE TEST SUITE (Phase 2)
 * 
 * Target: UAT / Test Verification Environment (Current Code with No Changes)
 * Total Automated Cases: 149 (all P1 CURRENT test cases from TEST_CASES.md)
 * 
 * Generates:
 *  - docs/tests/BASELINE_REPORT.md
 *  - docs/tests/KNOWN_BUGS.md
 * 
 * Usage: npm run test:baseline (or npx tsx scripts/run-baseline-tests.ts)
 */

import fs from "fs";
import path from "path";
import { supabaseAdmin } from "../lib/supabase/service_role";
import { TestCaseContext, TestCaseResult, TestCaseRunner } from "./baseline/types";

import { taskRunners } from "./baseline/tasks";
import { ticketRunners } from "./baseline/tickets";
import { requirementRunners } from "./baseline/requirements";
import { designRunners } from "./baseline/design";
import { dmsRunners } from "./baseline/dms";
import { vehicleRunners } from "./baseline/vehicle";
import { meetRunners } from "./baseline/meet";
import { budgetRunners } from "./baseline/budget";
import { amcRunners } from "./baseline/amc";
import { dashboardRunners } from "./baseline/dashboards";
import { userRunners } from "./baseline/users";
import { iamRunners } from "./baseline/iam";
import { mailRunners } from "./baseline/mail";
import { masterRunners } from "./baseline/masters";
import { authRunners } from "./baseline/auth";
import { crossRunners } from "./baseline/cross";
import { regressionRunners } from "./baseline/regression";

const ALL_RUNNERS: TestCaseRunner[] = [
  ...taskRunners,
  ...ticketRunners,
  ...requirementRunners,
  ...designRunners,
  ...dmsRunners,
  ...vehicleRunners,
  ...meetRunners,
  ...budgetRunners,
  ...amcRunners,
  ...dashboardRunners,
  ...userRunners,
  ...iamRunners,
  ...mailRunners,
  ...masterRunners,
  ...authRunners,
  ...crossRunners,
  ...regressionRunners
];

async function initializeContext(): Promise<TestCaseContext> {
  console.log("Resolving UAT test users and test entities from database...");

  // 1. Fetch test users
  const { data: users, error: uErr } = await supabaseAdmin
    .from("user_master")
    .select("id, email")
    .ilike("email", "%@chandakgroup.tech");

  if (uErr) {
    throw new Error(`Failed to query user_master: ${uErr.message}`);
  }

  const userMap: Record<string, string> = {};
  for (const u of users || []) {
    userMap[u.email.toLowerCase()] = u.id;
  }

  // 2. Fetch fixed test entities
  const [wsRes, taskRes, subRes, tckRes, reqRes] = await Promise.all([
    supabaseAdmin.from("workspaces").select("id").eq("workspace_code", "WS-TEST-ALPHA").maybeSingle(),
    supabaseAdmin.from("tasks").select("id").eq("task_code", "TSK-TEST-ALPHA").maybeSingle(),
    supabaseAdmin.from("tasks").select("id").eq("task_code", "SUB-TEST-ALPHA").maybeSingle(),
    supabaseAdmin.from("tickets").select("id").eq("code", "TCK-TEST-ALPHA").maybeSingle(),
    supabaseAdmin.from("requirements").select("id").eq("code", "REQ-TEST-ALPHA").maybeSingle()
  ]);

  const siteUrl = (process.env.STAGING_URL || process.env.BASE_URL || "https://chandakgroup.tech").replace(/\/+$/, "");

  return {
    users: userMap,
    fixedEntities: {
      workspaceId: wsRes.data?.id || "",
      taskId: taskRes.data?.id || "",
      subtaskId: subRes.data?.id || "",
      ticketId: tckRes.data?.id || "",
      reqId: reqRes.data?.id || ""
    },
    siteUrl
  };
}

async function runAll() {
  const startTime = Date.now();
  console.log("=================================================================");
  console.log("  CHANDAK WORKSPACE — P1 CURRENT BASELINE AUTOMATION RUNNER");
  console.log("=================================================================");
  console.log(`Total P1 CURRENT test cases to execute: ${ALL_RUNNERS.length}`);

  const ctx = await initializeContext();
  console.log(`Resolved ${Object.keys(ctx.users).length} test users in context.`);
  console.log(`Target Portal URL: ${ctx.siteUrl}\n`);

  const results: TestCaseResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < ALL_RUNNERS.length; i++) {
    const runner = ALL_RUNNERS[i];
    const t0 = performance.now();
    let res: { pass: boolean; notes: string; errorTrace?: string; codePath?: string; screenshotPath?: string };

    try {
      res = await runner.run(ctx);
    } catch (err: any) {
      res = {
        pass: false,
        notes: `Unhandled execution exception: ${err.message}`,
        errorTrace: err.stack || err.message,
        codePath: "unknown"
      };
    }

    const duration = Math.round(performance.now() - t0);
    const status: "PASS" | "FAIL" = res.pass ? "PASS" : "FAIL";

    if (res.pass) {
      passedCount++;
      console.log(`[${i + 1}/${ALL_RUNNERS.length}] [PASS] ${runner.tcId} (${runner.module}) - ${duration}ms`);
    } else {
      failedCount++;
      console.warn(`[${i + 1}/${ALL_RUNNERS.length}] [FAIL] ${runner.tcId} (${runner.module}) - ${res.notes} (${duration}ms)`);
    }

    results.push({
      tcId: runner.tcId,
      module: runner.module,
      screen: runner.screen,
      description: runner.description,
      role: runner.role,
      type: runner.type,
      status,
      durationMs: duration,
      notes: res.notes,
      errorTrace: res.errorTrace,
      codePath: res.codePath,
      screenshotPath: res.screenshotPath
    });
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const passRate = ((passedCount / ALL_RUNNERS.length) * 100).toFixed(1);

  console.log("\n=================================================================");
  console.log(`BASELINE RUN COMPLETE in ${totalTime}s`);
  console.log(`Total Run: ${ALL_RUNNERS.length} | PASSED: ${passedCount} | FAILED: ${failedCount} | Pass Rate: ${passRate}%`);
  console.log("=================================================================\n");

  // Generate Reports
  await generateBaselineReport(results, passedCount, failedCount, totalTime, passRate);
  await generateKnownBugsReport(results);

  console.log("Generated docs/tests/BASELINE_REPORT.md");
  console.log("Generated docs/tests/KNOWN_BUGS.md");
}

async function generateBaselineReport(
  results: TestCaseResult[],
  passedCount: number,
  failedCount: number,
  totalTime: string,
  passRate: string
) {
  // Group by module
  const moduleStats: Record<string, { total: number; pass: number; fail: number }> = {};
  for (const r of results) {
    if (!moduleStats[r.module]) {
      moduleStats[r.module] = { total: 0, pass: 0, fail: 0 };
    }
    moduleStats[r.module].total++;
    if (r.status === "PASS") moduleStats[r.module].pass++;
    else moduleStats[r.module].fail++;
  }

  let md = `# Automated Baseline Test Report (BASELINE_REPORT.md)\n\n`;
  md += `**Execution Date:** ${new Date().toISOString()}  \n`;
  md += `**Scope:** All P1 CURRENT Baseline Test Cases (Phase 2 Safety Baseline)  \n`;
  md += `**Execution Codebase:** CURRENT (No behavioral changes applied)  \n`;
  md += `**Total Test Cases Executed:** ${results.length}  \n`;
  md += `**Passed:** ${passedCount}  \n`;
  md += `**Failed:** ${failedCount}  \n`;
  md += `**Baseline Pass Rate:** ${passRate}%  \n`;
  md += `**Total Execution Duration:** ${totalTime}s  \n\n`;

  md += `## 1. Summary by Operational Module\n\n`;
  md += `| Module | Total P1 Cases | Passed | Failed | Health |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: |\n`;
  for (const [mod, s] of Object.entries(moduleStats)) {
    const health = s.fail === 0 ? "🟢 100%" : `🟡 ${((s.pass / s.total) * 100).toFixed(0)}% (${s.fail} bugs)`;
    md += `| **${mod}** | ${s.total} | ${s.pass} | ${s.fail} | ${health} |\n`;
  }
  md += `| **Total** | **${results.length}** | **${passedCount}** | **${failedCount}** | **${passRate}%** |\n\n`;

  md += `## 2. Master Execution Results Matrix\n\n`;
  md += `| TC-ID | Module | Screen | Description | Status | Duration | Notes / Evidence |\n`;
  md += `| :--- | :--- | :--- | :--- | :---: | :---: | :--- |\n`;
  for (const r of results) {
    const statusBadge = r.status === "PASS" ? "**PASS**" : "**FAIL**";
    md += `| **${r.tcId}** | ${r.module} | \`${r.screen.split(" ")[0]}\` | ${r.description} | ${statusBadge} | ${r.durationMs}ms | ${r.notes.replace(/\|/g, "\\|")} |\n`;
  }

  fs.writeFileSync(path.resolve("docs/tests/BASELINE_REPORT.md"), md, "utf8");
}

async function generateKnownBugsReport(results: TestCaseResult[]) {
  const failed = results.filter(r => r.status === "FAIL");

  let md = `# Known Bugs Registry (KNOWN_BUGS.md)\n\n`;
  md += `**Discovered During:** Phase 2 Baseline Execution against CURRENT code  \n`;
  md += `**Governing Rule:** "Run on CURRENT code with no changes. Send totals. Every FAIL -> docs/tests/KNOWN_BUGS.md (do not fix yet)."  \n`;
  md += `**Total Bugs Cataloged:** ${failed.length}  \n`;
  md += `**Resolution Phase:** Phase 6 (Data + Enforcement Migration)  \n\n`;

  md += `## Summary of Baseline Defects on Current Code\n\n`;
  md += `| # | Bug ID / TC-ID | Module | Severity | Affected Code Path | Summary Defect |\n`;
  md += `| :---: | :--- | :--- | :---: | :--- | :--- |\n`;

  failed.forEach((f, idx) => {
    md += `| ${idx + 1} | **${f.tcId}** | ${f.module} | **P1** | \`${f.codePath || "N/A"}\` | ${f.notes.replace(/\|/g, "\\|")} |\n`;
  });

  md += `\n---\n\n`;
  md += `## Detailed Bug Profiles\n\n`;

  failed.forEach((f, idx) => {
    md += `### Bug ${idx + 1}: ${f.tcId} — ${f.description}\n\n`;
    md += `- **Module:** ${f.module}\n`;
    md += `- **Screen:** \`${f.screen}\`\n`;
    md += `- **Role Scoping:** ${f.role}\n`;
    md += `- **Severity:** P1 (Critical Access / Data Integrity Defect)\n`;
    md += `- **Affected Code Path:** \`${f.codePath || "See error trace"}\`\n`;
    md += `- **Defect Summary:** ${f.notes}\n`;
    if (f.errorTrace) {
      md += `- **Exact Error Trace:**\n\`\`\`text\n${f.errorTrace}\n\`\`\`\n`;
    }
    md += `- **Target Fix:** Scheduled for Phase 6 authorization and session derivation refactoring.\n\n`;
  });

  fs.writeFileSync(path.resolve("docs/tests/KNOWN_BUGS.md"), md, "utf8");
}

runAll().catch(err => {
  console.error("Fatal baseline runner error:", err);
  process.exit(1);
});
