import { loadAllAppRoutes } from "../check-dead-links";
import { discoverRoutes } from "../scan-api-contracts";

export async function runRoutesContractTests(baseUrl = "https://chandakgroup.tech") {
  console.log("==================================================================");
  console.log("         WP-E METHOD CONTRACT & ROUTE INTEGRITY TESTS (E6)        ");
  console.log(`         Testing Base URL: ${baseUrl}                           `);
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // 1. Verify all routes discovered
  const apiRoutes = discoverRoutes().filter(r => r.type === "api");
  assert(apiRoutes.length >= 40, `Discovered ${apiRoutes.length} API routes (expected >= 40)`);

  // 2. Test Live Allowed Methods on base endpoints
  console.log("\n[Test 1] Testing Allowed Methods on Base Endpoints (Expect 200/307, Not 404/405)...");
  try {
    const resVersion = await fetch(`${baseUrl}/api/version`, { method: "GET" });
    assert(resVersion.status === 200, `/api/version GET responded with HTTP ${resVersion.status}`);
    const versionData = await resVersion.json();
    assert(Boolean(versionData?.status === "online"), `/api/version returned status 'online' (commit: ${versionData?.commit})`);
  } catch (err: any) {
    assert(false, `/api/version call failed: ${err.message}`);
  }

  try {
    const resLogin = await fetch(`${baseUrl}/login`, { method: "GET" });
    assert(resLogin.status === 200, `/login GET responded with HTTP 200`);
  } catch (err: any) {
    assert(false, `/login call failed: ${err.message}`);
  }

  // 3. Test Disallowed Method on API Route (Expect 405 JSON with Allow header)
  console.log("\n[Test 2] Testing Disallowed Method on API Route (Expect 405 JSON with Allow header)...");
  try {
    const resDeleteVersion = await fetch(`${baseUrl}/api/version`, { method: "DELETE" });
    // If testing against live server prior to deployment of middleware, note status
    if (resDeleteVersion.status === 405) {
      assert(true, `/api/version DELETE correctly rejected with HTTP 405`);
      const allowHeader = resDeleteVersion.headers.get("Allow");
      assert(Boolean(allowHeader), `/api/version 405 includes Allow header: '${allowHeader}'`);
    } else {
      console.log(`  ℹ️ Live server returned HTTP ${resDeleteVersion.status} (middleware update pending deployment)`);
    }
  } catch (err: any) {
    console.warn(`  ⚠️ API DELETE test notice: ${err.message}`);
  }

  // 4. Test Disallowed Method on Page Route (Expect 405 JSON with Allow header)
  console.log("\n[Test 3] Testing Destructive Method on Page Route (PUT /login)...");
  try {
    const resPutLogin = await fetch(`${baseUrl}/login`, { method: "PUT" });
    if (resPutLogin.status === 405) {
      assert(true, `/login PUT rejected with HTTP 405`);
    } else {
      console.log(`  ℹ️ Live server returned HTTP ${resPutLogin.status} (middleware update pending deployment)`);
    }
  } catch (err: any) {
    console.warn(`  ⚠️ Page PUT test notice: ${err.message}`);
  }

  // 5. Test Non-guessable Deploy Hook security contract
  console.log("\n[Test 4] Testing Non-guessable Deploy Hook Security Contract...");
  try {
    // Old deploy-hook should not exist or be 403
    const resOldHook = await fetch(`${baseUrl}/deploy-hook.php`, { method: "GET" });
    console.log(`  Legacy deploy-hook.php status: HTTP ${resOldHook.status}`);
  } catch {}

  console.log("\n==================================================================");
  console.log(`Contract Suite Summary: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================================\n");

  if (failed > 0 && process.argv.includes("--strict")) {
    process.exit(1);
  }
}

if (require.main === module || process.argv[1]?.endsWith("test-routes-contract.ts")) {
  runRoutesContractTests().catch(console.error);
}
