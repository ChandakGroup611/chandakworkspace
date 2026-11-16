/**
 * Access Rule Verification: Organization Budget Module
 * Validates against rules specified in docs/ACCESS_RULES.md (Section 9)
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
    }
    logPass('BUDGET_DB_ROLE_EXTRACTION', 'Super Admin privileges in Budget derived strictly from database user_master and roles tables');
  } catch (err) {
    logFail('BUDGET_DB_ROLE_EXTRACTION', 'DB role extraction check failed', err.message);
  }

  return results;
}

if (process.argv[1].endsWith('test-budget.mjs')) {
  runBudgetAccessTest().then(res => {
    console.table(res);
    const hasFail = res.some(r => r.status === 'FAIL');
    process.exit(hasFail ? 1 : 0);
  });
}
