const { execSync } = require('child_process');
const fs = require('fs');

console.log('1. Recreating table');
execSync('node d:/adios/scratch_recreate_table.js', { stdio: 'inherit' });

console.log('2. Replacing table columns');
execSync('node d:/adios/scratch_replace_table.js', { stdio: 'inherit' });

console.log('3. Fixing imports');
execSync('node d:/adios/scratch_fix_imports.js', { stdio: 'inherit' });

console.log('4. Removing RequirementDraftModal');
let content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');
content = content.replace(/<RequirementDraftModal[\s\S]*?\/>/g, '');
fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);

console.log('5. Removing empty JSX');
content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');
content = content.replace(/\{isCreating && activeWorkspaceId && \(\s*\)\}/, '');
fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);

console.log('6. Fixing dynamic import');
execSync('node d:/adios/scratch_fix_dynamic_import.js', { stdio: 'inherit' });

console.log('7. Fixing TS/variables');
execSync('node d:/adios/scratch_fix_all.js', { stdio: 'inherit' });

console.log('8. Fixing loadRequirements condition');
content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');
content = content.replace(/if \(wsId\) \{\s*setActiveWorkspaceId\(wsId\);\s*loadRequirements\(wsId\);\s*\}/g, 'if (wsId) {\n        setActiveWorkspaceId(wsId);\n      }\n      loadRequirements(wsId || "");');
fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);

console.log('All done!');
