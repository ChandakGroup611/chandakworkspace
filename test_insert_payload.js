require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const payload = {
  software_name: "Salesforce CRM",
  provider_name: "Salesforce",
  contract_type: "Subscription",
  purchase_date: null,
  expiry_date: null,
  put_to_use_date: null,
  renewal_period_type: null,
  cost: 1500,
  assigned_to: null,
  department_id: null,
  status: "Active",
  po_number: null,
  po_date: null,
  industry_type: "IT Software",
  vendor_type: "OEM (Original Equipment Manufacturer)",
  msme_number: null,
  specifications: null,
  notes: "",
  solution_line_items: [],
  vendor_contact_json: { name: "", email: "", phone: "" },
  taxation_json: { gstNumber: "", panNumber: "" },
  bank_details_json: { bankName: "SBI", accountNo: "12345", ifsc: "SBIN", branchName: "Main", state: "Delhi", city: "New Delhi" },
  vendor_address_json: { line1: "", line2: "", city: "New Delhi", state: "Delhi", pincode: "" }
};

async function run() {
  const { data, error } = await supabase.from('software_amc').insert([payload]).select().single();
  if (error) {
    console.error("FAILED", error);
  } else {
    console.log("SUCCESS", data.id);
  }
}
run();
