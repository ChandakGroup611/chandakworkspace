import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  console.log("Fetching all tasks...");
  let query = supabase
    .from("tasks")
    .select("id, subject, workspace_id, is_deleted")
    .eq("is_deleted", false);
    
  const { data, error } = await query.limit(5);
  console.log("Tasks error:", error);
  console.log("Tasks data:", data?.length);

  // Fetch workspaces
  const { data: ws, error: wError } = await supabase.from("workspaces").select("id").limit(10);
  const visibleWsIds = ws?.map(w => w.id) || [];
  
  if (visibleWsIds.length > 0) {
    let q2 = supabase.from("tasks").select("id, subject").eq("is_deleted", false);
    q2 = q2.or(`workspace_id.in.(${visibleWsIds.join(',')})`);
    const { data: d2, error: e2 } = await q2.limit(5);
    console.log("With OR error:", e2);
    console.log("With OR data:", d2?.length);
  }
}
testFetch();
