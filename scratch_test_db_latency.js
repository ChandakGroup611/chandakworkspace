import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjczjbnnyfexzvxzcjqc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("Pinging DB 5 times sequentially to measure roundtrip latency...");
  let totalTime = 0;
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    await supabaseAdmin.from('status_master').select('id').limit(1);
    const time = performance.now() - start;
    console.log(`Ping ${i + 1}: ${time.toFixed(2)}ms`);
    totalTime += time;
  }
  console.log(`Average Ping: ${(totalTime / 5).toFixed(2)}ms`);
}

run().catch(console.error);
