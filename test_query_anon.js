const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    // 1. Sign in as test user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'test_admin@chandakgroup.com', // or the SSO user email if we know it
        password: 'fakepass' // we created this user in test_as_admin, wait, that was deleted!
    });
    
    // Let's just create a temporary user to test RLS
    const serviceClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const tempEmail = 'test_rls_' + Date.now() + '@chandakgroup.com';
    await serviceClient.auth.admin.createUser({
        email: tempEmail,
        password: 'password123',
        email_confirm: true
    });
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password: 'password123'
    });
    
    if (signInError) {
        console.error("Sign in failed:", signInError);
        return;
    }

    const { data, error } = await supabase
        .from("user_master")
        .select(`
          *,
          department:departments!fk_user_master_department(name),
          designation:designations!fk_user_master_designation(name),
          role:roles!fk_user_master_role(name),
          manager:manager_id(full_name)
        `)
        .eq("id", signInData.user.id)
        .single();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success! Data:", data);
    }
    
    // Cleanup
    await serviceClient.auth.admin.deleteUser(signInData.user.id);
}

testQuery();
