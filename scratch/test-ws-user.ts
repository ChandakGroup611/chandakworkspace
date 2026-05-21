import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
    // 1. Get a user
    const { data: users, error: uErr } = await supabase.from('user_master').select('id, email').limit(2);
    if (uErr) {
        console.error("Failed to fetch users", uErr);
        return;
    }
    console.log("Users:", users);

    // 2. Generate a JWT for this user or impersonate them
    // Actually we can use the `supabase.auth.signInWithPassword` but we might not know the password.
    // Instead we can use an RPC or just raw sql via rpc to test.
    // Let's create an rpc to test.
}

check();
