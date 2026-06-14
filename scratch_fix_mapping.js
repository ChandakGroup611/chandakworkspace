const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');

content = content.replace(
  /customFields: d\.custom_fields \|\| \{\},/g,
  'custom_fields: d.custom_fields || {}, customFields: d.custom_fields || {},'
);

content = content.replace(
  /department: d\.department_id \? \{ name: 'Dept' \} : null/g,
  'department: d.department || null'
);

content = content.replace(
  /owner: d\.owner_id \? \{ full_name: 'Owner' \} : null,/g,
  'creator: d.creator || null, owner: d.owner_id ? { full_name: "Owner" } : null,'
);

fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);
