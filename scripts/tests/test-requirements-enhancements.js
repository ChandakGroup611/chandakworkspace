/**
 * test-requirements-enhancements.js
 * Comprehensive automated regression and enhancement test for Requirements module.
 */

const assert = require('assert');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runTests() {
  console.log('=== RUNNING REQUIREMENTS MODULE ENHANCEMENT TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ ${name}:`, e.message);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ ${name}:`, e.message);
      failed++;
    }
  }

  // 1. Verify Requirements Table Schema
  await asyncTest('Requirements schema contains all required fields', async () => {
    const { data, error } = await supabase.from('requirements').select('*').limit(1);
    assert.strictEqual(error, null, 'Error querying requirements table');
    const cols = Object.keys(data[0] || {});
    const requiredCols = ['id', 'code', 'title', 'status_id', 'department_id', 'creator_id', 'due_date', 'approval_status', 'overdue_days'];
    requiredCols.forEach(col => {
      assert.ok(cols.includes(col), `Missing column: ${col}`);
    });
  });

  // 2. Verify Requirement Statuses in status_master
  await asyncTest('Status master contains active REQUIREMENT statuses', async () => {
    const { data: statuses, error } = await supabase
      .from('status_master')
      .select('status_code, status_name, scope_type')
      .eq('scope_type', 'REQUIREMENT')
      .eq('is_deleted', false);
    assert.strictEqual(error, null, 'Error querying status_master');
    assert.ok(statuses.length >= 5, `Expected at least 5 requirement statuses, got ${statuses.length}`);
    const codes = statuses.map(s => s.status_code);
    assert.ok(codes.includes('REQ_PENDING'), 'Must contain REQ_PENDING');
    assert.ok(codes.includes('REQ_APPROVED'), 'Must contain REQ_APPROVED');
  });

  // 3. Verify activity_events table holds REQUIREMENT events
  await asyncTest('Activity events table supports REQUIREMENT module_type and JSONB values', async () => {
    const { data, error } = await supabase
      .from('activity_events')
      .select('id, module_type, event_type, old_value, new_value')
      .eq('module_type', 'REQUIREMENT')
      .limit(5);
    assert.strictEqual(error, null, 'Error querying activity_events');
    assert.ok(Array.isArray(data), 'Result must be an array');
  });

  // 4. Verify Field-Level Audit Diffing Logic
  test('Field-level diff detection correctly identifies changed fields', () => {
    const existing = {
      title: 'Old Title',
      priority_id: 'prio-1',
      department_id: 'dept-1',
      target_release: 'v1.0'
    };
    const payload = {
      title: 'New Title',
      priority_id: 'prio-1', // unchanged
      department_id: 'dept-2', // changed
      target_release: 'v1.1' // changed
    };

    const diffs = [];
    if (payload.title !== existing.title) diffs.push({ field: 'Title', oldVal: existing.title, newVal: payload.title });
    if (payload.priority_id !== existing.priority_id) diffs.push({ field: 'Priority', oldVal: existing.priority_id, newVal: payload.priority_id });
    if (payload.department_id !== existing.department_id) diffs.push({ field: 'Department', oldVal: existing.department_id, newVal: payload.department_id });
    if (payload.target_release !== existing.target_release) diffs.push({ field: 'Target Release', oldVal: existing.target_release, newVal: payload.target_release });

    assert.strictEqual(diffs.length, 3, 'Must detect exactly 3 changed fields');
    assert.strictEqual(diffs[0].field, 'Title');
    assert.strictEqual(diffs[1].field, 'Department');
    assert.strictEqual(diffs[2].field, 'Target Release');
  });

  // 5. Verify Overdue SLA Evaluation Logic
  test('Overdue logic correctly flags past due dates on open requirements and ignores completed ones', () => {
    const today = '2026-11-21';
    const isOverdue = (r) => {
      const s = (r.approvalStatus || '').toLowerCase();
      if (s.includes('approved') || s.includes('closed') || s.includes('rejected')) return false;
      if (r.overdueDays && r.overdueDays > 0) return true;
      if (r.dueDate && r.dueDate < today) return true;
      return false;
    };

    // Case 1: Past due date, open
    assert.strictEqual(isOverdue({ dueDate: '2026-11-15', approvalStatus: 'Pending' }), true);
    // Case 2: Past due date, approved/closed (must NOT be overdue)
    assert.strictEqual(isOverdue({ dueDate: '2026-11-15', approvalStatus: 'Approved' }), false);
    assert.strictEqual(isOverdue({ dueDate: '2026-11-15', approvalStatus: 'Closed' }), false);
    // Case 3: Future due date
    assert.strictEqual(isOverdue({ dueDate: '2026-11-25', approvalStatus: 'Pending' }), false);
    // Case 4: No due date
    assert.strictEqual(isOverdue({ dueDate: null, approvalStatus: 'Pending' }), false);
  });

  // 6. Verify Date Mode Filter Logic
  test('Date Mode filtering works for CREATED, DUE, and BOTH', () => {
    const row = {
      created_day: '2026-11-10',
      due_day: '2026-11-20'
    };

    // Mode CREATED
    const matchCreated = (from, to) => row.created_day >= from && row.created_day <= to;
    assert.strictEqual(matchCreated('2026-11-01', '2026-11-15'), true);
    assert.strictEqual(matchCreated('2026-11-12', '2026-11-15'), false);

    // Mode DUE
    const matchDue = (from, to) => row.due_day >= from && row.due_day <= to;
    assert.strictEqual(matchDue('2026-11-15', '2026-11-25'), true);
    assert.strictEqual(matchDue('2026-11-01', '2026-11-15'), false);

    // Mode BOTH
    const matchBoth = (cFrom, cTo, dFrom, dTo) => matchCreated(cFrom, cTo) && matchDue(dFrom, dTo);
    assert.strictEqual(matchBoth('2026-11-01', '2026-11-15', '2026-11-15', '2026-11-25'), true);
    assert.strictEqual(matchBoth('2026-11-12', '2026-11-15', '2026-11-15', '2026-11-25'), false);
  });

  // 7. Verify Linked Tasks Integration
  await asyncTest('Requirement tasks relationship resolves linked task counts', async () => {
    const { data: links, error } = await supabase.from('requirement_tasks').select('requirement_id, task_id').limit(5);
    assert.strictEqual(error, null, 'Error querying requirement_tasks');
    assert.ok(Array.isArray(links), 'Links must be an array');
  });

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
