import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const userIdentifier = "Avinash Pise";
  let targetUserQuery = supabaseAdmin
      .from("user_master")
      .select(`
        id, full_name, email, user_code, is_active,
        department:departments(name),
        designation:designations!fk_user_master_designation(name),
        role:roles(name, code)
      `);
      
  targetUserQuery = targetUserQuery.ilike("full_name", userIdentifier.trim()).eq("is_deleted", false);

  const { data: targetUserData, error: userError } = await targetUserQuery.maybeSingle();
  console.log("maybeSingle data:", targetUserData);
  console.log("maybeSingle error:", userError);
  
  if (userError || !targetUserData) {
      const { data: fallbackUsers, error: fallbackError } = await supabaseAdmin
        .from("user_master")
        .select(`
          id, full_name, email, user_code, is_active,
        department:departments(name),
        designation:designations!fk_user_master_designation(name),
        role:roles(name, code)
        `)
        .ilike("full_name", `%${userIdentifier.trim()}%`)
        .eq("is_deleted", false)
        .limit(1);

      console.log("fallback data:", fallbackUsers);
      console.log("fallback error:", fallbackError);
  }
}

run();
