const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((a, l) => {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (m) a[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  return a;
}, {});

async function main() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL.replace('https', 'postgres').replace('.supabase.co', '') + ':6543/postgres';
  // We can't connect to postgres directly easily without pg module, and we don't have password.
  // We can just use REST query if there is a way, or since we can't, let's use supabase CLI!
  // Wait, I can just write an sql file and run it through supabase db query if the CLI works? But the CLI didn't work.
  // Wait, supabase-js might return the error with the trigger name! Let's run test-error.js!
}
main();
