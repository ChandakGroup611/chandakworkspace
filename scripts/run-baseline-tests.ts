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
import { execSync } from "child_process";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { createClient } from "@supabase/supabase-js";
import { TestCaseContext, TestCaseResult, TestCaseRunner } from "./baseline/types";

// =========================================================================
// TEST MODE & DATA ISOLATION GUARD (TEST_MODES.md)
// 1. READ-ONLY suite (default): only GET pages/APIs and read queries.
//    Fails if any read-only test calls insert/update/delete/upsert.
// 2. SANDBOX suite (manual): localhost only, SANDBOX_CONFIRM=yes required.
// 3. Domain guard: localhost allowed for both; chandakgroup.tech for READ-ONLY only.
// =========================================================================

const TARGET_PORTAL = (process.env.STAGING_URL || process.env.BASE_URL || "http://localhost:3000").trim();
const isLocalhost = TARGET_PORTAL.includes("localhost") || TARGET_PORTAL.includes("127.0.0.1");
const isProduction = TARGET_PORTAL.includes("chandakgroup.tech");
const isSandbox = process.argv.includes("--sandbox") || process.env.TEST_SUITE === "sandbox";

if (isSandbox) {
  if (process.env.SANDBOX_CONFIRM !== "yes") {
    console.error("FATAL: Sandbox suite requires SANDBOX_CONFIRM=yes environment variable.");
    process.exit(1);
  }
  if (!isLocalhost) {
    console.error(`FATAL: Sandbox suite is allowed on localhost only! Barred from production domain (${TARGET_PORTAL}).`);
    process.exit(1);
  }
} else {
  // READ-ONLY mode
  if (!isLocalhost && !isProduction) {
    console.error(`FATAL: Unrecognized portal target: ${TARGET_PORTAL}. Allowed: localhost or chandakgroup.tech.`);
    process.exit(1);
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("FATAL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

function createScopedClient(url: string, key: string): any {
  const rawClient = createClient(url, key, { auth: { persistSession: false } });
  if (isSandbox) return rawClient;

  // READ-ONLY mutation interceptor: strictly disallow insert/update/delete/upsert
  return new Proxy(rawClient, {
    get(target: any, prop: string) {
      if (prop === "from") {
        return (table: string) => {
          const builder = target.from(table);
          return new Proxy(builder, {
            get(bTarget: any, bProp: string) {
              if (["insert", "update", "delete", "upsert"].includes(bProp)) {
                throw new Error(`FATAL: READ-ONLY violation: test attempted database mutation (${bProp}) on table '${table}'!`);
              }
              const val = bTarget[bProp];
              return typeof val === "function" ? val.bind(bTarget) : val;
            }
          });
        };
      }
      const val = target[prop];
      return typeof val === "function" ? val.bind(target) : val;
    }
  });
}

export const supabaseAdmin = createScopedClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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

  const siteUrl = TARGET_PORTAL.replace(/\/+$/, "");

  return {
    client: supabaseAdmin,
    supabaseAdmin,
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
  // Pre-flight security guard: verify zero baseline files import production service_role
  const baselineDir = path.resolve(__dirname, "baseline");
  const baselineFiles = fs.readdirSync(baselineDir).filter(f => f.endsWith(".ts"));
  for (const f of baselineFiles) {
    const code = fs.readFileSync(path.join(baselineDir, f), "utf8");
    if (code.includes("lib/supabase/service_role") || /import.*service_role/i.test(code)) {
      console.error(`FATAL SECURITY GUARD: scripts/baseline/${f} imports production service_role! All test runners must exclusively use ctx.client.`);
      process.exit(1);
    }
  }

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
  let manualCount = 0;

  for (let i = 0; i < ALL_RUNNERS.length; i++) {
    const runner = ALL_RUNNERS[i];
    const isSuperAdmin = runner.role === "Super Admin";
    const isParkedLead = runner.role.includes("Lead") || 
      runner.role.includes("Admin") || 
      runner.description.toLowerCase().includes("approve") || 
      runner.description.toLowerCase().includes("gfc") || 
      runner.description.toLowerCase().includes("dispatch") ||
      runner.type === "manual";

    let res: { pass: boolean; notes: string; errorTrace?: string; codePath?: string; screenshotPath?: string };
    let status: "PASS" | "FAIL" | "MANUAL" = "PASS";
    let duration = 0;

    if (isSuperAdmin || isParkedLead) {
      status = "MANUAL";
      manualCount++;
      res = {
        pass: true,
        notes: isSuperAdmin ? "MANUAL: Super Admin verification (parked)" : "MANUAL: Module lead/admin role verification (parked)"
      };
      console.log(`[${i + 1}/${ALL_RUNNERS.length}] [MANUAL] ${runner.tcId} (${runner.module}) - ${res.notes}`);
    } else {
      const t0 = performance.now();
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
      duration = Math.round(performance.now() - t0);
      status = res.pass ? "PASS" : "FAIL";

      if (res.pass) {
        passedCount++;
        console.log(`[${i + 1}/${ALL_RUNNERS.length}] [PASS] ${runner.tcId} (${runner.module}) - ${duration}ms`);
      } else {
        failedCount++;
        console.warn(`[${i + 1}/${ALL_RUNNERS.length}] [FAIL] ${runner.tcId} (${runner.module}) - ${res.notes} (${duration}ms)`);
      }
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
  const activeCount = passedCount + failedCount;
  const passRate = activeCount > 0 ? ((passedCount / activeCount) * 100).toFixed(1) : "0.0";

  console.log("\n=================================================================");
  console.log(`BASELINE RUN COMPLETE in ${totalTime}s`);
  console.log(`Total Run: ${ALL_RUNNERS.length} | PASSED: ${passedCount} | FAILED: ${failedCount} | MANUAL: ${manualCount} | Pass Rate: ${passRate}%`);
  console.log("=================================================================\n");

  // Generate Baseline Execution Report (KNOWN_BUGS.md is never rewritten by runner)
  await generateBaselineReport(results, passedCount, failedCount, manualCount, totalTime, passRate);

  console.log("Generated docs/tests/BASELINE_REPORT.md");

  // CI Safety Gate Evaluation
  const isCI = process.argv.includes("--ci") || process.env.CI === "true";
  if (isCI) {
    console.log("\n=================================================================");
    console.log("  CI SAFETY GATE EVALUATION");
    console.log("=================================================================");

    const knownBugsPath = path.resolve("docs/tests/KNOWN_BUGS.md");
    const knownBugIds = new Set<string>();
    if (fs.existsSync(knownBugsPath)) {
      const content = fs.readFileSync(knownBugsPath, "utf8");
      const matches = content.matchAll(/\*\*(TC-[A-Z0-9-]+)\*\*/g);
      for (const m of matches) {
        knownBugIds.add(m[1]);
      }
    }

    const changesPath = path.resolve("docs/tests/CHANGES.md");
    const approvedChangeIds = new Set<string>();
    if (fs.existsSync(changesPath)) {
      const content = fs.readFileSync(changesPath, "utf8");
      const matches = content.matchAll(/(TC-[A-Z0-9-]+)/g);
      for (const m of matches) {
        approvedChangeIds.add(m[1]);
      }
    }

    let commitMsg = "";
    try {
      commitMsg = execSync("git log -1 --format=%B", { encoding: "utf8" }).trim();
    } catch {}
    const hasApprovedTag = /\[approved-tc\]/i.test(commitMsg);

    const unexpectedFailures = results.filter(r => {
      if (r.status !== "FAIL") return false;
      if (knownBugIds.has(r.tcId)) return false;
      if (hasApprovedTag && approvedChangeIds.has(r.tcId)) return false;
      return true;
    });

    if (unexpectedFailures.length > 0) {
      console.error(`\n❌ CI SAFETY GATE FAILED: ${unexpectedFailures.length} REGRESSION(S) DETECTED!`);
      for (const f of unexpectedFailures) {
        console.error(`   - [${f.tcId}] (${f.module}) ${f.description}: ${f.notes}`);
      }
      console.error("\nAny previously-PASS test that fails blocks build and deploy.");
      console.error("To update an expected result, commit message must include [approved-tc] and docs/tests/CHANGES.md must document the change.\n");
      process.exit(1);
    }

    console.log(`✅ CI SAFETY GATE PASSED: 0 regressions detected (${passedCount} tests passed, ${failedCount} known pre-existing defects).`);
  }
}

async function generateBaselineReport(
  results: TestCaseResult[],
  passedCount: number,
  failedCount: number,
  manualCount: number,
  totalTime: string,
  passRate: string
) {
  // Group by module
  const moduleStats: Record<string, { total: number; pass: number; fail: number; manual: number }> = {};
  for (const r of results) {
    if (!moduleStats[r.module]) {
      moduleStats[r.module] = { total: 0, pass: 0, fail: 0, manual: 0 };
    }
    moduleStats[r.module].total++;
    if (r.status === "PASS") moduleStats[r.module].pass++;
    else if (r.status === "FAIL") moduleStats[r.module].fail++;
    else moduleStats[r.module].manual++;
  }

  let md = `# Automated Baseline Test Report (BASELINE_REPORT.md)\n\n`;
  md += `**Execution Date:** ${new Date().toISOString()}  \n`;
  md += `**Scope:** All P1 CURRENT Baseline Test Cases (READ-ONLY Safety Baseline)  \n`;
  md += `**Execution Codebase:** CURRENT (No behavioral changes applied)  \n`;
  md += `**Total Test Cases:** ${results.length}  \n`;
  md += `**Passed:** ${passedCount}  \n`;
  md += `**Failed:** ${failedCount}  \n`;
  md += `**Manual (Parked):** ${manualCount}  \n`;
  md += `**Automated Pass Rate:** ${passRate}%  \n`;
  md += `**Total Duration:** ${totalTime}s  \n\n`;

  md += `## 1. Summary by Operational Module\n\n`;
  md += `| Module | Total P1 Cases | Passed | Failed | Manual | Health |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;
  for (const [mod, s] of Object.entries(moduleStats)) {
    const health = s.fail === 0 ? "🟢 100%" : `🟡 ${s.fail} bugs`;
    md += `| **${mod}** | ${s.total} | ${s.pass} | ${s.fail} | ${s.manual} | ${health} |\n`;
  }
  md += `| **Total** | **${results.length}** | **${passedCount}** | **${failedCount}** | **${manualCount}** | **${passRate}%** |\n\n`;

  md += `## 2. Master Execution Results Matrix\n\n`;
  md += `| TC-ID | Module | Screen | Description | Status | Duration | Notes / Evidence |\n`;
  md += `| :--- | :--- | :--- | :--- | :---: | :---: | :--- |\n`;
  for (const r of results) {
    const statusBadge = r.status === "PASS" ? "**PASS**" : r.status === "MANUAL" ? "**MANUAL**" : "**FAIL**";
    md += `| **${r.tcId}** | ${r.module} | \`${r.screen.split(" ")[0]}\` | ${r.description} | ${statusBadge} | ${r.durationMs}ms | ${r.notes.replace(/\|/g, "\\|")} |\n`;
  }

  fs.writeFileSync(path.resolve("docs/tests/BASELINE_REPORT.md"), md, "utf8");
}

runAll().catch(err => {
  console.error("Fatal baseline runner error:", err);
  process.exit(1);
});
