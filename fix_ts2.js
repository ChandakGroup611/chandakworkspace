const fs = require('fs');
const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove duplicate states
content = content.replace(/const \[departmentId, setDepartmentId\] = useState\(""\);\n\s*const \[departments, setDepartments\] = useState<any\[\]>\(\[\]\);\n/g, "");
// Add it back exactly once
content = content.replace(/const \[title, setTitle\] = useState/, `const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [title, setTitle] = useState`);

// 2. Fix departmentList issue
content = content.replace(/setDepartments\(departmentList \|\| \[\]\);/g, "setDepartments(deptList || []);");
content = content.replace(/setDepartments\(deptList \|\| \[\]\);/g, "setDepartments(deptList || []);");

// 3. Remove TemplateManager component totally
content = content.replace(/\{isTemplateManagerOpen && \([\s\S]*?<\/>\s*\)\}/g, "");
content = content.replace(/\{isTemplateManagerOpen && \([\s\S]*?\}\s*\/>\s*\)\}/g, "");

// 4. Duplicate properties in object literal
content = content.replace(/department_id: departmentId \|\| null,\s*department_id: departmentId \|\| null,/g, "department_id: departmentId || null,");

fs.writeFileSync(path, content);
