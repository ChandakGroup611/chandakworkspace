const fs = require('fs'); 
const dir = 'd:/adios/app/api/seed-iam'; 
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); 
const sql = fs.readFileSync('d:/adios/supabase/migrations/20260614000000_add_missing_permissions.sql', 'utf8'); 
const valuesMatches = [...sql.matchAll(/\('(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)', '(.*?)'\)/g)]; 
const perms = valuesMatches.map(m => ({ 
  id: m[1], 
  code: m[2], 
  name: m[3].replace(/''/g, '\''), 
  module: m[4], 
  submodule: m[5], 
  action: m[6], 
  resource_type: m[7] 
})); 
const routeCode = `import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const PERMS_TO_SEED = ${JSON.stringify(perms, null, 2)};

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.from("permissions").upsert(PERMS_TO_SEED, { onConflict: "code" });
  const { error: updateError } = await supabase.from("permissions").update({ action: "VIEW" }).eq("code", "AUDIT_READ");

  if (error) {
    return NextResponse.json({ success: false, error: error.message });
  }

  return NextResponse.json({ success: true, message: "Seeded " + PERMS_TO_SEED.length + " IAM permissions successfully.", updateError });
}
`; 
fs.writeFileSync(dir + '/route.ts', routeCode); 
console.log('Created route.ts');
