require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const code = fs.readFileSync('d:\\adios\\app\\api\\seed-iam\\route.ts', 'utf8');
const match = code.match(/const PERMS_TO_SEED: any\[\] = (\[[\s\S]*?\]);/);
if (match) {
  const perms = eval(match[1]);
  (async () => {
    try {
      console.log('Inserting permissions...');
      const res = await supabase.from('permissions').upsert(perms, { onConflict: 'code' });
      if (res.error) console.error('Error inserting perms:', res.error);
      else console.log('Successfully inserted permissions!');
      
      const res2 = await supabase.from('permissions').update({ action: 'VIEW' }).eq('code', 'AUDIT_READ');
      if (res2.error) console.error('Error updating AUDIT_READ:', res2.error);
      else console.log('Successfully updated AUDIT_READ!');
    } catch (e) {
      console.error(e);
    }
  })();
} else {
  console.log('No match found');
}
