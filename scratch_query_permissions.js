const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env.local");
let envContent = "";
try {
  envContent = fs.readFileSync(envPath, "utf-8");
} catch (e) {
  console.log(".env.local not found");
  process.exit(1);
}

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.log("Missing credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim(), { auth: { persistSession: false } });

async function check() {
  const { data, error } = await supabase
    .from("permissions")
    .select("code, module, submodule, action")
    .in("code", ["USER_VIEW", "USER_CREATE", "USER_UPDATE", "USER_DELETE", "USER_MANAGE", "IAM_ADMIN_VIEW", "IAM_ADMIN_CREATE", "IAM_ADMIN_UPDATE", "IAM_ADMIN_DELETE", "IAM_ADMIN", "AUDIT_READ", "AUDIT_VIEW", "AUDIT_CREATE", "AUDIT_UPDATE", "AUDIT_DELETE", "AUDIT_MANAGE"])
    .order('module');
    
  if (error) {
    console.error("Error:", error);
  } else {
    console.table(data);
  }
}
check();
