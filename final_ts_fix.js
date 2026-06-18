const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix departmentId duplicate
content = content.replace(/const \[departmentId, setDepartmentId\] = useState\(""\);\n\s*const \[departments, setDepartments\] = useState<any\[\]>\(\[\]\);\n/g, "");
content = content.replace(/const \[title, setTitle\] = useState/, `const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [title, setTitle] = useState`);

// Fix deptList
content = content.replace(/setDepartments\(departmentList \|\| \[\]\);/g, "setDepartments(deptList || []);");

// Fix duplicate department_id in payload
content = content.replace(/department_id: departmentId \|\| null,\s*department_id: departmentId \|\| null,/g, "department_id: departmentId || null,");

fs.writeFileSync(path, content);
console.log("Syntax fixes applied");
