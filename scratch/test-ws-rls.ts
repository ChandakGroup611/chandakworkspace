import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, serviceKey);
const supabase = createClient(supabaseUrl, anonKey);

async function testRls() {
    // 1. Create a dummy user
    const email = `testuser_${Date.now()}@example.com`;
    const password = "Password123!";
    
    console.log("Creating user:", email);
    const { data: user, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });
    
    if (createErr) {
        console.error("Failed to create user:", createErr);
        return;
    }
    
    // 2. Sign in with the dummy user
    const { data: sessionData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (signInErr) {
        console.error("Failed to sign in:", signInErr);
        return;
    }
    
    console.log("Signed in successfully. Fetching workspaces...");
    
    // 3. Fetch workspaces using RLS
    const { data: workspaces, error: wsErr } = await supabase.from('workspaces').select('id, name').limit(5);
    
    if (wsErr) {
        console.error("Error fetching workspaces (RLS):", wsErr);
    } else {
        console.log("Workspaces (RLS):", workspaces);
    }
    
    // 4. Clean up
    console.log("Cleaning up user...");
    await supabaseAdmin.auth.admin.deleteUser(user.user.id);
}

testRls();
