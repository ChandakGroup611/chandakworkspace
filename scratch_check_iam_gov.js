const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env.local");
let envContent = "";
try {
  envContent = fs.readFileSync(envPath, "utf-8");
} catch (e) {
  process.exit(1);
}
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim(), { auth: { persistSession: false } });

async function check() {
  const { data } = await supabase
    .from("permissions")
    .select("code, module, submodule, action")
    .or("module.eq.governance,module.eq.IAM")
    .order('code');
  console.table(data);
}
check();
