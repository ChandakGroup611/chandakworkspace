const fs = require('fs');
let code = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');

// 1. Remove imports
code = code.replace(/import TemplateManager from "@\/components\/tasks\/TemplateManager";\n/, '');

// 2. Remove state
code = code.replace(/\s*const \[templateId, setTemplateId\] = useState\(""\);/, '');
code = code.replace(/\s*const \[templates, setTemplates\] = useState\<any\[\]\>\(\[\]\);/, '');
code = code.replace(/\s*const \[isTemplateManagerOpen, setIsTemplateManagerOpen\] = useState\(false\);/, '');

// 3. Remove from Promise.all
code = code.replace(/, templateList/, '');
code = code.replace(/,\s*m\.fetchTaskTemplates\(workspaceId\)/, '');
code = code.replace(/\s*setTemplates\(templateList\);/, '');

// 4. Remove useEffect
code = code.replace(/\s*\/\/ Handle Template Selection[\s\S]*?\}, \[templateId, templates\]\);/, '');

// 5. Remove from payload
code = code.replace(/template_id: templateId \|\| null,/, 'template_id: null,');

// 6. Remove Modal
code = code.replace(/\s*\{isTemplateManagerOpen && \([\s\S]*?\<TemplateManager[\s\S]*?\/\>\s*\)\}/, '');

// 7. Remove UI
code = code.replace(/\s*<div className="flex items-center gap-2">\s*<select[\s\S]*?<option value="">-- Apply a Task Template --<\/option>[\s\S]*?<\/select>[\s\S]*?Manage Templates\s*<\/AppButton>\s*<\/div>/, '');

fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', code);
console.log('Removed template functionality');
