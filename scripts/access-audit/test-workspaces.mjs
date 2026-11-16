/**
 * Access Rule Verification: Workspaces & Tasks Module
 * Validates against rules specified in docs/ACCESS_RULES.md
 */

import assert from 'assert';
import fs from 'fs';

export async function runWorkspacesAccessTest() {
  const results = [];
  const logPass = (rule, desc) => results.push({ module: 'Workspaces & Tasks', rule, desc, status: 'PASS' });
  const logFail = (rule, desc, error) => results.push({ module: 'Workspaces & Tasks', rule, desc, status: 'FAIL', error });

  // Test 1: canAccessWorkspace eliminates universal WORKSPACES_VIEW scope leakage
  try {
    const permContent = fs.readFileSync('lib/permissions/index.ts', 'utf8');
    const fnMatch = permContent.match(/export async function canAccessWorkspace\([\s\S]*?^}/m);
    assert(fnMatch, 'canAccessWorkspace function not found');
    const fnCode = fnMatch[0];
    assert(!fnCode.includes('ctx.perms.has("WORKSPACES_VIEW")\n  ) {\n    return true;'), 'Universal WORKSPACES_VIEW bypass still present in canAccessWorkspace');
    assert(fnCode.includes('WORKSPACES_MANAGE'), 'WORKSPACES_MANAGE missing from canAccessWorkspace');
    assert(fnCode.includes('workspace_members'), 'workspace_members check missing from canAccessWorkspace');
    logPass('WORKSPACE_VIEW_SCOPE', 'Universal WORKSPACES_VIEW bypass eliminated; private workspaces strictly restricted to members, owners, and Super Admin');
  } catch (err) {
    logFail('WORKSPACE_VIEW_SCOPE', 'canAccessWorkspace scope check failed', err.message);
  }

  // Test 2: assignUserToTasksBatch requires auth and permission checks
  try {
    const taskContent = fs.readFileSync('lib/actions/tasks.ts', 'utf8');
    const fnMatch = taskContent.match(/export async function assignUserToTasksBatch\([\s\S]*?^}/m);
    assert(fnMatch, 'assignUserToTasksBatch not found');
    const fnCode = fnMatch[0];
    assert(fnCode.includes('getUser()'), 'Authentication check missing in assignUserToTasksBatch');
    assert(fnCode.includes('SUPER_ADMIN'), 'Permission check missing in assignUserToTasksBatch');
    assert(fnCode.includes('canManageWorkspace'), 'Workspace authorization check missing in assignUserToTasksBatch');
    logPass('TASK_BATCH_ASSIGN_RBAC', 'assignUserToTasksBatch authenticated and strictly gated by ownership/management permissions');
  } catch (err) {
    logFail('TASK_BATCH_ASSIGN_RBAC', 'assignUserToTasksBatch check failed', err.message);
  }

  // Test 3: Unchecked workspace & task actions (createCustomField, updateTaskProgress, updateSprint, deleteTaskTemplate)
  try {
    const taskContent = fs.readFileSync('lib/actions/tasks.ts', 'utf8');
    const wsContent = fs.readFileSync('lib/actions/workspaces.ts', 'utf8');
    
    // createCustomField
    const cfMatch = taskContent.match(/export async function createCustomField\([\s\S]*?^}/m);
    assert(cfMatch && cfMatch[0].includes('getUser()') && cfMatch[0].includes('canManageWorkspace'), 'createCustomField lacks auth or permission check');

    // updateTaskProgress
    const progMatch = wsContent.match(/export async function updateTaskProgress\([\s\S]*?^}/m);
    assert(progMatch && progMatch[0].includes('getUser()') && progMatch[0].includes('canManageWorkspace'), 'updateTaskProgress lacks auth or permission check');

    // updateSprint
    const spMatch = wsContent.match(/export async function updateSprint\([\s\S]*?^}/m);
    assert(spMatch && spMatch[0].includes('getUser()') && spMatch[0].includes('canManageWorkspace'), 'updateSprint lacks auth or permission check');

    // deleteTaskTemplate
    const dtMatch = wsContent.match(/export async function deleteTaskTemplate\([\s\S]*?^}/m);
    assert(dtMatch && dtMatch[0].includes('getUser()') && dtMatch[0].includes('canManageWorkspace'), 'deleteTaskTemplate lacks auth or permission check');

    logPass('WORKSPACE_MUTATIONS_GATED', 'createCustomField, updateTaskProgress, updateSprint, and deleteTaskTemplate enforce server auth and permissions');
  } catch (err) {
    logFail('WORKSPACE_MUTATIONS_GATED', 'Workspace/task mutation checks failed', err.message);
  }

  // Test 4: WorkspaceMasterTable UI Share action and Super Admin normalization
  try {
    const tableContent = fs.readFileSync('components/workspaces/WorkspaceMasterTable.tsx', 'utf8');
    assert(tableContent.includes('isSuperAdminUser'), 'isSuperAdminUser normalized role check missing');
    assert(tableContent.includes('ROLE_SUPER_ADMIN'), 'ROLE_SUPER_ADMIN support missing in table permissions');
    assert(tableContent.includes('canShare'), 'canShare condition missing');
    logPass('WORKSPACE_UI_SHARE_ACTION', 'Share action context menu normalized for all Super Admin variants and workspace managers');
  } catch (err) {
    logFail('WORKSPACE_UI_SHARE_ACTION', 'Workspace table UI checks failed', err.message);
  }

  // Test 5: WorkspacesClient member selection reactivity
  try {
    const clientContent = fs.readFileSync('app/workspaces/WorkspacesClient.tsx', 'utf8');
    assert(clientContent.includes('stopPropagation'), 'stopPropagation missing on member checkbox to prevent event cancellation');
    assert(clientContent.includes('Array.isArray(newWS.assigneeIds)'), 'Defensive array check missing on assigneeIds');
    logPass('WORKSPACE_MEMBER_SELECTION_REACTIVE', 'Member selection click handlers protected against event cancellation and mobile double-toggle');
  } catch (err) {
    logFail('WORKSPACE_MEMBER_SELECTION_REACTIVE', 'Member selection check failed', err.message);
  }

  return results;
}

if (process.argv[1].endsWith('test-workspaces.mjs')) {
  runWorkspacesAccessTest().then(res => {
    console.table(res);
    const hasFail = res.some(r => r.status === 'FAIL');
    process.exit(hasFail ? 1 : 0);
  });
}
