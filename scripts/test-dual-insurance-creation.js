/**
 * Verification test for Dual Insurance Creation & Editing:
 * Tests that vehicles can be created with both Own Insurance and Third Party Insurance
 * in a single operation, initializing both pointers on the vehicles table
 * and creating corresponding active records in the insurance_policies table.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = (m[2] || '').replace(/^['"]|['"]$/g, '').trim();
});

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("=== VERIFYING DUAL INSURANCE REGISTRATION & EDITING ===\n");
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

  const testPlate = `MH02DUAL${Date.now().toString().slice(-4)}`;
  const testOwnVendor = "HDFC ERGO General Insurance";
  const testOwnPolicy = `OWN-POL-${Date.now().toString().slice(-6)}`;
  const testOwnExpiry = "2027-10-31";

  const testTpVendor = "ICICI Lombard General Insurance";
  const testTpPolicy = `TP-POL-${Date.now().toString().slice(-6)}`;
  const testTpExpiry = "2029-10-31";

  console.log(`1. Simulating creation of vehicle ${testPlate} with both Own & TP Insurance...`);

  // Insert vehicle record with both Own and TP insurance pointers
  const { data: newVeh, error: vehErr } = await supabaseAdmin
    .from('vehicles')
    .insert({
      registration_number: testPlate,
      vin_chassis_number: `CHASSIS-${testPlate}-${Date.now().toString(36).toUpperCase()}`,
      make: "Tata",
      model: "Nexon EV",
      variant: "Empowered Plus",
      category: "CAR",
      status: "IN_STOCK",
      fuel_type: "ELECTRIC",
      registered_owner: "Chandak Group Fleet Desk",
      rto_rmn: "+919820000000",
      registration_date: "2026-10-22",
      own_insurance_policy_number: testOwnPolicy,
      own_insurance_expiry_date: testOwnExpiry,
      own_insurance_vendor: testOwnVendor,
      insurance_policy_number: testOwnPolicy,
      insurance_expiry_date: testOwnExpiry,
      insurance_vendor: testOwnVendor,
      tp_insurance_policy_number: testTpPolicy,
      tp_insurance_expiry_date: testTpExpiry,
      tp_insurance_vendor: testTpVendor
    })
    .select()
    .single();

  if (vehErr) {
    console.error("Vehicle insertion error details:", JSON.stringify(vehErr, null, 2));
  }
  assert(!vehErr && newVeh?.id, `Vehicle ${testPlate} created successfully (ID: ${newVeh?.id})`);

  // Insert corresponding initial active insurance_policies
  const { data: ownPol, error: ownPolErr } = await supabaseAdmin
    .from('insurance_policies')
    .insert({
      vehicle_id: newVeh.id,
      insurance_category: "Own Insurance",
      insurer_name: testOwnVendor,
      policy_number: testOwnPolicy,
      policy_type: "Comprehensive",
      start_date: "2026-10-22",
      end_date: testOwnExpiry,
      idv: 1850000,
      premium_amount: 32000,
      is_active: true
    })
    .select()
    .single();

  assert(!ownPolErr && ownPol?.id, `Initial active 'Own Insurance' policy record created (${testOwnPolicy})`);

  const { data: tpPol, error: tpPolErr } = await supabaseAdmin
    .from('insurance_policies')
    .insert({
      vehicle_id: newVeh.id,
      insurance_category: "Third Party Insurance",
      insurer_name: testTpVendor,
      policy_number: testTpPolicy,
      policy_type: "Third-Party Liability",
      start_date: "2026-10-22",
      end_date: testTpExpiry,
      idv: 0,
      premium_amount: 4500,
      is_active: true
    })
    .select()
    .single();

  assert(!tpPolErr && tpPol?.id, `Initial active 'Third Party Insurance' policy record created (${testTpPolicy})`);

  // Verify vehicle pointers
  const { data: fetchedVeh } = await supabaseAdmin
    .from('vehicles')
    .select('own_insurance_policy_number, own_insurance_vendor, own_insurance_expiry_date, tp_insurance_policy_number, tp_insurance_vendor, tp_insurance_expiry_date')
    .eq('id', newVeh.id)
    .single();

  assert(fetchedVeh.own_insurance_policy_number === testOwnPolicy, `Vehicle Own Insurance policy verified: ${fetchedVeh.own_insurance_policy_number}`);
  assert(fetchedVeh.own_insurance_vendor === testOwnVendor, `Vehicle Own Insurance vendor verified: ${fetchedVeh.own_insurance_vendor}`);
  assert(fetchedVeh.tp_insurance_policy_number === testTpPolicy, `Vehicle Third Party Insurance policy verified: ${fetchedVeh.tp_insurance_policy_number}`);
  assert(fetchedVeh.tp_insurance_vendor === testTpVendor, `Vehicle Third Party Insurance vendor verified: ${fetchedVeh.tp_insurance_vendor}`);
  assert(fetchedVeh.own_insurance_policy_number !== fetchedVeh.tp_insurance_policy_number, "Own and Third Party policies are completely segregated and independent");

  // Query insurance_policies for this vehicle
  const { data: policies } = await supabaseAdmin
    .from('insurance_policies')
    .select('id, insurance_category, policy_number, insurer_name, is_active')
    .eq('vehicle_id', newVeh.id)
    .eq('is_active', true);

  assert(policies.length === 2, `Exactly 2 active insurance policies found for vehicle (found: ${policies.length})`);
  const activeOwn = policies.find(p => p.insurance_category === "Own Insurance");
  const activeTp = policies.find(p => p.insurance_category === "Third Party Insurance");
  assert(activeOwn && activeOwn.policy_number === testOwnPolicy, `Active Own Insurance record matches: ${activeOwn?.policy_number}`);
  assert(activeTp && activeTp.policy_number === testTpPolicy, `Active Third Party record matches: ${activeTp?.policy_number}`);

  // Test updating both policies (simulating Edit Vehicle modal save)
  console.log("\n2. Simulating edit of both Own & TP Insurance on vehicle...");
  const updatedOwnPolicy = `OWN-RENEWED-${Date.now().toString().slice(-4)}`;
  const updatedTpPolicy = `TP-RENEWED-${Date.now().toString().slice(-4)}`;

  // Update vehicle table
  const { error: updateErr } = await supabaseAdmin
    .from('vehicles')
    .update({
      own_insurance_policy_number: updatedOwnPolicy,
      insurance_policy_number: updatedOwnPolicy,
      tp_insurance_policy_number: updatedTpPolicy,
      updated_at: new Date().toISOString()
    })
    .eq('id', newVeh.id);
  assert(!updateErr, `Vehicle update executed without errors`);

  // Update insurance_policies independently by insurance_category
  const { data: ownExisting } = await supabaseAdmin
    .from('insurance_policies')
    .select('id')
    .eq('vehicle_id', newVeh.id)
    .eq('insurance_category', 'Own Insurance')
    .eq('is_active', true)
    .maybeSingle();

  if (ownExisting) {
    await supabaseAdmin
      .from('insurance_policies')
      .update({ policy_number: updatedOwnPolicy, updated_at: new Date().toISOString() })
      .eq('id', ownExisting.id);
  }

  const { data: tpExisting } = await supabaseAdmin
    .from('insurance_policies')
    .select('id')
    .eq('vehicle_id', newVeh.id)
    .eq('insurance_category', 'Third Party Insurance')
    .eq('is_active', true)
    .maybeSingle();

  if (tpExisting) {
    await supabaseAdmin
      .from('insurance_policies')
      .update({ policy_number: updatedTpPolicy, updated_at: new Date().toISOString() })
      .eq('id', tpExisting.id);
  }

  // Verify updated state
  const { data: updatedVeh } = await supabaseAdmin
    .from('vehicles')
    .select('own_insurance_policy_number, tp_insurance_policy_number')
    .eq('id', newVeh.id)
    .single();

  assert(updatedVeh.own_insurance_policy_number === updatedOwnPolicy, `Updated Own Insurance policy matches: ${updatedVeh.own_insurance_policy_number}`);
  assert(updatedVeh.tp_insurance_policy_number === updatedTpPolicy, `Updated Third Party policy matches: ${updatedVeh.tp_insurance_policy_number}`);

  const { data: updatedPolicies } = await supabaseAdmin
    .from('insurance_policies')
    .select('id, insurance_category, policy_number, is_active')
    .eq('vehicle_id', newVeh.id)
    .eq('is_active', true);

  const updatedOwnPol = updatedPolicies.find(p => p.insurance_category === "Own Insurance");
  const updatedTpPol = updatedPolicies.find(p => p.insurance_category === "Third Party Insurance");
  assert(updatedOwnPol?.policy_number === updatedOwnPolicy, `Active Own Insurance ledger updated to ${updatedOwnPol?.policy_number}`);
  assert(updatedTpPol?.policy_number === updatedTpPolicy, `Active Third Party ledger updated to ${updatedTpPol?.policy_number}`);

  // Clean up test records
  console.log("\nCleaning up test records...");
  await supabaseAdmin.from('insurance_policies').delete().eq('vehicle_id', newVeh.id);
  await supabaseAdmin.from('vehicles').delete().eq('id', newVeh.id);
  console.log("Cleanup complete.");

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
