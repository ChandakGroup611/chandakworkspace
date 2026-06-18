const fs = require('fs');
let code = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');

// 1. Imports
code = code.replace(
  'import { fetchCustomFields, createCustomField } from "@/lib/actions/tasks";',
  'import { fetchCustomFields, createCustomField, getDepartments } from "@/lib/actions/tasks";'
);

// 2. Add Department state
code = code.replace(/const \[priorityId, setPriorityId\] = useState\(""\);/, 'const [priorityId, setPriorityId] = useState("");\n  const [departmentId, setDepartmentId] = useState("");');
code = code.replace(/const \[priorities, setPriorities\] = useState<any\[\]>\(\[\]\);/, 'const [priorities, setPriorities] = useState<any[]>([]);\n  const [departments, setDepartments] = useState<any[]>([]);');

// 3. Update initData
code = code.replace(
  'const [fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, templateList] = await Promise.all([',
  'const [fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, departmentList] = await Promise.all(['
);
code = code.replace(
  'm.fetchTaskTemplates(workspaceId)',
  'getDepartments(workspaceId)'
);
code = code.replace(
  'setTemplates(templateList);',
  'setDepartments(departmentList);'
);

// 4. Update submission payload
code = code.replace(
  'priority_id: priorityId || null,',
  'priority_id: priorityId || null,\n      department_id: departmentId || null,'
);

// 5. Remove Templates
code = code.replace('import TemplateManager from "@/components/tasks/TemplateManager";\n', '');
code = code.replace(/\s*const \[templateId, setTemplateId\] = useState\(""\);/, '');
code = code.replace(/\s*const \[templates, setTemplates\] = useState\<any\[\]\>\(\[\]\);/, '');
code = code.replace(/\s*const \[isTemplateManagerOpen, setIsTemplateManagerOpen\] = useState\(false\);/, '');
code = code.replace(/\s*\/\/ Handle Template Selection[\s\S]*?\}, \[templateId, templates\]\);/, '');
code = code.replace(/template_id: templateId \|\| null,/, '');
code = code.replace(/\s*\{isTemplateManagerOpen && \([\s\S]*?\<TemplateManager[\s\S]*?\/\>\s*\)\}/, '');
code = code.replace(/\s*<div className="flex items-center gap-2">\s*<select[\s\S]*?<option value="">-- Apply a Task Template --<\/option>[\s\S]*?<\/select>[\s\S]*?Manage Templates\s*<\/AppButton>\s*<\/div>/, '');

// 6. Restructure UI
const sprintBlockMatch = code.match(/\s*<div className="grid grid-cols-2 gap-5 mt-5">[\s\S]*?<option value="">-- Backlog \(No Sprint\) --<\/option>[\s\S]*?<\/select>\s*<\/div>\s*<\/div>/);
if (sprintBlockMatch) {
  code = code.replace(sprintBlockMatch[0], '');
  code = code.replace('            <div className="mt-5 space-y-1.5">\n              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link (Optional)</label>',
  sprintBlockMatch[0].trim() + '\n\n            <div className="mt-5 space-y-1.5">\n              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link (Optional)</label>');
}

const extLinkMatch = code.match(/\s*<div className="mt-5 space-y-1.5">\s*<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link \(Optional\)<\/label>[\s\S]*?<\/div>/);
if (extLinkMatch) {
  code = code.replace(extLinkMatch[0], '');
  code = code.replace('<div className="grid grid-cols-2 gap-5 mb-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date',
  '<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date');
  
  code = code.replace('                  className={"bg-surface"} \n                />\n              </div>\n            </div>',
  '                  className={"bg-surface"} \n                />\n              </div>\n' + extLinkMatch[0].trim() + '\n            </div>');
}

