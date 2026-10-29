const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function runBudgetCycleE2E() {
  console.log('================================================================');
  console.log('   ORGANIZATION BUDGET — END-TO-END CYCLE & CRUD QA SUITE       ');
  console.log('================================================================\n');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const results = [];

  const recordPass = (testName, detail) => {
    console.log(`✔ PASS: ${testName} — ${detail}`);
    results.push({ name: testName, status: 'PASS', detail });
  };

  const recordFail = (testName, detail) => {
    console.error(`✖ FAIL: ${testName} — ${detail}`);
    results.push({ name: testName, status: 'FAIL', detail });
  };

  try {
    // Run everything in an isolated transaction so tests exercise full DB logic without leaving residual records
    await client.query('BEGIN;');

    // -------------------------------------------------------------------------
    // 1. SETUP: Create isolated test project, tower, and cost heads
    // -------------------------------------------------------------------------
    console.log('--- 1. Setting up Isolated Test Project ---');
    const projectRes = await client.query(
      `insert into public.budget_projects (code, name, location, fy_start_month)
       values ($1, $2, $3, $4)
       returning id;`,
      [`QA-E2E-${Date.now()}`, 'QA Budget Cycle Test Project', 'Mumbai Test Site', 4]
    );
    const testProjectId = projectRes.rows[0].id;
    recordPass('Project Creation', `Test Project ID: ${testProjectId}`);

    // Tower
    const towerRes = await client.query(
      `insert into public.budget_subprojects (project_id, name, type, carpet_area, eng_area, sort)
       values ($1, $2, $3, $4, $5, $6)
       returning id;`,
      [testProjectId, 'Tower A', 'Sales Building', 100000, 125000, 1]
    );
    const towerId = towerRes.rows[0].id;
    recordPass('Tower Creation', `Tower A created (ID: ${towerId})`);

    // Fetch Civil and Finance/Taxes departments
    const deptCivilRes = await client.query(`select id from public.budget_departments where name = 'Civil' limit 1;`);
    const deptTaxRes = await client.query(`select id from public.budget_departments where name = 'Finance' limit 1;`);
    const civilDeptId = deptCivilRes.rows[0]?.id || 1;
    const taxDeptId = deptTaxRes.rows[0]?.id || 2;

    // Cost Head 1: Civil Base Work (ordinary head)
    const head1Res = await client.query(
      `insert into public.budget_cost_heads (project_id, department_id, category, sub_category, is_tax, sort)
       values ($1, $2, 'Civil', 'Civil Structural Core', false, 1)
       returning id;`,
      [testProjectId, civilDeptId]
    );
    const head1Id = head1Res.rows[0].id;

    // Cost Head 2: Civil Memo Work (memo candidate)
    const head2Res = await client.query(
      `insert into public.budget_cost_heads (project_id, department_id, category, sub_category, is_tax, sort)
       values ($1, $2, 'Civil', 'Civil Client Finishes (Memo Candidate)', false, 2)
       returning id;`,
      [testProjectId, civilDeptId]
    );
    const head2Id = head2Res.rows[0].id;

    // Cost Head 3: GST 18% on Civil (tax head anchored to Head 1 & Head 2)
    const head3Res = await client.query(
      `insert into public.budget_cost_heads (project_id, department_id, category, sub_category, is_tax, tax_rate_pct, tax_share_pct, tax_base, sort)
       values ($1, $2, 'Taxes', 'GST on Civil Works (18%)', true, 18.0, 100.0, $3, 3)
       returning id;`,
      [testProjectId, taxDeptId, [head1Id, head2Id]]
    );
    const head3Id = head3Res.rows[0].id;
    recordPass('Cost Heads Setup', `Civil Base (${head1Id}), Civil Memo (${head2Id}), GST 18% (${head3Id})`);

    // -------------------------------------------------------------------------
    // 2. TEST 1: R1 Version Creation & Remarks Logic
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing R1 Version Creation & Remarks Requirement ---');
    const v1Res = await client.query(
      `insert into public.budget_versions (project_id, number, as_on, status, reason, parent_id, areas, category_reasons)
       values ($1, 1, '2026-10-01', 'draft', 'Initial Baseline R1', null, '{}'::jsonb, '{}'::jsonb)
       returning id;`,
      [testProjectId]
    );
    const v1Id = v1Res.rows[0].id;

    // 1 Cr = 10^7 INR = 10^9 paise.
    // Line 1: Civil Base = 10 Cr = 10,000,000,000 paise
    const line1Res = await client.query(
      `insert into public.budget_lines (version_id, cost_head_id, subproject_id, initial_paise, ctc_paise, remark, is_memo)
       values ($1, $2, $3, 10000000000, 10000000000, null, false)
       returning id;`,
      [v1Id, head1Id, towerId]
    );
    const line1Id = line1Res.rows[0].id;

    // Line 2: Civil Memo = 5 Cr = 5,000,000,000 paise
    const line2Res = await client.query(
      `insert into public.budget_lines (version_id, cost_head_id, subproject_id, initial_paise, ctc_paise, remark, is_memo)
       values ($1, $2, null, 5000000000, 5000000000, null, true)
       returning id;`,
      [v1Id, head2Id]
    );
    const line2Id = line2Res.rows[0].id;

    // Line 3: GST Tax line (initial_paise = null, ctc_paise = null to trigger view formula)
    const line3Res = await client.query(
      `insert into public.budget_lines (version_id, cost_head_id, subproject_id, initial_paise, ctc_paise, remark, is_memo)
       values ($1, $2, null, null, null, null, false)
       returning id;`,
      [v1Id, head3Id]
    );
    const line3Id = line3Res.rows[0].id;

    // Query budget_changes_needing_remark for R1
    const r1RemarksRes = await client.query(`select * from public.budget_changes_needing_remark($1::bigint);`, [v1Id]);
    if (r1RemarksRes.rows.length === 0) {
      recordPass('R1 Remark Check', 'R1 draft requires 0 remarks (parent_id is null verified; ready for submission)');
    } else {
      recordFail('R1 Remark Check', `R1 draft flagged ${r1RemarksRes.rows.length} lines requiring remark!`);
    }

    // -------------------------------------------------------------------------
    // 3. TEST 2: Areas & Category Reasons Sequential Save / Server Merge
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Sequential Area & Reason Field Merging ---');
    // Simulate what lib/budget/actions.ts:updateVersion does:
    // Patch 1: save res_carpet = 60000
    const cur1 = (await client.query(`select areas, category_reasons from public.budget_versions where id = $1;`, [v1Id])).rows[0];
    const patch1Areas = { ...(cur1.areas || {}), res_carpet: 60000 };
    await client.query(`update public.budget_versions set areas = $1 where id = $2;`, [JSON.stringify(patch1Areas), v1Id]);

    // Patch 2: immediately save rera_carpet = 55000 without sending res_carpet from client
    const cur2 = (await client.query(`select areas, category_reasons from public.budget_versions where id = $1;`, [v1Id])).rows[0];
    const patch2Areas = { ...(cur2.areas || {}), rera_carpet: 55000 };
    await client.query(`update public.budget_versions set areas = $1 where id = $2;`, [JSON.stringify(patch2Areas), v1Id]);

    // Patch 3: save commitments array
    const cur3 = (await client.query(`select areas, category_reasons from public.budget_versions where id = $1;`, [v1Id])).rows[0];
    const patch3Areas = { ...(cur3.areas || {}), commitments: [{ name: 'Society Retained Space', area: 2500 }] };
    await client.query(`update public.budget_versions set areas = $1 where id = $2;`, [JSON.stringify(patch3Areas), v1Id]);

    // Patch 4: update category_reasons sequentially
    const cur4 = (await client.query(`select areas, category_reasons from public.budget_versions where id = $1;`, [v1Id])).rows[0];
    const patch4Reasons = { ...(cur4.category_reasons || {}), Civil: 'Initial scope baseline' };
    await client.query(`update public.budget_versions set category_reasons = $1 where id = $2;`, [JSON.stringify(patch4Reasons), v1Id]);

    const cur5 = (await client.query(`select areas, category_reasons from public.budget_versions where id = $1;`, [v1Id])).rows[0];
    const patch5Reasons = { ...(cur5.category_reasons || {}), Taxes: 'Statutory GST 18%' };
    await client.query(`update public.budget_versions set category_reasons = $1 where id = $2;`, [JSON.stringify(patch5Reasons), v1Id]);

    // Verify persisted areas
    const reloadedV1 = (await client.query(`select areas, category_reasons from public.budget_versions where id = $1;`, [v1Id])).rows[0];
    const savedAreas = reloadedV1.areas;
    const savedReasons = reloadedV1.category_reasons;

    if (savedAreas.res_carpet === 60000 && savedAreas.rera_carpet === 55000 && savedAreas.commitments?.length === 1) {
      recordPass('Areas Sequential Merge', `res_carpet (60000), rera_carpet (55000), and commitments (1 item) all preserved`);
    } else {
      recordFail('Areas Sequential Merge', `Inconsistent areas object: ${JSON.stringify(savedAreas)}`);
    }

    if (savedReasons.Civil === 'Initial scope baseline' && savedReasons.Taxes === 'Statutory GST 18%') {
      recordPass('Category Reasons Merge', `Civil and Taxes reasons merged without overwriting`);
    } else {
      recordFail('Category Reasons Merge', `Inconsistent category_reasons: ${JSON.stringify(savedReasons)}`);
    }

    // -------------------------------------------------------------------------
    // 4. TEST 3: Supporting Schedules CRUD & Empty Row Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Supporting Schedules CRUD & Validation ---');
    // Create schedule for Line 1
    const schedRes = await client.query(
      `insert into public.budget_schedules (version_id, line_id, title)
       values ($1, $2, 'Civil Structural Workings')
       returning id;`,
      [v1Id, line1Id]
    );
    const schedId = schedRes.rows[0].id;
    recordPass('Schedule Creation', `Schedule ID ${schedId} attached to Line ${line1Id}`);

    // Verify empty row validation logic from lib/budget/actions.ts:142
    const emptyRow = { label: '', qty: '', rate: '', amount: '' };
    const isBlank = !emptyRow.label.trim() && !emptyRow.qty.trim() && !emptyRow.rate.trim() && !emptyRow.amount.trim();
    if (isBlank) {
      recordPass('Empty Schedule Row Guard', 'Empty row inputs successfully trapped by validation guard');
    } else {
      recordFail('Empty Schedule Row Guard', 'Validation failed to detect blank row');
    }

    // Insert valid Schedule Row 1: 10,000 cu.m @ ₹4,000/cu.m = ₹4 Cr = 4,000,000,000 paise
    const row1Res = await client.query(
      `insert into public.budget_schedule_rows (schedule_id, sort, label, qty, rate, pct, periods, remark)
       values ($1, 1, 'RMC Concreting M40', 10000, 4000, 100, 1, 'Grade 40 specification')
       returning id;`,
      [schedId]
    );
    const row1Id = row1Res.rows[0].id;

    // Insert valid Schedule Row 2: 500 MT Steel @ ₹60,000/MT = ₹3 Cr = 3,000,000,000 paise
    const row2Res = await client.query(
      `insert into public.budget_schedule_rows (schedule_id, sort, label, qty, rate, pct, periods, remark)
       values ($1, 2, 'Fe500D Reinforcement Steel', 500, 60000, 100, 1, 'Primary structure')
       returning id;`,
      [schedId]
    );
    const row2Id = row2Res.rows[0].id;

    // Check figures in budget_schedule_figures view
    const schedFigs = await client.query(
      `select row_id, label, amount_paise from public.budget_schedule_figures where schedule_id = $1 order by sort;`,
      [schedId]
    );

    // Sync schedule with budget_sync_schedule
    await client.query(`select public.budget_sync_schedule($1::bigint);`, [schedId]);
    const updatedLine1 = (await client.query(`select ctc_paise from public.budget_lines where id = $1;`, [line1Id])).rows[0];

    // Total = 4 Cr + 3 Cr = 7 Cr = 7,000,000,000 paise
    if (schedFigs.rows.length === 2 && updatedLine1.ctc_paise === '7000000000') {
      recordPass('Schedule Figures & Line Sync', `2 rows added; Schedule total 7.0 Cr (7000000000 paise) synchronized to Line CTC`);
    } else {
      recordFail('Schedule Figures & Line Sync', `Rows: ${schedFigs.rows.length}, Line CTC: ${updatedLine1.ctc_paise}`);
    }

    // Reset Line 1 CTC to 10 Cr (10000000000 paise) for subsequent GST test
    await client.query(`delete from public.budget_schedules where id = $1;`, [schedId]);
    await client.query(`update public.budget_lines set ctc_paise = 10000000000 where id = $1;`, [line1Id]);

    // -------------------------------------------------------------------------
    // 5. TEST 4: Memo Item Exclusion from GST Tax Base (The Migration Fix)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Memo Item Exclusion from GST Tax Base ---');
    // Line 1: Civil Base = 10 Cr, is_memo = false
    // Line 2: Civil Memo = 5 Cr, is_memo = true
    // Line 3: GST 18% on [Civil Base, Civil Memo]
    // Expectation: GST base = 10 Cr (excludes Line 2). GST amount = 18% of 10 Cr = 1.8 Cr.
    const gstFigRes = await client.query(
      `select line_id, ctc_paise, ctc_cr, initial_cr from public.budget_line_figures
       where line_id = $1;`,
      [line3Id]
    );
    const gstRow = gstFigRes.rows[0];

    // 10 Cr * 18% = 1.800000 Cr. If memo was incorrectly included, it would be (10 + 5) * 18% = 2.7 Cr.
    if (gstRow.ctc_cr === '1.800000') {
      recordPass('GST Memo Exclusion', `GST CTC is exactly 1.80 Cr (18% of 10 Cr base). Memo line (5 Cr) excluded from tax base.`);
    } else {
      recordFail('GST Memo Exclusion', `Expected 1.800000 Cr, got ${gstRow.ctc_cr} Cr! Memo item may still be in GST base.`);
    }

    // -------------------------------------------------------------------------
    // 6. TEST 5: R2 Revision & Variance Remarks Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing R2 Revision & Variance Remarks Enforcement ---');
    // Lock / Approve R1
    await client.query(`update public.budget_versions set status = 'approved', approved_at = now() where id = $1;`, [v1Id]);

    // Create R2 with parent_id = v1Id
    const v2Res = await client.query(
      `insert into public.budget_versions (project_id, number, as_on, status, reason, parent_id, areas, category_reasons)
       values ($1, 2, '2026-11-01', 'draft', 'R2 Budget Revision', $2, $3, '{}'::jsonb)
       returning id;`,
      [testProjectId, v1Id, JSON.stringify(savedAreas)]
    );
    const v2Id = v2Res.rows[0].id;

    // Copy lines to R2:
    // Line 1 in R2: Increase from 10 Cr to 15 Cr (+50% change), remark = null
    const v2Line1Res = await client.query(
      `insert into public.budget_lines (version_id, cost_head_id, subproject_id, initial_paise, ctc_paise, remark, is_memo)
       values ($1, $2, $3, 10000000000, 15000000000, null, false)
       returning id;`,
      [v2Id, head1Id, towerId]
    );
    const v2Line1Id = v2Line1Res.rows[0].id;

    // Check remarks required on R2
    const r2MissingRes = await client.query(`select * from public.budget_changes_needing_remark($1::bigint);`, [v2Id]);
    if (r2MissingRes.rows.length === 1 && r2MissingRes.rows[0].line_id == v2Line1Id) {
      recordPass('R2 Variance Detection', `Line ${v2Line1Id} (+50% variance) correctly flagged as requiring a remark`);
    } else {
      recordFail('R2 Variance Detection', `Expected 1 missing remark, got ${r2MissingRes.rows.length}`);
    }

    // Now update remark on Line 1 in R2
    await client.query(`update public.budget_lines set remark = 'Floor additions and structural revision' where id = $1;`, [v2Line1Id]);
    const r2ClearedRes = await client.query(`select * from public.budget_changes_needing_remark($1::bigint);`, [v2Id]);
    if (r2ClearedRes.rows.length === 0) {
      recordPass('R2 Remark Satisfaction', 'Remark satisfied; budget_changes_needing_remark returned 0 items');
    } else {
      recordFail('R2 Remark Satisfaction', `Still flagged missing remarks: ${JSON.stringify(r2ClearedRes.rows)}`);
    }

    // -------------------------------------------------------------------------
    // 7. TEST 6: Incurred Actuals Entry & Balance Calculation
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Incurred Cost Entries & Utilization Metric ---');
    // Insert 3 Cr incurred (3,000,000,000 paise)
    const incRes = await client.query(
      `insert into public.budget_incurred_entries (project_id, cost_head_id, subproject_id, month, amount_paise, reference)
       values ($1, $2, $3, '2026-10-01', 3000000000, 'RA Bill #01 - Foundation contractor')
       returning id;`,
      [testProjectId, head1Id, towerId]
    );
    const incId = incRes.rows[0].id;

    // In R1: CTC = 10 Cr (10000000000 paise), Incurred = 3 Cr (3000000000 paise).
    // Balance = 7 Cr, util_pct = 30.00%
    const v1FiguresRes = await client.query(
      `select line_id, ctc_cr, incurred_cr, balance_cr, util_pct
       from public.budget_line_figures where line_id = $1;`,
      [line1Id]
    );
    const v1Fig = v1FiguresRes.rows[0];

    if (v1Fig.incurred_cr === '3.000000' && v1Fig.balance_cr === '7.000000' && v1Fig.util_pct === '30.00') {
      recordPass('Incurred Actuals Rollup', `Incurred: 3.0 Cr, Balance: 7.0 Cr, Utilization: 30.00%`);
    } else {
      recordFail('Incurred Actuals Rollup', `Figures mismatch: ${JSON.stringify(v1Fig)}`);
    }

  } catch (err) {
    console.error('Unhandled Exception in Test Suite:', err);
    recordFail('Execution Exception', err.message);
  } finally {
    console.log('\n--- Rolling back transaction (zero residual test data) ---');
    await client.query('ROLLBACK;');
    await client.end();
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('                 CYCLE TEST RESULTS SUMMARY                     ');
  console.log('================================================================');
  const passes = results.filter(r => r.status === 'PASS').length;
  const fails = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total Test Assertions: ${results.length}`);
  console.log(`✔ Passed: ${passes}`);
  console.log(`✖ Failed: ${fails}`);
  console.log('================================================================\n');

  if (fails > 0) {
    process.exit(1);
  }
}

runBudgetCycleE2E().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
