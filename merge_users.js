const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const oldCode = 'USR-8594';
    const newCode = 'USR-848040';

    const { data: users, error } = await supabase
        .from('user_master')
        .select('id, user_code')
        .in('user_code', [oldCode, newCode]);

    if (error) throw error;
    
    const oldUser = users.find(u => u.user_code === oldCode);
    const newUser = users.find(u => u.user_code === newCode);

    if (!oldUser || !newUser) {
        console.error('Missing one or both users');
        return;
    }

    console.log(`Transferring from ${oldUser.id} to ${newUser.id}`);

    // Let's update known assignment tables
    const updates = [
        { table: 'task_assignees', column: 'user_id' },
        { table: 'task_watchers', column: 'user_id' },
        { table: 'task_participants', column: 'user_id' },
        { table: 'team_members', column: 'user_id' },
        { table: 'workspace_members', column: 'user_id' },
        { table: 'sub_workspace_members', column: 'user_id' },
        { table: 'user_dashboard_preferences', column: 'user_id' },
        { table: 'tasks', column: 'created_by' }
    ];

    for (const u of updates) {
        console.log(`Updating ${u.table}...`);
        const { error: updErr } = await supabase
            .from(u.table)
            .update({ [u.column]: newUser.id })
            .eq(u.column, oldUser.id);
            
        if (updErr) {
            console.warn(`Could not update ${u.table}:`, updErr.message);
        } else {
            console.log(`Successfully updated ${u.table}`);
        }
    }

    // Finally deactivate the old user
    const { error: deactErr } = await supabase
        .from('user_master')
        .update({ is_active: false, is_deleted: true, delete_reason: 'Merged with USR-848040' })
        .eq('id', oldUser.id);

    if (deactErr) {
        console.error('Error deactivating old user:', deactErr);
    } else {
        console.log('Successfully deactivated USR-8594');
    }
}

run();
