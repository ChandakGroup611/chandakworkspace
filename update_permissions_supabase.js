require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: perms, error: err1 } = await supabase
        .from('permissions')
        .select('*')
        .like('code', 'COMPLIANCE_%');
        
    if (err1) {
        console.error("Error fetching", err1);
        return;
    }
    
    console.log(`Found ${perms.length} permissions to update`);
    
    for (const p of perms) {
        const newCode = p.code.replace('COMPLIANCE_', 'TRASH_');
        const newName = p.name.replace('Compliance', 'Trash Data');
        const { error: err2 } = await supabase
            .from('permissions')
            .update({ 
                code: newCode, 
                name: newName,
                module: 'Trash Data'
            })
            .eq('id', p.id);
            
        if (err2) {
            console.error(`Failed to update ${p.code}:`, err2);
        } else {
            console.log(`Updated ${p.code} to ${newCode}`);
        }
    }
    
    // Also let's check for any existing TRASH_ permissions to make sure their module are correct
    const { data: trashPerms, error: err3 } = await supabase
        .from('permissions')
        .select('*')
        .like('code', 'TRASH_%');
        
    for (const p of (trashPerms || [])) {
        await supabase
            .from('permissions')
            .update({ 
                module: 'Trash Data'
            })
            .eq('id', p.id);
    }
    console.log('Cleanup complete');
}
main();
