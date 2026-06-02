const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('workspaces').select('id, owner:user_master!workspaces_workspace_owner_id_fkey(full_name)').limit(1).then(r => console.log('Rel check:', JSON.stringify(r.error || r.data)));
