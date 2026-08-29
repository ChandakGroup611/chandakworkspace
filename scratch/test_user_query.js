import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const userIdentifier = "Avinash Pise";
  
  let targetUserQuery = supabase
      .from("user_master")
      .select(`
        id, full_name, email, user_code, is_active,
        department:departments(department_name),
        designation:designations(designation_name),
        role:roles(role_name, code)
      `);
      
  targetUserQuery = targetUserQuery.ilike("full_name", userIdentifier.trim());
  const { data: targetUserData, error: userError } = await targetUserQuery.maybeSingle();
  console.log("maybeSingle:", {targetUserData, userError});
  
  if (userError || !targetUserData) {
    const { data: fallbackUsers, error: fallbackError } = await supabase
      .from("user_master")
      .select(`
        id, full_name, email, user_code, is_active,
        department:departments(department_name),
        designation:designations(designation_name),
        role:roles(role_name, code)
      `)
      .ilike("full_name", `%${userIdentifier.trim()}%`)
      .limit(1);
    console.log("fallback:", {fallbackUsers, fallbackError});
  }
}
run();
