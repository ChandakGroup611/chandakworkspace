const fs = require('fs');

let code = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');

// 1. Imports
code = code.replace(
    'import { fetchCustomFields, createCustomField } from "@/lib/actions/tasks";',
    'import { fetchCustomFields, createCustomField, getDepartments } from "@/lib/actions/tasks";'
);

// 2. Add Department state
code = code.replace(
    'const [priorityId, setPriorityId] = useState("");',
    'const [priorityId, setPriorityId] = useState("");\n  const [departmentId, setDepartmentId] = useState("");'
);
code = code.replace(
    'const [priorities, setPriorities] = useState<any[]>([]);',
    'const [priorities, setPriorities] = useState<any[]>([]);\n  const [departments, setDepartments] = useState<any[]>([]);'
);

// 3. Update initData
code = code.replace(
    'const [fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, templateList] = await Promise.all([',
    'const [fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, departmentList] = await Promise.all(['
);
code = code.replace(
    'm.fetchTaskTemplates(workspaceId)',
    'getDepartments()'
);
code = code.replace(
    'setTemplates(templateList);',
    'setDepartments(departmentList);'
);

// 4. Update submission payload
code = code.replace(
    'priority_id: priorityId || null,',
    'priority_id: priorityId || null,\n        department_id: departmentId || null,'
);

// 5. Remove Templates safely
code = code.replace('import TemplateManager from "@/components/tasks/TemplateManager";\n', '');

// Using simple string replacement
let lines = code.split('\n');
lines = lines.filter(line => !line.includes('const [templateId, setTemplateId] = useState("");'));
lines = lines.filter(line => !line.includes('const [templates, setTemplates] = useState<any[]>([]);'));
lines = lines.filter(line => !line.includes('const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);'));
lines = lines.filter(line => !line.includes('template_id: templateId || null,'));
code = lines.join('\n');

const effectStart = code.indexOf('// Handle Template Selection');
if (effectStart !== -1) {
    const effectEnd = code.indexOf('}, [templateId, templates]);', effectStart);
    if (effectEnd !== -1) {
        code = code.substring(0, effectStart) + code.substring(effectEnd + '}, [templateId, templates]);'.length);
    }
}

// Strip template selection handler function
const applyTemplateStart = code.indexOf('const handleApplyTemplate = () => {');
if (applyTemplateStart !== -1) {
    const applyTemplateEnd = code.indexOf('setIsTemplateManagerOpen(false);\n  };', applyTemplateStart);
    if (applyTemplateEnd !== -1) {
        code = code.substring(0, applyTemplateStart) + code.substring(applyTemplateEnd + 'setIsTemplateManagerOpen(false);\n  };'.length);
    }
}

const modalStart = code.indexOf('{isTemplateManagerOpen && (');
if (modalStart !== -1) {
    const modalEnd = code.indexOf('</TemplateManager>\n        </div>\n      )}', modalStart);
    if (modalEnd !== -1) {
        code = code.substring(0, modalStart) + code.substring(modalEnd + '</TemplateManager>\n        </div>\n      )}'.length);
    }
}

const selectStart = code.indexOf('<div className="flex items-center gap-2">\n              <select\n                className');
if (selectStart !== -1) {
    const selectEnd = code.indexOf('Manage Templates\n              </AppButton>\n            </div>', selectStart);
    if (selectEnd !== -1) {
        code = code.substring(0, selectStart) + code.substring(selectEnd + 'Manage Templates\n              </AppButton>\n            </div>'.length);
    }
}

// 6. Top Half UI Restructure
const sprintStart = code.indexOf('<div className="grid grid-cols-2 gap-5 mt-5">');
let sprintBlock = '';
if (sprintStart !== -1) {
    const sprintEnd = code.indexOf('</option>\n                  ))}\n                </select>\n              </div>\n            </div>', sprintStart);
    if (sprintEnd !== -1) {
        sprintBlock = code.substring(sprintStart, sprintEnd + '</option>\n                  ))}\n                </select>\n              </div>\n            </div>'.length);
        code = code.substring(0, sprintStart) + code.substring(sprintStart + sprintBlock.length);
    }
}

const extStart = code.indexOf('<div className="mt-5 space-y-1.5">\n              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link (Optional)</label>');
let extBlock = '';
if (extStart !== -1) {
    const extEnd = code.indexOf('className={"bg-surface"} \n              />\n            </div>', extStart);
    if (extEnd !== -1) {
        extBlock = code.substring(extStart, extEnd + 'className={"bg-surface"} \n              />\n            </div>'.length);
        code = code.substring(0, extStart) + code.substring(extStart + extBlock.length);
    }
}

// Move ext link next to Start Date
code = code.replace(
    '<div className="grid grid-cols-2 gap-5 mb-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date',
    '<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date'
);
code = code.replace('                  className={"bg-surface"} \n                />\n              </div>\n            </div>',
'                  className={"bg-surface"} \n                />\n              </div>\n' + extBlock + '\n            </div>');


const execStart = code.indexOf('<div className="space-y-1.5">\n              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">\n                <AlignLeft className="h-3 w-3" /> Execution Notes (Rich Text)');
let execBlock = '';
if (execStart !== -1) {
    const execEnd = code.indexOf('className={"min-h-[100px] bg-surface"}\n              />\n            </div>', execStart);
    if (execEnd !== -1) {
        execBlock = code.substring(execStart, execEnd + 'className={"min-h-[100px] bg-surface"}\n              />\n            </div>'.length);
        code = code.substring(0, execStart) + code.substring(execStart + execBlock.length);
    }
}

const coreDetailsEndStr = '                  ))}\n                </select>\n              </div>\n            </div>';
if (sprintBlock) {
    code = code.replace(coreDetailsEndStr, coreDetailsEndStr + sprintBlock);
}
if (execBlock) {
    code = code.replace(coreDetailsEndStr + sprintBlock, coreDetailsEndStr + sprintBlock + '\n\n            <div className="space-y-1.5 mt-5">' + execBlock.split('<div className="space-y-1.5">')[1]);
}

const deptJsx = `
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3" /> Department
                </label>
                <select 
                  className={\`w-full h-10 px-3 rounded-xl text-sm border focus:outline-none cursor-pointer \${isLightMode ? "bg-white border-gray-200" : "bg-black/30 border-white/10 text-white"}\`}
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                >
                  <option value="">-- No Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>`;

code = code.replace(
    '<div className="grid grid-cols-2 gap-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>',
    '<div className="grid grid-cols-3 gap-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>'
);
code = code.replace(
    '                  ))}\n                </select>\n              </div>\n            </div>',
    '                  ))}\n                </select>\n              </div>\n' + deptJsx + '\n            </div>'
);

fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', code);
console.log('Rewrote strictly safely!');
