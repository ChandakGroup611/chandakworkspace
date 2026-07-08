require('dotenv').config({path: '.env.local'}); 
const { createClient } = require('@supabase/supabase-js'); 
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); 
async function run() { 
  const { data, error } = await supabase.from('software_amc').insert([{software_name: 'test', provider_name: 'test', contract_type: 'AMC'}]).select(); 
  if (error) {
    console.log("ERROR:", error);
  } else {
    console.log("SUCCESS:", data);
  }
} 
run();
