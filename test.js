import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: usersData, error: usersErr } = await supabase.from("users").select("*");
  console.log("Users:", usersData?.length, usersErr);
  
  const { data: profiles, error: profErr } = await supabase.from("profiles").select("*");
  console.log("Profiles:", profiles?.length, profErr);

  const { data: um, error: umErr } = await supabase.from("user_master").select("*");
  console.log("User Master:", um?.length, umErr);
  if (um?.length) console.log(um[0]);

  const { data: tasks } = await supabase.from("tasks").select("created_by").limit(1);
  console.log("Task created_by:", tasks);
}
run();
