const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    // get a user that has a manager
    const { data: users, error: findError } = await supabase
        .from("user_master")
        .select("id, manager_id")
        .not("manager_id", "is", null)
        .limit(1);

    if (findError || !users || users.length === 0) {
        console.log("No users with a manager found.");
        return;
    }

    const testUser = users[0];
    console.log("Testing with user:", testUser);

    const { data, error } = await supabase
        .from("user_master")
        .select(`
          *,
          manager:manager_id(full_name)
        `)
        .eq("id", testUser.id)
        .single();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success! Manager Data:", data.manager);
    }
}

testQuery();
