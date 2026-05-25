import { supabaseAdmin } from './lib/supabase/service_role';

async function run() {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_master")
      .select("id, full_name, user_code, profile_photo, designation:designations(name), department:departments(name)")
      .limit(1);
    console.log("Data:", data);
    console.log("Error:", error);
  } catch (err) {
    console.error("Exception:", err);
  }
}
run();
