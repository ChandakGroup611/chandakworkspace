const fs = require('fs');
const path = require('path');

const helperCode = `
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function checkServerPermission(permissionCode: string): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  return await hasPermission(user.id, permissionCode);
}
`;

// Append helper to lib/permissions/index.ts if it doesn't exist
const permFile = 'd:\\adios\\lib\\permissions\\index.ts';
let permCode = fs.readFileSync(permFile, 'utf8');
if (!permCode.includes('checkServerPermission')) {
  fs.writeFileSync(permFile, permCode + '\n' + helperCode);
  console.log('Added checkServerPermission to lib/permissions/index.ts');
}

const targets = [
  { path: 'app/requirements/reports/page.tsx', perm: 'REQUIREMENTS_REPORTS_VIEW' },
  { path: 'app/workspaces/tasks/page.tsx', perm: 'TASKS_VIEW' },
  { path: 'app/workspaces/transfer-tasks/page.tsx', perm: 'TASKS_TRANSFER_VIEW' },
  { path: 'app/migration/page.tsx', perm: 'DATA_MIGRATION_VIEW' },
  { path: 'app/settings/identity/page.tsx', perm: 'SETTINGS_IDENTITY_VIEW' },
  { path: 'app/settings/notifications/page.tsx', perm: 'SETTINGS_NOTIFICATIONS_VIEW' }
];

targets.forEach(t => {
  const fullPath = path.join('d:\\adios', t.path);
  if (fs.existsSync(fullPath)) {
    let code = fs.readFileSync(fullPath, 'utf8');
    if (!code.includes('checkServerPermission')) {
      const funcRegex = /export\s+default\s+(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/;
      const match = funcRegex.exec(code);
      
      if (match) {
        const importStmt = 'import { checkServerPermission } from "@/lib/permissions";\n';
        code = importStmt + code;
        
        const injection = `
  const canAccess = await checkServerPermission("${t.perm}");
  if (!canAccess) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center p-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
          <p className="text-gray-500">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }
`;
        const modifiedCode = code.replace(funcRegex, (fullMatch) => {
           return fullMatch + injection;
        });
        
        fs.writeFileSync(fullPath, modifiedCode);
        console.log("Patched " + t.path);
      }
    } else {
      console.log("Already patched " + t.path);
    }
  }
});
