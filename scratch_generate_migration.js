const fs = require('fs');
const code = fs.readFileSync('d:\\adios\\app\\api\\seed-iam\\route.ts', 'utf8');
const match = code.match(/const PERMS_TO_SEED: any\[\] = (\[[\s\S]*?\]);/);
if (match) {
  const perms = eval(match[1]);
  let sql = 'INSERT INTO public.permissions (id, code, name, module, submodule, action, resource_type) VALUES\n';
  const values = perms.map(p => {
    return `  ('${p.id}', '${p.code}', '${p.name}', ${p.module ? "'" + p.module + "'" : 'NULL'}, ${p.submodule ? "'" + p.submodule + "'" : 'NULL'}, '${p.action}', '${p.resource_type}')`;
  });
  sql += values.join(',\n') + '\nON CONFLICT (code) DO UPDATE SET\n  name = EXCLUDED.name,\n  module = EXCLUDED.module,\n  submodule = EXCLUDED.submodule,\n  action = EXCLUDED.action,\n  resource_type = EXCLUDED.resource_type;';
  fs.writeFileSync('d:\\adios\\supabase\\migrations\\20260614000000_add_missing_permissions.sql', sql);
  console.log('Fixed migration file.');
} else {
  console.log('Could not parse PERMS_TO_SEED');
}
