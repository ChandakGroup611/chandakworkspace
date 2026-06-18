const fs = require('fs');
const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/department_id: departmentId \|\| null,\s*department_id: departmentId \|\| null,/g, "department_id: departmentId || null,");

fs.writeFileSync(path, content);
