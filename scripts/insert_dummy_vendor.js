require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertDummy() {
  const dummyVendor = {
    name: "Acme Software Corp",
    contact_name: "John Doe",
    contact_email: "john.doe@acmesoftware.com",
    phone: "9876543210",
    website: "https://acmesoftware.com",
    address_line1: "123 Tech Park",
    address_line2: "Sector 5",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    tax_gstin: "27AAAAA0000A1Z5",
    tax_pan: "ABCDE1234F",
    tax_code: "MSME-123",
    bank_name: "HDFC Bank",
    bank_account_name: "Acme Software Corp",
    bank_account_number: "50100234567890",
    bank_ifsc: "HDFC0001234"
  };

  console.log("Inserting dummy vendor...");
  const { data, error } = await supabase.from('vendor_master').insert([dummyVendor]).select();
  
  if (error) {
    console.error("Error inserting vendor:", error);
  } else {
    console.log("Successfully inserted vendor:", data);
  }
}

insertDummy();
