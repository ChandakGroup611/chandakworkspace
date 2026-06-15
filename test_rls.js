const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://tkovzymkubxtpcgynkgd.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // need to get anon key

async function run() {
  console.log("Needs valid client initialization");
}
run().catch(console.error);
