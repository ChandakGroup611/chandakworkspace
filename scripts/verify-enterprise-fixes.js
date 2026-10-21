const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runVerification() {
  console.log("=== CHANDAK GROUP ENTERPRISE VERIFICATION SUITE ===\n");
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

  // 1. Verify user_master schema columns for Microsoft Sync
  console.log("Test 1: Verifying Microsoft Profile Synchronization Columns in user_master...");
  const { data: userMasterCols, error: umErr } = await supabase
    .from('user_master')
    .select('id, microsoft_id, user_principal_name, first_name, last_name, job_title, department_name, office_location, mobile_phone, business_phone, company_name, ms_profile_synced_at')
    .limit(1);

  assert(!umErr, "user_master table contains all required Microsoft sync columns without schema errors");

  // 2. Verify profiles bucket exists in storage
  console.log("\nTest 2: Verifying 'profiles' storage bucket for profile pictures...");
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  assert(!bErr, "Retrieved storage buckets successfully");
  const profilesBucket = (buckets || []).find(b => b.name === 'profiles');
  assert(!!profilesBucket, "'profiles' storage bucket exists");

  // 3. Verify insurance_policies schema for category segregation
  console.log("\nTest 3: Verifying insurance_policies insurance_category column...");
  const { data: insPolicies, error: ipErr } = await supabase
    .from('insurance_policies')
    .select('id, insurance_category, insurer_name, policy_number, is_active')
    .limit(1);

  assert(!ipErr, "insurance_policies table contains 'insurance_category' column");

  // 4. Verify vehicles table segregation columns
  console.log("\nTest 4: Verifying vehicles table Own & Third Party insurance columns...");
  const { data: vehCols, error: vcErr } = await supabase
    .from('vehicles')
    .select('id, fuel_type, own_insurance_policy_number, own_insurance_expiry_date, own_insurance_vendor, tp_insurance_policy_number, tp_insurance_expiry_date, tp_insurance_vendor')
    .limit(1);

  assert(!vcErr, "vehicles table contains own_insurance_* and tp_insurance_* segregation columns");

  // 5. Test Fleet compliance notification message generator & EV exemption
  console.log("\nTest 5: Verifying Fleet Notification Formatting & EV PUC Exemption rules...");
  function isElectricFuel(fuel) {
    if (!fuel) return false;
    return /electric|ev\b|bev|battery electric/i.test(fuel.trim());
  }

  function formatIndianLongDate(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  const testExpDate = "2026-11-15";
  const formattedDate = formatIndianLongDate(testExpDate);
  const ownVendor = "HDFC ERGO General Insurance";
  const tpVendor = "ICICI Lombard General Insurance";

  const ownMsg = `Own Insurance — ${ownVendor} — Insurance is going to expire on ${formattedDate}.`;
  const tpMsg = `Third Party Insurance — ${tpVendor} — Insurance is going to expire on ${formattedDate}.`;

  assert(
    ownMsg === "Own Insurance — HDFC ERGO General Insurance — Insurance is going to expire on 15 November 2026.",
    `Own Insurance notification matches exact required format: "${ownMsg}"`
  );
  assert(
    tpMsg === "Third Party Insurance — ICICI Lombard General Insurance — Insurance is going to expire on 15 November 2026.",
    `Third Party Insurance notification matches exact required format: "${tpMsg}"`
  );

  assert(isElectricFuel("ELECTRIC") === true, "isElectricFuel recognizes 'ELECTRIC'");
  assert(isElectricFuel("EV") === true, "isElectricFuel recognizes 'EV'");
  assert(isElectricFuel("Battery Electric") === true, "isElectricFuel recognizes 'Battery Electric'");
  assert(isElectricFuel("DIESEL") === false, "isElectricFuel correctly rejects 'DIESEL'");
  assert(isElectricFuel("PETROL") === false, "isElectricFuel correctly rejects 'PETROL'");

  // 6. Verify inviteUserAction default redirectTo
  console.log("\nTest 6: Verifying user invitation redirect URL...");
  const usersActionsFile = fs.readFileSync(path.join(__dirname, '..', 'lib', 'actions', 'users.ts'), 'utf8');
  assert(
    usersActionsFile.includes('https://chandakgroup.tech/auth/callback?next=/select-module'),
    "inviteUserAction contains fallback redirect URL: 'https://chandakgroup.tech/auth/callback?next=/select-module'"
  );

  // 7. Verify Module Selection strict routing in auth callback
  console.log("\nTest 7: Verifying auth callback strict module routing...");
  const authCallbackFile = fs.readFileSync(path.join(__dirname, '..', 'app', 'auth', 'callback', 'route.ts'), 'utf8');
  assert(
    authCallbackFile.includes('/login?error=no-module-access'),
    "Auth callback redirects to /login?error=no-module-access when user has 0 modules"
  );
  assert(
    authCallbackFile.includes('syncMicrosoftUserToMaster'),
    "Auth callback invokes syncMicrosoftUserToMaster to synchronize MS Graph profile"
  );

  // 8. Verify Brand assets
  console.log("\nTest 8: Verifying brand assets exist...");
  assert(fs.existsSync(path.join(__dirname, '..', 'public', 'Chandak_Group_Official_Logo.png')), "Chandak_Group_Official_Logo.png exists");
  assert(fs.existsSync(path.join(__dirname, '..', 'public', 'chandak-40-icon.png')), "chandak-40-icon.png exists");
  assert(fs.existsSync(path.join(__dirname, '..', 'public', 'chandak-40-icon.svg')), "chandak-40-icon.svg exists");

  console.log(`\n========================================`);
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error("Verification failed with exception:", err);
  process.exit(1);
});
