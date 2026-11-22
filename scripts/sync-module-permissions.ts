#!/usr/bin/env node
/**
 * CLI / Deployment Runner: Module Permission Synchronization Engine
 * Governance: Master Architecture Blueprint v2.0 (Phase 5)
 *
 * Usage:
 *   npx tsx scripts/sync-module-permissions.ts [--dry-run]
 */

import { syncAllRegisteredModules } from "../lib/modules/sync-engine";

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("================================================================================");
  console.log(`MODULE PERMISSION SYNCHRONIZATION ENGINE [Mode: ${isDryRun ? "DRY-RUN (SIMULATION)" : "LIVE EXECUTION"}]`);
  console.log("================================================================================\n");

  const results = await syncAllRegisteredModules({
    dryRun: isDryRun,
    executedBy: isDryRun ? "CLI_DRY_RUN" : "CLI_DEPLOY_SYNC",
  });

  console.log("Synchronization Results:\n");
  console.log(
    "Module".padEnd(20) +
      "Status".padEnd(12) +
      "Added".padEnd(8) +
      "Updated".padEnd(10) +
      "Custom Preserved".padEnd(18) +
      "Diff Summary"
  );
  console.log("-".repeat(95));

  let hasFailures = false;

  for (const r of results) {
    if (r.status === "FAILED") hasFailures = true;

    const statusBadge =
      r.status === "SUCCESS"
        ? "✅ SUCCESS"
        : r.status === "SKIPPED"
        ? "⚪ SKIPPED"
        : r.status === "WARNING"
        ? "⚠️ WARNING"
        : "❌ FAILED";

    console.log(
      r.moduleCode.padEnd(20) +
        statusBadge.padEnd(12) +
        String(r.rolesAdded.length).padEnd(8) +
        String(r.rolesUpdated.length).padEnd(10) +
        String(r.rolesSkippedCustomized.length).padEnd(18) +
        (r.diffSummary || r.error || "—")
    );
  }

  console.log("-".repeat(95));
  console.log(`\nProcessed ${results.length} registered module(s).`);

  if (hasFailures) {
    console.error("\n❌ [Sync Engine] Synchronization completed with failures.");
    process.exitCode = 1;
  } else {
    console.log("\n✅ [Sync Engine] Synchronization completed successfully.");
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error("Fatal error during sync runner execution:", err);
  process.exit(1);
});
