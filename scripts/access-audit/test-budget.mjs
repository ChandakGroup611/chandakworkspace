/**
 * Access Rule Verification: Organization Budget Module
 * Validates against rules specified in docs/ACCESS_RULES.md (Section 9)
 * and unified Module-Wise RBAC engine requirements.
 */

import assert from 'assert';
import fs from 'fs';

export async function runBudgetAccessTest() {
  const results = [];
  const logPass = (rule, desc) => results.push({ module: 'Organization Budget', rule, desc, status: 'PASS' });
  const logFail = (rule, desc, error) => results.push({ module: 'Organization Budget', rule, desc, status: 'FAIL', error });

  const files = ['lib/budget/actions.ts', 'lib/budget/manual-actions.ts', 'lib/budget/wizard-actions.ts', 'lib/budget/data.ts'];

  // Test 1: Zero metadata role checks across all Budget controllers
  try {
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      assert(!content.includes('app_metadata?.role'), `${f} still checks app_metadata?.role`);
      assert(!content.includes('user_metadata?.role'), `${f} still checks user_metadata?.role`);
    }
    logPass('BUDGET_NO_METADATA_ROLES', 'All Budget controllers eliminated untrusted app_metadata and user_metadata role inspections');
  } catch (err) {
    logFail('BUDGET_NO_METADATA_ROLES', 'Metadata role check failed', err.message);
  }

  // Test 2: Super Admin role derived strictly from user_master and roles table
  try {
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      assert(content.includes('from("user_master")') || content.includes('from(\'user_master\')'), `${f} does not query database user_master`);
      assert(content.includes('SUPER_ADMIN'), `${f} does not verify SUPER_ADMIN code from database`);
      // user_master has no platform_role column (ea3cbe0): the admin role comes from user_master.role_id -> roles.code
      assert(content.includes('role:roles(code)'), `${f} does not read the role code from the roles table`);
      assert(!/\.select\([^)]*platform_role/.test(content), `${f} selects user_master.platform_role, which does not exist`);
    }
    logPass('BUDGET_DB_ROLE_EXTRACTION', 'Super Admin privileges in Budget derived strictly from database user_master and roles tables');
  } catch (err) {
    logFail('BUDGET_DB_ROLE_EXTRACTION', 'DB role extraction check failed', err.message);
  }

  // Test 3: Synchronization of budget members to user_module_access
  try {
    const actionsContent = fs.readFileSync('lib/budget/actions.ts', 'utf8');
    assert(actionsContent.includes('from("user_module_access")'), 'user_module_access sync missing in actions.ts');
    assert(actionsContent.includes('invalidateModuleAccessCache(m.user_id)'), 'saveMember missing cache invalidation');
    assert(actionsContent.includes('invalidateModuleAccessCache(userId)'), 'removeMember missing cache invalidation');
    logPass('BUDGET_MODULE_ACCESS_SYNC', 'saveMember and removeMember synchronize to user_module_access and invalidate cache');
  } catch (err) {
    logFail('BUDGET_MODULE_ACCESS_SYNC', 'Module access sync check failed', err.message);
  }

  // Test 4: Fallback to user_module_access in getSession and getAccess
  try {
    const dataContent = fs.readFileSync('lib/budget/data.ts', 'utf8');
    assert(dataContent.includes('from("user_module_access")'), 'user_module_access fallback missing in data.ts');
    assert(dataContent.includes('ORG_BUDGET'), 'ORG_BUDGET module code query missing in data.ts');
    logPass('BUDGET_FALLBACK_READS', 'getSession and getAccess seamlessly fall back to user_module_access');
  } catch (err) {
    logFail('BUDGET_FALLBACK_READS', 'Fallback check failed', err.message);
  }

  // Test 5: can() helper in data.ts enforces scoping
  try {
    const dataContent = fs.readFileSync('lib/budget/data.ts', 'utf8');
    const fnMatch = dataContent.match(/export function can\([\s\S]*?^}/m);
    assert(fnMatch, 'can function not found in data.ts');
    const fnCode = fnMatch[0];
    assert(fnCode.includes('me.project_ids'), 'can() does not check project_ids scope');
    assert(fnCode.includes('me.department_ids'), 'can() does not check department_ids scope');
    logPass('BUDGET_SCOPING_ENFORCED', 'can() strictly enforces project and department scoping constraints');
  } catch (err) {
    logFail('BUDGET_SCOPING_ENFORCED', 'Scoping enforcement check failed', err.message);
  }

  return results;
}

if (process.argv[1]?.endsWith('test-budget.mjs')) {
  runBudgetAccessTest().then(res => {
    console.table(res);
    const hasFail = res.some(r => r.status === 'FAIL');
    process.exit(hasFail ? 1 : 0);
  });
}
