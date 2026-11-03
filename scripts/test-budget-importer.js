const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { Client } = require('pg');
const XLSX = require('xlsx');
const BudgetImporter = require('../lib/budget/importer.js');

async function runImporterTests() {
  console.log('================================================================');
  console.log('     ORGANIZATION BUDGET — EXCEL IMPORTER TEST SUITE            ');
  console.log('================================================================\n');

  let passed = 0, failed = 0;
  function assert(condition, message) {
    if (condition) {
      console.log(`✔ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✖ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Detect Kind Tests
  console.log('--- 1. Testing Format Detection (detectKind) ---');
  const summaryFile = 'C:/Users/AvinashPise/OneDrive - Chandak Group/IT BUDGET/it-budget-dashboard/Greenairy_Budget_Summary_R10_As_On_30_6_2026.xlsx';
  const wbSummary = XLSX.readFile(summaryFile, { cellFormula: true, cellNF: true });
  const kindSummary = BudgetImporter.detectKind(XLSX, wbSummary);
  assert(kindSummary === 'detail', `Greenairy Summary detected as 'detail' (got: ${kindSummary})`);

  const detailFile = 'C:/Users/AvinashPise/OneDrive - Chandak Group/IT BUDGET/it-budget-dashboard/Final Approved Budget_V1_Greenairy.xlsx';
  const wbDetail = XLSX.readFile(detailFile, { cellFormula: true, cellNF: true });
  const kindDetail = BudgetImporter.detectKind(XLSX, wbDetail);
  assert(kindDetail === 'detail', `Final Approved Budget detected as 'detail' (got: ${kindDetail})`);

  const costFile = path.resolve('public/budget-samples/Cost Incurred Sheet template.xlsx');
  const wbCost = XLSX.readFile(costFile, { cellFormula: true, cellNF: true });
  const kindCost = BudgetImporter.detectKind(XLSX, wbCost);
  assert(kindCost === 'cost', `Cost Incurred template detected as 'cost' (got: ${kindCost})`);

  // 2. Parsing Summary Workbook
  console.log('\n--- 2. Testing Summary Workbook Parsing ---');
  const parsedSum = BudgetImporter.parseDetailWorkbook(XLSX, wbSummary, path.basename(summaryFile));
  const payloadSum = BudgetImporter.toImportPayload(parsedSum);
  assert(payloadSum.project.name === 'Chandak Greenairy', `Project Name: ${payloadSum.project.name}`);
  assert(payloadSum.revision === 10, `Revision R10 extracted (got: ${payloadSum.revision})`);
  assert(payloadSum.as_on === '2026-06-30', `As On date: ${payloadSum.as_on}`);
  assert(payloadSum.cost_heads.length > 50, `Cost heads parsed: ${payloadSum.cost_heads.length}`);
  assert(payloadSum.subprojects.length > 0, `Subprojects parsed: ${payloadSum.subprojects.length}`);
  assert(payloadSum.lines.length === payloadSum.cost_heads.length, `Lines count matches heads count (${payloadSum.lines.length})`);

  // 3. Parsing Multi-Sheet Detail Workbook
  console.log('\n--- 3. Testing Multi-Sheet Detail Workbook Parsing ---');
  const parsedDet = BudgetImporter.parseDetailWorkbook(XLSX, wbDetail, path.basename(detailFile));
  const payloadDet = BudgetImporter.toImportPayload(parsedDet);
  assert(payloadDet.project.name.toLowerCase().includes('greenairy'), `Project Name: ${payloadDet.project.name}`);
  assert(payloadDet.cost_heads.length > 50, `Cost heads parsed: ${payloadDet.cost_heads.length}`);
  assert(payloadDet.subprojects.length > 0, `Subprojects parsed: ${payloadDet.subprojects.length}`);

  // 4. Parsing Cost Incurred Sheet
  console.log('\n--- 4. Testing Cost Incurred Sheet Parsing ---');
  const costParsed = BudgetImporter.parseCostSheet(XLSX, wbCost, path.basename(costFile));
  assert(costParsed.rows.length > 0, `Cost rows parsed: ${costParsed.rows.length}`);
  assert(costParsed.errors.length === 0, `Cost sheet errors: ${costParsed.errors.length}`);

  // 5. Database Dry-Run via budget_preview_import
  console.log('\n--- 5. Testing Database Preview Dry-Run ---');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN;');
    await client.query("set local role authenticated;");
    const claims = JSON.stringify({
      sub: "78f24070-0437-4766-b2b9-8440a3d1c4e8",
      email: "avinash@gmail.com",
      role: "authenticated",
      user_metadata: { app_role: "ROLE_SUPER_ADMIN" }
    });
    await client.query(`select set_config('request.jwt.claims', $1, true);`, [claims]);

    const res = await client.query('select public.budget_preview_import(null, $1::jsonb) as preview;', [JSON.stringify(payloadSum)]);
    const preview = res.rows[0].preview;
    assert(preview.into === 'new project', `DB Preview into: ${preview.into}`);
    assert(preview.new_head_names.length === payloadSum.cost_heads.length, `DB Preview new heads: ${preview.new_head_names.length}`);
  } catch (err) {
    assert(false, `DB Preview exception: ${err.message}`);
  } finally {
    await client.query('ROLLBACK;');
    await client.end();
  }

  console.log('\n================================================================');
  console.log(`Summary: Passed: ${passed}, Failed: ${failed}`);
  console.log('================================================================');
  if (failed > 0) process.exit(1);
}

runImporterTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

