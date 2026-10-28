require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("=== VEHICLE DOCUMENT VAULT DELETION VERIFICATION ===");

  // 1. Get a test vehicle
  const { data: vehicles, error: vehErr } = await supabaseAdmin
    .from("vehicles")
    .select("id, registration_number")
    .limit(1);

  if (vehErr || !vehicles || vehicles.length === 0) {
    console.error("[FAIL] Could not query a test vehicle:", vehErr);
    process.exit(1);
  }

  const testVeh = vehicles[0];
  console.log(`[PASS] Using vehicle ${testVeh.registration_number} (ID: ${testVeh.id})`);

  // 2. Insert test document
  const testDocId = `test-vdoc-${Date.now()}`;
  const testPayload = {
    vehicle_id: testVeh.id,
    doc_type: "OTHER",
    title: "Automated Test Verification Document",
    file_name: "test_verification_doc.pdf",
    file_size: "15 KB",
    file_url: "https://example.com/test_doc.pdf",
    status: "VALID"
  };

  const { data: insertedDoc, error: insertErr } = await supabaseAdmin
    .from("vehicle_documents")
    .insert([testPayload])
    .select()
    .single();

  if (insertErr || !insertedDoc) {
    console.error("[FAIL] Could not insert test document:", insertErr);
    process.exit(1);
  }
  console.log(`[PASS] Successfully created document record in vehicle_documents (ID: ${insertedDoc.id})`);

  // 3. Verify it is queryable
  const { data: foundDoc, error: findErr } = await supabaseAdmin
    .from("vehicle_documents")
    .select("id, title, vehicle_id")
    .eq("id", insertedDoc.id)
    .single();

  if (findErr || !foundDoc || foundDoc.id !== insertedDoc.id) {
    console.error("[FAIL] Could not verify inserted document:", findErr);
    process.exit(1);
  }
  console.log(`[PASS] Verified document exists in vault for vehicle ${foundDoc.vehicle_id}`);

  // 4. Delete the document
  const { error: delErr } = await supabaseAdmin
    .from("vehicle_documents")
    .delete()
    .eq("id", insertedDoc.id);

  if (delErr) {
    console.error("[FAIL] Failed to delete document from vehicle_documents:", delErr);
    process.exit(1);
  }
  console.log(`[PASS] Executed deletion query for document ID ${insertedDoc.id}`);

  // 5. Verify it is permanently removed
  const { data: postDeleteDoc, error: postDelErr } = await supabaseAdmin
    .from("vehicle_documents")
    .select("id")
    .eq("id", insertedDoc.id)
    .maybeSingle();

  if (postDeleteDoc) {
    console.error("[FAIL] Document still exists in database after deletion!");
    process.exit(1);
  }
  console.log("[PASS] Confirmed document is completely deleted from vehicle_documents vault.");

  console.log("\n=== ALL 5 DOCUMENT DELETION TESTS PASSED SUCCESSFULLY ===");
}

runTest().catch((err) => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
