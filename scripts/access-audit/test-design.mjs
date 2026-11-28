/**
 * Access Rule Verification: Design Tracking (DMS) Module
 * Validates against rules specified in docs/ACCESS_RULES.md (Section 7)
 * and unified Module-Wise RBAC engine requirements.
 */

import assert from 'assert';
import fs from 'fs';

export async function runDesignAccessTest() {
  const results = [];
  const logPass = (rule, desc) => results.push({ module: 'Design Tracking', rule, desc, status: 'PASS' });
  const logFail = (rule, desc, error) => results.push({ module: 'Design Tracking', rule, desc, status: 'FAIL', error });

  const designContent = fs.readFileSync('lib/actions/designTracking.ts', 'utf8');
  // requireDesign lives in a shared guard used by every Design Tracking, DMAC and DMS action file.
  const guardContent = fs.readFileSync('lib/permissions/design-guard.ts', 'utf8');

  // Test 1: requireDesign central authority and zero permissive fallbacks
  try {
    for (const f of ['lib/actions/designTracking.ts', 'lib/actions/design.ts', 'lib/actions/dms-core.ts', 'lib/actions/dmac-drawings.ts']) {
      assert(fs.readFileSync(f, 'utf8').includes('from "@/lib/permissions/design-guard"'), `${f} does not use the shared requireDesign guard`);
    }
    const fnMatch = guardContent.match(/async function requireDesign\([\s\S]*?^}/m);
    assert(fnMatch, 'requireDesign function not found');
    const fnCode = fnMatch[0];
    assert(fnCode.includes('can(user.id, "DESIGN_TRACKING"'), 'requireDesign does not call module-access can()');
    assert(fnCode.includes('SUPER_ADMIN'), 'requireDesign missing SUPER_ADMIN override check');
    assert(fnCode.includes('throw new Error'), 'requireDesign does not throw on unauthorized access');
    logPass('DESIGN_REQUIRE_DESIGN_STRICT', 'requireDesign strictly enforces module-wise permissions via central authority');
  } catch (err) {
    logFail('DESIGN_REQUIRE_DESIGN_STRICT', 'requireDesign check failed', err.message);
  }

  // Test 2: Project-scoping enforcement in requireDesign
  try {
    const fnMatch = guardContent.match(/async function requireDesign\([\s\S]*?^}/m);
    const fnCode = fnMatch ? fnMatch[0] : '';
    assert(/project_id:\s*(id|pid)\b/.test(fnCode), 'requireDesign does not pass project_id to can() scoping');
    assert(fnCode.includes('.every(Boolean)'), 'requireDesign does not require all target project IDs to be in scope');
    logPass('DESIGN_PROJECT_SCOPING_GATED', 'requireDesign strictly validates project scope at the record level');
  } catch (err) {
    logFail('DESIGN_PROJECT_SCOPING_GATED', 'Project scoping check failed', err.message);
  }

  // Test 3: Mutations gated by requireDesign with specific capabilities
  try {
    const mutations = [
      { fn: 'saveProjectAction', cap: 'masters' },
      { fn: 'saveDrawingAction', cap: 'drawings' },
      { fn: 'saveMatrixEntryAction', cap: 'matrix' },
      { fn: 'saveTransmittalAction', cap: 'transmittals' },
      { fn: 'saveRfiAction', cap: 'rfis' },
      { fn: 'saveDesignUserAccessAction', cap: 'admin' },
      { fn: 'deleteDesignUserAccessAction', cap: 'admin' }
    ];

    for (const m of mutations) {
      const idx = designContent.indexOf(`export async function ${m.fn}`);
      assert(idx !== -1, `Mutation ${m.fn} not found`);
      const body = designContent.slice(idx, idx + 900);
      assert(body.includes(`requireDesign("${m.cap}"`), `${m.fn} missing requireDesign("${m.cap}") gate`);
    }
    logPass('DESIGN_MUTATIONS_GATED', 'All design tracking mutations strictly enforce requireDesign with mapped capabilities');
  } catch (err) {
    logFail('DESIGN_MUTATIONS_GATED', 'Mutation gating check failed', err.message);
  }

  // Test 4: Synchronization to user_module_access
  try {
    assert(designContent.includes('from("user_module_access")'), 'user_module_access queries missing');
    assert(designContent.includes('invalidateModuleAccessCache(payload.userId)'), 'saveDesignUserAccessAction missing cache invalidation');
    assert(designContent.includes('invalidateModuleAccessCache(userId)'), 'deleteDesignUserAccessAction missing cache invalidation');
    logPass('DESIGN_MODULE_ACCESS_SYNC', 'Design role and access mutations synchronize to user_module_access and invalidate cache');
  } catch (err) {
    logFail('DESIGN_MODULE_ACCESS_SYNC', 'Synchronization check failed', err.message);
  }

  // Test 5: Copilot design tools check module access
  try {
    const copilotContent = fs.readFileSync('lib/copilot/tools/design-tools.ts', 'utf8');
    assert(copilotContent.includes('can(userId, "DESIGN_TRACKING", "DESIGN_PROJECTS_VIEW")'), 'Copilot design tools missing module-access check');
    logPass('DESIGN_COPILOT_TOOLS_GATED', 'AI Copilot design tools strictly gated by module-wise RBAC');
  } catch (err) {
    logFail('DESIGN_COPILOT_TOOLS_GATED', 'Copilot gating check failed', err.message);
  }

  return results;
}

if (process.argv[1]?.endsWith('test-design.mjs')) {
  runDesignAccessTest().then(results => {
    console.table(results);
    const hasFail = results.some(r => r.status === 'FAIL');
    if (hasFail) process.exit(1);
  });
}
