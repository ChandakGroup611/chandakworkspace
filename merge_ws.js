const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const oldUserId = '78f24070-0437-4766-b2b9-8440a3d1c4e8';
    const newUserId = 'd1b0c396-eeb2-4567-a6bd-cb04adb8327a';

    const { data: mems } = await supabase.from('workspace_members').select('*').eq('user_id', oldUserId);
    if (!mems || mems.length === 0) {
        console.log("No old memberships found");
        return;
    }
    console.log("Old memberships:", mems.length);

    // Let's first fetch all workspaces to know which is root
    const { data: wss } = await supabase.from('workspaces').select('id, parent_workspace_id');
    
    // Sort mems so root workspaces (parent = null) come first
    mems.sort((a, b) => {
        const wa = wss.find(w => w.id === a.workspace_id);
        const wb = wss.find(w => w.id === b.workspace_id);
        if (!wa?.parent_workspace_id && wb?.parent_workspace_id) return -1;
        if (wa?.parent_workspace_id && !wb?.parent_workspace_id) return 1;
        return 0;
    });

    for (const m of mems) {
        console.log("Inserting membership for workspace:", m.workspace_id);
        const { error } = await supabase.from('workspace_members').insert({
            user_id: newUserId,
            workspace_id: m.workspace_id,
            role_id: m.role_id,
            status: m.status
        });
        if (error) console.error("Error inserting:", error.message);
        else console.log("Success.");
    }
}
run();
