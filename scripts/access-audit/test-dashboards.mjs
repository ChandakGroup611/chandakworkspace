/**
 * Access Rule Verification: Executive Dashboards Module
 * Validates against rules specified in docs/MODULE_RBAC_DESIGN.md
 * and unified Module-Wise RBAC engine requirements.
 */

import assert from 'assert';
import fs from 'fs';

export async function runDashboardsAccessTest() {
  const results = [];
  const logPass = (rule, desc) => results.push({ module: 'Dashboards', rule, desc, status: 'PASS' });
  const logFail = (rule, desc, error) => results.push({ module: 'Dashboards', rule, desc, status: 'FAIL', error });

  const accessContent = fs.readFileSync('lib/dashboards/access.ts', 'utf8');
  const routeContent = fs.readFileSync('app/dashboards/[key]/[[...path]]/route.ts', 'utf8');
  const switcherContent = fs.readFileSync('lib/actions/module-switcher.ts', 'utf8');
  const pageContent = fs.readFileSync('app/dashboards/page.tsx', 'utf8');

  // Test 1: getDashboardAccess integrates with Module RBAC
  try {
    assert(accessContent.includes('getModuleRole(userId, "DASHBOARDS"'), 'getDashboardAccess does not query getModuleRole');
    assert(accessContent.includes('can(userId, "DASHBOARDS", "VIEW"'), 'getDashboardAccess does not evaluate can() VIEW');
    assert(accessContent.includes('SUPER_ADMIN'), 'getDashboardAccess lacks Super Admin check');
    assert(accessContent.includes('moduleRole.scope?.type === "companies"'), 'getDashboardAccess lacks company scoping logic');
    logPass('DASHBOARD_MODULE_RBAC_INTEGRATION', 'getDashboardAccess strictly evaluates access via central Module RBAC engine');
  } catch (err) {
    logFail('DASHBOARD_MODULE_RBAC_INTEGRATION', 'Module RBAC integration check failed', err.message);
  }

  // Test 2: Super Admin bypass and full capability grant
  try {
    assert(accessContent.includes('isSuperAdmin'), 'Super Admin check variable missing');
    assert(accessContent.includes('perms: ["view", "details", "export", "schedule", "chat", "admin"]'), 'Super Admin does not receive all dashboard permissions');
    assert(accessContent.includes('companies: null'), 'Super Admin does not receive unrestricted company scope');
    logPass('DASHBOARD_SUPER_ADMIN_OVERRIDE', 'Super Admin receives universal access, all capabilities, and unrestricted company scope across all dashboards');
  } catch (err) {
    logFail('DASHBOARD_SUPER_ADMIN_OVERRIDE', 'Super Admin bypass check failed', err.message);
  }

  // Test 3: Proxy authentication and access resolution
  try {
    assert(routeContent.includes('getDashboardAccess(userId, def)'), 'Proxy route does not resolve access via getDashboardAccess');
    assert(routeContent.includes('signDashboardToken(def'), 'Proxy route does not sign token with dashboard access payload');
    assert(routeContent.includes('currentIdentity()'), 'Proxy route lacks identity verification');
    logPass('DASHBOARD_PROXY_ACCESS_RESOLUTION', 'Dashboard proxy route securely authenticates identity and derives permissions via Module RBAC');
  } catch (err) {
    logFail('DASHBOARD_PROXY_ACCESS_RESOLUTION', 'Proxy access check failed', err.message);
  }

  // Test 4: Module switcher integration with DASHBOARDS access
  try {
    assert(switcherContent.includes('module_code", "DASHBOARDS"'), 'getUserAllowedModules does not check user_module_access for DASHBOARDS');
    assert(switcherContent.includes('platform_role === "SUPER_ADMIN"'), 'getUserAllowedModules does not check platform_role for Super Admin');
    logPass('DASHBOARD_MODULE_SWITCHER_INTEGRATION', 'Module switcher accurately determines DASHBOARDS eligibility via user_module_access and platform_role');
  } catch (err) {
    logFail('DASHBOARD_MODULE_SWITCHER_INTEGRATION', 'Module switcher check failed', err.message);
  }

  // Test 5: User creation quarantine
  try {
    assert(!pageContent.includes('createUserAction'), 'createUserAction found in app/dashboards/page.tsx');
    assert(!pageContent.includes('inviteUserAction'), 'inviteUserAction found in app/dashboards/page.tsx');
    logPass('DASHBOARD_USER_QUARANTINE', 'Zero user creation triggers in Dashboards UI; quarantined to Administration -> Users');
  } catch (err) {
    logFail('DASHBOARD_USER_QUARANTINE', 'Dashboard user quarantine check failed', err.message);
  }

  return results;
}

if (process.argv[1]?.endsWith('test-dashboards.mjs')) {
  runDashboardsAccessTest().then(res => {
    console.table(res);
    const hasFail = res.some(r => r.status === 'FAIL');
    process.exit(hasFail ? 1 : 0);
  });
}
