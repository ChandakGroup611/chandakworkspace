import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  console.log("Auth Users:", usersData?.users?.length, usersErr);
  if (usersData?.users?.length) {
    console.log(usersData.users.map(u => ({ id: u.id, email: u.email, user_metadata: u.user_metadata })));
  }

  const { data: profiles, error: profErr } = await supabase.from("profiles").select("*");
  console.log("Profiles:", profiles?.length, profErr?.message);
  if (profiles?.length) {
    console.log(profiles);
  }

  const { data: users, error: profErr2 } = await supabase.from("users").select("*");
  console.log("Users table:", users?.length, profErr2?.message);
  if (users?.length) {
    console.log(users);
  }

  const { data: um, error: umErr } = await supabase.from("user_master").select("*");
  console.log("User Master:", um?.length, umErr?.message);
  if (um?.length) console.log(um.map(u => ({ id: u.id, name: u.full_name })));

  const { data: tasks } = await supabase.from("tasks").select("created_by").limit(3);
  console.log("Tasks created_by:", tasks);
}
run();
