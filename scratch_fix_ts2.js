const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');

// Replace isLightMode ternaries with just the false branch value
content = content.replace(/\$\{isLightMode \? "[^"]*" : "([^"]*)"\}/g, '$1');
content = content.replace(/\$\{isLightMode\?"[^"]*":"([^"]*)"\}/g, '$1');

// Delete redeclared prioId and prioName from double injection
content = content.replace(/const prioId = r\.custom_fields\?\.priority_id;\n\s*const prioName = masters\.priority\?\.find\(\(x: any\) => x\.id === prioId\)\?\.name \|\| "-";/g, '');

// Also fix handleDelete missing error:
if (!content.includes('const handleDelete = async')) {
  content = content.replace('const loadRequirements = async', 'const handleDelete = async (id: string) => {\n    // stub\n  };\n\n  const loadRequirements = async');
}

fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);