const execNotesMatch = code.match(/\s*<div className="space-y-1.5">\s*<label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">\s*<AlignLeft className="h-3 w-3" \/> Execution Notes \(Rich Text\)[^]*?<\/textarea>\s*<\/div>/);
if (execNotesMatch) {
  code = code.replace(execNotesMatch[0], '');
  code = code.replace('                  {sprints.map(s => (\n                    <option key={s.id} value={s.id}>{s.name}</option>\n                  ))}\n                </select>\n              </div>\n            </div>',
  '                  {sprints.map(s => (\n                    <option key={s.id} value={s.id}>{s.name}</option>\n                  ))}\n                </select>\n              </div>\n            </div>\n\n            <div className="space-y-1.5 mt-5">' + execNotesMatch[0].split('<div className="space-y-1.5">')[1]);
}


// Grid Restructure!
const assigneesStart = code.indexOf('<div className="space-y-1.5 mt-5">');
const tagsStart = code.indexOf('<div className="space-y-1.5 mt-5">', assigneesStart + 10);
const tasksStart = code.indexOf('{/* Section 4: Tasks & Assets */}');
const extPropsStart = code.indexOf('{/* Section 5: Extended Properties */}');
const endDiv = code.lastIndexOf('</EnterpriseWizardShell>');

const tagsBlockRaw = code.substring(tagsStart, tasksStart);
const tagsBlockClean = tagsBlockRaw.replace(/<\/div>\s*<\/div>\s*$/, '').trim(); // Remove the closing divs of Section 3
const tagsBlockFinal = tagsBlockClean.replace('<div className="space-y-1.5 mt-5">', '<div className="space-y-1.5">').replace(/<label[\s\S]*?<\/label>/, '');

const s4BlockRaw = code.substring(tasksStart, extPropsStart);
const checklistStart = s4BlockRaw.indexOf('{/* Checklist */}');
const attachmentsStart = s4BlockRaw.indexOf('{/* Attachments */}');
const checklistInner = s4BlockRaw.substring(checklistStart, attachmentsStart).trim();

// Attachments Block (End of Section 4)
const attachmentsRaw = s4BlockRaw.substring(attachmentsStart);
const attachmentsInner = attachmentsRaw.replace(/<\/div>\s*<\/div>\s*$/, '').replace('{/* Attachments */}', '').trim();

// Section 5 Block
const s5BlockRaw = code.substring(extPropsStart, endDiv);
const s5Clean = s5BlockRaw.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*$/, '').trim(); // Strip the bottom closing tags so we can re-add them cleanly

const gridJsx = `
          </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            
            {/* 1. Tags & Labels */}
            <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-purple-100 text-purple-600" : "bg-purple-500/20 text-purple-400"}\`}>
                  <LayoutList className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Tags & Labels</h3>
              </div>
              __TAGS__
            </div>

            {/* 2. Tasks & Assets (Checklist) */}
            <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-6">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-blue-100 text-blue-600" : "bg-blue-500/20 text-blue-400"}\`}>
                  <LayoutList className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Tasks & Assets</h3>
              </div>
              __CHECKLIST__
            </div>

            {/* 3. Attachments */}
            <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-6">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-rose-100 text-rose-600" : "bg-rose-500/20 text-rose-400"}\`}>
                  <Paperclip className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Attachments</h3>
              </div>
              __ATTACHMENTS__
            </div>

            {/* 4. Extended Properties */}
            __EXTENDED_PROPERTIES__

          </div>
        </div>
`;

// Now assemble it together! We replace everything from tagsStart to endDiv
let finalGridJsx = gridJsx;
finalGridJsx = finalGridJsx.replace('__TAGS__', tagsBlockFinal);
finalGridJsx = finalGridJsx.replace('__CHECKLIST__', checklistInner);
finalGridJsx = finalGridJsx.replace('__ATTACHMENTS__', attachmentsInner);
finalGridJsx = finalGridJsx.replace('__EXTENDED_PROPERTIES__', s5Clean);

code = code.substring(0, tagsStart) + finalGridJsx + '\\n    </EnterpriseWizardShell>\\n  );\\n}\\n';

fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', code);
console.log('Script completed');
