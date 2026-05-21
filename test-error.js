const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((a, l) => {
  const m = l.match(/^([^=]+)=(.*)$/);
  if (m) a[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  return a;
}, {});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await supabase.from('user_master').update({}).eq('id', '00000000-0000-0000-0000-000000000000');
  console.log(error);
})();
