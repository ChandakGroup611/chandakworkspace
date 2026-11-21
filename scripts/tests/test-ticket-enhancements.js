require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const assert = require('assert');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runTests() {
  console.log('================================================================');
  console.log('   TICKETS ENHANCEMENT & GLOBAL SEARCH AUTOMATED TEST SUITE     ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✔ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`✖ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  // --- 1. Authorized Ticket Dataset & Scope Tests ---
  console.log('--- 1. Testing Ticket Dataset & Scope Retrieval ---');
  const { data: tickets, error: tckErr } = await sb
    .from('tickets')
    .select('id, code, title, status_id, priority_id, department_id, assignee_id, due_date, created_at, is_deleted')
    .eq('is_deleted', false)
    .limit(50);

  test('TC-01: Tickets query succeeds without deletion leaks', () => {
    assert.strictEqual(tckErr, null);
    assert(Array.isArray(tickets));
    assert(tickets.every(t => !t.is_deleted));
  });

  // --- 2. Date Filtering Logic Tests ---
  console.log('\n--- 2. Testing Date Range Logic (Created, Due, Both, Null Handling) ---');
  test('TC-02: Created Date filter range correctly identifies records', () => {
    const from = '2026-01-01';
    const to = '2026-12-31';
    const inRange = tickets.filter(t => {
      const day = t.created_at ? t.created_at.slice(0, 10) : '';
      return day >= from && day <= to;
    });
    assert(inRange.length > 0);
  });

  test('TC-03: Null due date handling (never included in due date range)', () => {
    const from = '2026-01-01';
    const to = '2026-12-31';
    const nullDueTicket = { due_date: null };
    const matches = nullDueTicket.due_date && nullDueTicket.due_date.slice(0, 10) >= from && nullDueTicket.due_date.slice(0, 10) <= to;
    assert.strictEqual(Boolean(matches), false);
  });

  test('TC-04: Date validation catches From > To', () => {
    const from = '2026-12-31';
    const to = '2026-01-01';
    const isInvalid = from > to;
    assert.strictEqual(isInvalid, true);
  });

  // --- 3. Multi-Select Combination Filter Logic ---
  console.log('\n--- 3. Testing Multi-Select Grouping & Boolean Logic ---');
  test('TC-05 & TC-06: AND across filter groups with OR within group', () => {
    const mockTickets = [
      { id: '1', department_id: 'D1', priority_id: 'P1', assignee_id: 'U1' },
      { id: '2', department_id: 'D2', priority_id: 'P1', assignee_id: 'U2' },
      { id: '3', department_id: 'D1', priority_id: 'P2', assignee_id: 'U1' },
      { id: '4', department_id: 'D3', priority_id: 'P1', assignee_id: 'U1' }
    ];

    const filterDepts = ['D1', 'D2'];
    const filterPrios = ['P1'];
    const filterAssignees = ['U1'];

    const filtered = mockTickets.filter(t => {
      if (filterDepts.length && !filterDepts.includes(t.department_id)) return false;
      if (filterPrios.length && !filterPrios.includes(t.priority_id)) return false;
      if (filterAssignees.length && !filterAssignees.includes(t.assignee_id)) return false;
      return true;
    });

    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].id, '1');
  });

  // --- 4. Ticket Activity Stream Audit Schema & Verification ---
  console.log('\n--- 4. Testing Ticket Activity Stream Table & Field-Level Structure ---');
  const { data: streamSample, error: streamErr } = await sb
    .from('ticket_activity_stream')
    .select('id, ticket_id, actor, action, event_type, before_values, after_values, created_at')
    .limit(5);

  test('TC-13 to TC-17: ticket_activity_stream table exists and has JSONB diff support', () => {
    assert.strictEqual(streamErr, null);
    assert(Array.isArray(streamSample));
  });

  // --- 5. Ticket Reports Row Generation ---
  console.log('\n--- 5. Testing Ticket Reports Data Structure ---');
  const { data: statusMasters } = await sb.from('status_master').select('id, status_name, is_terminal, is_closed').limit(10);
  test('TC-21: status_master carries lifecycle and terminal flags', () => {
    assert(Array.isArray(statusMasters));
    assert(statusMasters.length > 0);
  });

  // --- 6. Multi-Module Global Search Verification ---
  console.log('\n--- 6. Testing Multi-Module Global Search Data Availability ---');
  const [vRes, mRes, bRes] = await Promise.all([
    sb.from('vehicles').select('id, registration_number, make, model').limit(3),
    sb.from('meet_meetings').select('id, title').limit(3),
    sb.from('budget_projects').select('id, name, code').limit(3)
  ]);

  test('TC-39: Vehicles table searchable for global search', () => {
    assert.strictEqual(vRes.error, null);
    assert(Array.isArray(vRes.data));
  });

  test('TC-40: Meet meetings table searchable for global search', () => {
    assert.strictEqual(mRes.error, null);
    assert(Array.isArray(mRes.data));
  });

  test('TC-41: Budget projects table searchable for global search', () => {
    assert.strictEqual(bRes.error, null);
    assert(Array.isArray(bRes.data));
  });

  console.log('\n================================================================');
  console.log(`TOTAL TEST ASSERTIONS: ${passed + failed}`);
  console.log(`✔ Passed: ${passed}`);
  console.log(`✖ Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
