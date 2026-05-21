import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
    const { data, error } = await supabase.from('workspaces').select('id, name, owner_id').limit(5);
    console.log("Service Key Data:", data);
    console.log("Service Key Error:", error);
}

check();
