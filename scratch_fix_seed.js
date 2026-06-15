const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function run() {
  const { data: perms } = await supabase.from('permissions').select('*');
  const missing = [];
  perms.forEach(p => {
    const actions = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'MANAGE'];
    if (actions.includes(p.action)) {
      missing.push({
        id: p.id,
        code: p.code,
        name: p.name,
        module: p.module,
        submodule: p.submodule || null,
        action: p.action,
        resource_type: 'PAGE'
      });
    }
  });

  const routeCode = `import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const PERMS_TO_SEED: any[] = ${JSON.stringify(missing, null, 2)};

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

  fs.writeFileSync('app/api/seed-iam/route.ts', routeCode);
  console.log('Fixed route.ts');
}
run();
