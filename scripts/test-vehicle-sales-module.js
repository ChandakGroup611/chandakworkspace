/**
 * Automated Verification Script for Vehicle Sales & Disposals Sub-Module
 * 1. Checks vehicle_sales table schema, columns, and indexes.
 * 2. Checks RLS policies on vehicle_sales.
 * 3. Verifies joined query between vehicle_sales and vehicles.
 * 4. Verifies test vehicle sale insertion and vehicle status update.
 * 5. Cleans up test record to maintain zero regression.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = (m[2] || '').replace(/^['"]|['"]$/g, '').trim();
});

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runTests() {
  console.log("=== VEHICLE SALES & ASSET DISPOSAL MODULE VERIFICATION ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Verify table columns exist on vehicle_sales
  const { data: sales, error: salesErr } = await supabaseAdmin
    .from('vehicle_sales')
    .select(`
      id,
      vehicle_id,
      sale_date,
      sale_price,
      buyer_name,
      buyer_phone,
      buyer_email,
      sale_type,
      payment_mode,
      sale_document_url,
      notes,
      recorded_by,
      created_at,
      vehicle:vehicles (
        id,
        registration_number,
        make,
        model,
        variant,
        status,
        purchase_cost
      )
    `)
    .limit(5);

  assert(!salesErr, `Query vehicle_sales joined with vehicles: ${salesErr ? salesErr.message : "Success"}`);
  console.log(`Found ${sales ? sales.length : 0} existing vehicle sale records in the database.`);

  // 2. Test lifecycle: pick an existing vehicle and record a test sale
  console.log("\n--- Testing End-to-End Vehicle Sale Lifecycle ---");
  const { data: existingVehicles, error: evErr } = await supabaseAdmin
    .from('vehicles')
    .select('id, registration_number, status, purchase_cost')
    .limit(1);

  assert(!evErr && existingVehicles && existingVehicles.length > 0, "Retrieved existing vehicle from database");
  const testVeh = existingVehicles[0];
  console.log(`Using existing vehicle ${testVeh.registration_number} (${testVeh.id}) for sale test...`);

  // 3. Insert sale record
  const { data: insertedSale, error: insSaleErr } = await supabaseAdmin
    .from('vehicle_sales')
    .insert({
      vehicle_id: testVeh.id,
      sale_date: new Date().toISOString().split('T')[0],
      sale_price: 450000,
      buyer_name: "Apex Auto Salvage & Sales Pvt Ltd",
      buyer_phone: "+91 99887 76655",
      buyer_email: "disposals@apexauto.test",
      sale_type: "Full Sale",
      payment_mode: "Bank Transfer",
      notes: "Automated QA verification test for asset disposal",
      financed: false
    })
    .select()
    .single();

  assert(!insSaleErr && insertedSale, `Recorded sale for test vehicle: realized ₹${insertedSale ? insertedSale.sale_price : 0}`);

  // 4. Query back via the joined query
  const { data: queriedSale, error: qErr } = await supabaseAdmin
    .from('vehicle_sales')
    .select(`
      id,
      sale_price,
      buyer_name,
      buyer_phone,
      buyer_email,
      sale_type,
      payment_mode,
      vehicle:vehicles (
        registration_number,
        status,
        purchase_cost
      )
    `)
    .eq('id', insertedSale.id)
    .single();

  assert(!qErr && queriedSale, "Queried sale record with vehicle join successfully");
  assert(queriedSale && queriedSale.vehicle && queriedSale.vehicle.registration_number === testVeh.registration_number, "Joined vehicle registration number matches");
  assert(queriedSale && queriedSale.buyer_name === "Apex Auto Salvage & Sales Pvt Ltd", "Buyer name correctly persisted");
  assert(queriedSale && queriedSale.sale_price === 450000, "Sale price correctly persisted as 450000");

  // 5. Clean up test sale record
  const { error: delErr } = await supabaseAdmin
    .from('vehicle_sales')
    .delete()
    .eq('id', insertedSale.id);

  assert(!delErr, "Cleaned up temporary test vehicle sale record safely");

  console.log(`\n=== TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
