const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix Promise.all variable names and API calls
const oldPromiseArray = `const [fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, templateList] = await Promise.all([
        fetchCustomFields(workspaceId),
        fetchPriorities('e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'),
        fetchTasksByWorkspace(workspaceId),
        fetchStatusesByScope('TASK', 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'),
        m.fetchWorkspaceStakeholders(workspaceId),
        m.fetchSprints(workspaceId),
        m.fetchTaskTemplates(workspaceId)
      ]);`;

const newPromiseArray = `const [fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, departmentList] = await Promise.all([
        fetchCustomFields(workspaceId),
        fetchPriorities('e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'),
        fetchTasksByWorkspace(workspaceId),
        fetchStatusesByScope('TASK', 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'),
        m.fetchWorkspaceStakeholders(workspaceId),
        m.fetchSprints(workspaceId),
        getDepartments()
      ]);`;

// Just to be safe, I'll use regex if the exact string fails
content = content.replace(/const \[fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, templateList\] = await Promise\.all\(\[\s+fetchCustomFields\(workspaceId\),\s+fetchPriorities\('e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'\),\s+fetchTasksByWorkspace\(workspaceId\),\s+fetchStatusesByScope\('TASK', 'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3'\),\s+m\.fetchWorkspaceStakeholders\(workspaceId\),\s+m\.fetchSprints\(workspaceId\),\s+m\.fetchTaskTemplates\(workspaceId\)\s+\]\);/g, newPromiseArray);

// 2. Remove the templateEffect that failed to be removed
content = content.replace(/\/\/ Handle Template Selection[\s\S]*?\}, \[templateId, templates\]\);/g, '');

// Wait, I see "components/tasks/TaskCreationWizard.tsx(174,24): error TS2304: Cannot find name 'departmentId'."
// Why is departmentId not found? Let's check lines 40-60 of the file.
// Line 50 is:
//   const [templateId, setTemplateId] = useState("");
//   const [templates, setTemplates] = useState<any[]>([]);
//   const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
// My previous script DID NOT REPLACE THIS either! Because of exact string matching.
content = content.replace(/const \[templateId, setTemplateId\] = useState\(""\);\s*const \[templates, setTemplates\] = useState<any\[\]>\(\[\]\);\s*const \[isTemplateManagerOpen, setIsTemplateManagerOpen\] = useState\(false\);/g, 'const [departmentId, setDepartmentId] = useState("");\n  const [departments, setDepartments] = useState<any[]>([]);');

fs.writeFileSync(path, content);
console.log('Fixed typescript errors');
