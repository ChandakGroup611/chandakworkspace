const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('workspace_members').select('*').eq('user_id', 'd1b0c396-eeb2-4567-a6bd-cb04adb8327a');
    console.log("New user workspace memberships:", data);
}
check();
