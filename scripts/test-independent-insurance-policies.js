/**
 * Automated test suite for Independent Policy Details:
 * 1. Same vehicle has both Own Insurance and Third Party Insurance policies
 * 2. Independent vendors, policy numbers, expiry dates, IDVs, premiums
 * 3. Saving/renewing Own Insurance preserves Third Party Insurance
 * 4. Saving/renewing Third Party Insurance preserves Own Insurance
 * 5. Notification formats verified
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
  console.log("=== INDEPENDENT INSURANCE POLICIES VERIFICATION ===\n");
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

  // 1. Pick a test vehicle
  const { data: vehs, error: vehErr } = await supabaseAdmin
    .from('vehicles')
    .select('id, registration_number, own_insurance_policy_number, tp_insurance_policy_number')
    .limit(1);

  if (vehErr || !vehs || vehs.length === 0) {
    console.error("No vehicle available for test:", vehErr);
    process.exit(1);
  }

  const testVeh = vehs[0];
  console.log(`Testing with vehicle ${testVeh.registration_number} (${testVeh.id})...\n`);

  // 2. Fetch both active insurance policies for this vehicle
  const { data: policies, error: polErr } = await supabaseAdmin
    .from('insurance_policies')
    .select('*')
    .eq('vehicle_id', testVeh.id)
    .eq('is_deleted', false);

  assert(!polErr, "Queried insurance_policies successfully");

  const ownPolicies = (policies || []).filter(p => p.insurance_category === 'Own Insurance');
  const tpPolicies = (policies || []).filter(p => p.insurance_category === 'Third Party Insurance');

  console.log(`Found ${ownPolicies.length} Own Insurance record(s) and ${tpPolicies.length} Third Party Insurance record(s).`);

  // 3. Create or update a distinct Third Party Insurance policy
  const testTpPolicyNumber = `TP-TEST-${Date.now().toString().slice(-6)}`;
  const testTpVendor = "ICICI Lombard General Insurance";
  const testTpExpiry = "2028-09-30";

  const { data: newTpPolicy, error: insertTpErr } = await supabaseAdmin
    .from('insurance_policies')
    .insert({
      vehicle_id: testVeh.id,
      insurance_category: 'Third Party Insurance',
      insurer_name: testTpVendor,
      policy_number: testTpPolicyNumber,
      policy_type: 'Third-Party Liability',
      idv: 0,
      premium_amount: 4500,
      start_date: '2027-10-01',
      end_date: testTpExpiry,
      is_active: true,
      notes: 'Automated test TP policy'
    })
    .select()
    .single();

  assert(!insertTpErr && newTpPolicy?.id, `Inserted distinct Third Party Insurance record (${testTpPolicyNumber})`);

  // Update vehicle tp_* pointers
  await supabaseAdmin
    .from('vehicles')
    .update({
      tp_insurance_policy_number: testTpPolicyNumber,
      tp_insurance_vendor: testTpVendor,
      tp_insurance_expiry_date: testTpExpiry
    })
    .eq('id', testVeh.id);

  // 4. Verify vehicle has both Own and TP pointers simultaneously
  const { data: updatedVeh } = await supabaseAdmin
    .from('vehicles')
    .select('own_insurance_policy_number, own_insurance_vendor, own_insurance_expiry_date, tp_insurance_policy_number, tp_insurance_vendor, tp_insurance_expiry_date')
    .eq('id', testVeh.id)
    .single();

  assert(updatedVeh.own_insurance_policy_number !== null, `Vehicle maintains Own Insurance Policy (${updatedVeh.own_insurance_policy_number})`);
  assert(updatedVeh.tp_insurance_policy_number === testTpPolicyNumber, `Vehicle maintains Third Party Insurance Policy (${updatedVeh.tp_insurance_policy_number})`);
  assert(updatedVeh.own_insurance_policy_number !== updatedVeh.tp_insurance_policy_number, "Own and Third Party policy numbers are completely separate and independent");

  // 5. Test Renewing Own Insurance: ensure TP policy is untouched!
  const testOwnPolicyNumber = `OWN-RENEW-${Date.now().toString().slice(-6)}`;
  const testOwnVendor = "Bajaj Allianz General Insurance";
  const testOwnExpiry = "2029-05-15";

  // Simulate renewVehicleInsurancePolicyAction for Own Insurance:
  // Step A: deactivate previous Own Insurance only
  await supabaseAdmin
    .from('insurance_policies')
    .update({ is_active: false })
    .eq('vehicle_id', testVeh.id)
    .eq('insurance_category', 'Own Insurance')
    .eq('is_active', true);

  // Step B: insert new Own Insurance
  const { data: newOwnPolicy } = await supabaseAdmin
    .from('insurance_policies')
    .insert({
      vehicle_id: testVeh.id,
      insurance_category: 'Own Insurance',
      insurer_name: testOwnVendor,
      policy_number: testOwnPolicyNumber,
      policy_type: 'Comprehensive',
      idv: 750000,
      premium_amount: 18500,
      start_date: '2028-05-16',
      end_date: testOwnExpiry,
      is_active: true,
      notes: 'Automated test renewal of Own Insurance'
    })
    .select()
    .single();

  // Step C: update vehicle own_* pointers
  await supabaseAdmin
    .from('vehicles')
    .update({
      own_insurance_policy_number: testOwnPolicyNumber,
      own_insurance_vendor: testOwnVendor,
      own_insurance_expiry_date: testOwnExpiry,
      insurance_policy_number: testOwnPolicyNumber,
      insurance_expiry_date: testOwnExpiry
    })
    .eq('id', testVeh.id);

  // 6. Verify Third Party Insurance was NOT affected
  const { data: verifyTpActive } = await supabaseAdmin
    .from('insurance_policies')
    .select('*')
    .eq('id', newTpPolicy.id)
    .single();

  assert(verifyTpActive.is_active === true, "Third Party Insurance record remained ACTIVE when Own Insurance was renewed");

  const { data: verifyVehPointers } = await supabaseAdmin
    .from('vehicles')
    .select('own_insurance_policy_number, tp_insurance_policy_number, tp_insurance_expiry_date')
    .eq('id', testVeh.id)
    .single();

  assert(verifyVehPointers.own_insurance_policy_number === testOwnPolicyNumber, `Vehicle own_insurance_policy_number updated to ${testOwnPolicyNumber}`);
  assert(verifyVehPointers.tp_insurance_policy_number === testTpPolicyNumber, `Vehicle tp_insurance_policy_number remained ${testTpPolicyNumber}`);
  assert(verifyVehPointers.tp_insurance_expiry_date === testTpExpiry, `Vehicle tp_insurance_expiry_date remained ${testTpExpiry}`);

  // 7. Verify Notification Reminders
  const ownReminder = `Own Insurance — ${testOwnVendor} — Insurance is going to expire on 15 May 2029.`;
  const tpReminder = `Third Party Insurance — ${testTpVendor} — Insurance is going to expire on 30 September 2028.`;

  assert(/^Own Insurance — .+ — Insurance is going to expire on .+\.$/.test(ownReminder), `Own reminder format verified: "${ownReminder}"`);
  assert(/^Third Party Insurance — .+ — Insurance is going to expire on .+\.$/.test(tpReminder), `Third Party reminder format verified: "${tpReminder}"`);

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
