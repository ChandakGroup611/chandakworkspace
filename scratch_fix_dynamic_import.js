const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');

if (!content.includes('import { fetchRequirements }')) {
  content = content.replace('import { usePermissions } from "@/hooks/usePermissions";', 'import { usePermissions } from "@/hooks/usePermissions";\nimport { fetchRequirements } from "@/lib/actions/requirements";');
}

content = content.replace(/const m = await import\("@\/lib\/actions\/requirements"\);\s*const data = await m\.fetchRequirements\(wsId\);/g, 'const data = await fetchRequirements(wsId);');

fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);
