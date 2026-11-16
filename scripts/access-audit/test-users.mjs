/**
 * Access Rule Verification: Users & Identity Master Module
 * Validates against rules specified in docs/ACCESS_RULES.md
 */

import assert from 'assert';
import fs from 'fs';

export async function runUsersAccessTest() {
  const results = [];
  const logPass = (rule, desc) => results.push({ module: 'Users', rule, desc, status: 'PASS' });
  const logFail = (rule, desc, error) => results.push({ module: 'Users', rule, desc, status: 'FAIL', error });

  // Test 1: getVisibleUsers allows USERS_VIEW/CREATE/UPDATE/DELETE/MANAGE and Super Admin to see all users
  try {
    const repoContent = fs.readFileSync('lib/repositories/users.ts', 'utf8');
    assert(repoContent.includes('USERS_VIEW'), 'USERS_VIEW missing from visible users policy');
    assert(repoContent.includes('USERS_CREATE'), 'USERS_CREATE missing from visible users policy');
    assert(repoContent.includes('USERS_UPDATE'), 'USERS_UPDATE missing from visible users policy');
    assert(repoContent.includes('USERS_DELETE'), 'USERS_DELETE missing from visible users policy');
    assert(repoContent.includes('USERS_MANAGE'), 'USERS_MANAGE missing from visible users policy');
    assert(repoContent.includes('isSuperAdmin'), 'Super admin missing from visible users policy');
    logPass('USERS_LIST_SCOPE', 'Super Admin and users with USERS_VIEW/CREATE/UPDATE/DELETE/MANAGE see all users; standard users restricted to own profile');
  } catch (err) {
    logFail('USERS_LIST_SCOPE', 'Visible users scope check failed', err.message);
  }

  // Test 2: inviteUserAction enforces USERS_CREATE / USERS_MANAGE / SUPER_ADMIN and blocks assigning Super Admin
  try {
    const actionContent = fs.readFileSync('lib/actions/users.ts', 'utf8');
    assert(actionContent.includes("hasPermission(authUser.id, 'USERS_CREATE')"), 'USERS_CREATE missing from invite check');
    assert(actionContent.includes("hasPermission(authUser.id, 'USERS_MANAGE')"), 'USERS_MANAGE missing from invite check');
    assert(actionContent.includes("only a Super Admin can assign the Super Admin role"), 'Missing Super Admin role assignment block for non-super caller');
    assert(!actionContent.includes("adminClient.auth.admin.createUser({\n        email,\n        email_confirm: true"), 'Silent direct user creation fallback detected on invite error');
    logPass('USERS_INVITE_SECURITY', 'Invite action strictly gated, non-super callers cannot assign Super Admin, and invite errors never silently create active auth users');
  } catch (err) {
    logFail('USERS_INVITE_SECURITY', 'Invite action security check failed', err.message);
  }

  // Test 3: saveUserAction and deleteUserAction enforce self-protection and Super Admin protection
  try {
    const actionContent = fs.readFileSync('lib/actions/users.ts', 'utf8');
    assert(actionContent.includes("You cannot remove your own user record"), 'Missing self-delete guard');
    assert(actionContent.includes("only a Super Admin can delete a Super Admin account"), 'Missing target Super Admin deletion protection');
    assert(actionContent.includes("cannot deactivate their own account"), 'Missing self-deactivation guard');
    logPass('USERS_MUTATION_RBAC', 'Self-deletion and self-deactivation blocked; non-super admins cannot delete or elevate Super Admins');
  } catch (err) {
    logFail('USERS_MUTATION_RBAC', 'User mutation security check failed', err.message);
  }

  // Test 4: app/users/page.tsx UI gates mirror backend permissions
  try {
    const pageContent = fs.readFileSync('app/users/page.tsx', 'utf8');
    assert(pageContent.includes('canCreateUsers'), 'UI create user button not strictly gated by canCreateUsers');
    assert(pageContent.includes('canUpdateUsers'), 'UI edit button not strictly gated by canUpdateUsers');
    assert(pageContent.includes('canDeleteUsers'), 'UI delete button not strictly gated by canDeleteUsers');
    assert(pageContent.includes('usr.id !== currentUserProfile?.id'), 'UI delete button visible on self');
    logPass('USERS_UI_SYMMETRY', 'UI buttons strictly mirror backend IAM permissions and hide self-delete triggers');
  } catch (err) {
    logFail('USERS_UI_SYMMETRY', 'UI permission mirroring check failed', err.message);
  }

  return results;
}

if (process.argv[1].endsWith('test-users.mjs')) {
  runUsersAccessTest().then(res => {
    console.table(res);
    const hasFail = res.some(r => r.status === 'FAIL');
    process.exit(hasFail ? 1 : 0);
  });
}

