const fs = require('fs');

let code = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');

function extractBlock(startMarker, endMarker) {
    const startIdx = code.indexOf(startMarker);
    if (startIdx === -1) return null;
    const endIdx = code.indexOf(endMarker, startIdx);
    if (endIdx === -1) return null;
    const block = code.substring(startIdx, endIdx + endMarker.length);
    code = code.substring(0, startIdx) + code.substring(endIdx + endMarker.length);
    return block;
}

function removeBetween(startStr, endStr) {
    const startIdx = code.indexOf(startStr);
    if (startIdx === -1) return;
    const endIdx = code.indexOf(endStr, startIdx);
    if (endIdx !== -1) {
        code = code.substring(0, startIdx) + code.substring(endIdx + endStr.length);
    }
}

// 1. Imports
code = code.replace(
    'import { fetchCustomFields, createCustomField } from "@/lib/actions/tasks";',
    'import { fetchCustomFields, createCustomField, getDepartments } from "@/lib/actions/tasks";'
);

// 2. Department state
code = code.replace(
    'const [priorityId, setPriorityId] = useState("");',
    'const [priorityId, setPriorityId] = useState("");\n  const [departmentId, setDepartmentId] = useState("");'
);
code = code.replace(
    'const [priorities, setPriorities] = useState<any[]>([]);',
    'const [priorities, setPriorities] = useState<any[]>([]);\n  const [departments, setDepartments] = useState<any[]>([]);'
);

// 3. Init Data
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

// 5. Remove Templates
code = code.replace('import TemplateManager from "@/components/tasks/TemplateManager";\n', '');
const lines = code.split('\n').filter(line => {
    return !line.includes('const [templateId, setTemplateId] = useState("");') &&
           !line.includes('const [templates, setTemplates] = useState<any[]>([]);') &&
           !line.includes('const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);') &&
           !line.includes('template_id: templateId || null,');
});
code = lines.join('\n');

removeBetween('// Handle Template Selection', '}, [templateId, templates]);');
removeBetween('{isTemplateManagerOpen && (', '</TemplateManager>\n        </div>\n      )}');
// Note: removing the "Manage Templates" div and its preceding select. It starts with a select inside a div.
const manageTemplatesStart = code.indexOf('<select\n                  className={`p-1.5 rounded-lg text-xs border');
if (manageTemplatesStart !== -1) {
    const parentDivStart = code.lastIndexOf('<div className="flex items-center gap-2">', manageTemplatesStart);
    if (parentDivStart !== -1) {
        const parentDivEnd = code.indexOf('</div>', code.indexOf('Manage Templates', parentDivStart)) + '</div>'.length;
        code = code.substring(0, parentDivStart) + code.substring(parentDivEnd);
    }
}


// 6. UI Structure - Department, Sprint/Parent Task already in Core details.
// Let's insert Department right after Status!
const deptJsx = `
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3" /> Department
                </label>
                <select 
                  className={\`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer \${isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"}\`}
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
    '<div className="grid grid-cols-2 gap-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Priority</label>',
    '<div className="grid grid-cols-3 gap-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Priority</label>'
);
const statusEndIdx = code.indexOf('</select>\n              </div>\n            </div>');
if (statusEndIdx !== -1) {
    code = code.substring(0, statusEndIdx + '</select>\n              </div>'.length) + '\n' + deptJsx + '\n            </div>' + code.substring(statusEndIdx + '</select>\n              </div>\n            </div>'.length);
}

// 7. Extract and Move External Link
let extLinkBlock = extractBlock(
    '<div className="mt-5 space-y-1.5">\n              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link (Optional)</label>',
    'className={"bg-surface"} \n              />\n            </div>'
);
const timelineGridStart = code.indexOf('<div className="grid grid-cols-2 gap-5 mb-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date');
if (timelineGridStart !== -1 && extLinkBlock) {
    code = code.replace(
        '<div className="grid grid-cols-2 gap-5 mb-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date',
        '<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date'
    );
    const endDateStart = code.indexOf('Target Due Date', timelineGridStart);
    const endDateDivEnd = code.indexOf('</div>', endDateStart) + '</div>'.length;
    code = code.substring(0, endDateDivEnd) + '\n              ' + extLinkBlock + code.substring(endDateDivEnd);
}

// 8. Extract and Move Execution Notes
let execNotesBlock = '';
const execStart = code.indexOf('<div className="space-y-1.5">\n              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">\n                <AlignLeft className="h-3 w-3" /> Execution Notes (Rich Text)');
if (execStart !== -1) {
    const divEnd = code.indexOf('</div>', code.indexOf('</textarea>', execStart)) + '</div>'.length;
    execNotesBlock = code.substring(execStart, divEnd);
    code = code.substring(0, execStart) + code.substring(divEnd);
}
const section2Start = code.indexOf('{/* Section 2: Timeline & Priority */}');
if (section2Start !== -1 && execNotesBlock) {
    const execWrapper = `
            {/* Execution Notes Block */}
            <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              \n              ` + execNotesBlock + `\n            </div>\n`;
    code = code.substring(0, section2Start) + execWrapper + '\n            ' + code.substring(section2Start);
}

// 9. Now replace the bottom half with the 2x2 grid
// The bottom half is:
// Tags & Labels
// Tasks & Assets (Checklist + Attachments)
// Extended Properties (Custom Fields)

const tagsLabelIdx = code.indexOf('Tags & Labels');
const tagsStartIdx = code.lastIndexOf('<div className="space-y-1.5 mt-5">', tagsLabelIdx);
const s4StartIdx = code.indexOf('{/* Section 4: Tasks & Assets */}');
const extPropsStartIdx = code.indexOf('{/* Extended Properties */}');

const s3BlockRaw = code.substring(tagsStartIdx, s4StartIdx);
let tagsBlockInner = s3BlockRaw;
const tagsTitleIdx = tagsBlockInner.indexOf('<label');
const tagsTitleEndIdx = tagsBlockInner.indexOf('</label>', tagsTitleIdx) + '</label>'.length;
tagsBlockInner = tagsBlockInner.substring(0, tagsTitleIdx) + tagsBlockInner.substring(tagsTitleEndIdx);
if (tagsBlockInner.startsWith('<div className="space-y-1.5 mt-5">')) {
  tagsBlockInner = tagsBlockInner.replace('<div className="space-y-1.5 mt-5">', '<div className="space-y-1.5">');
}

const s4BlockRaw = code.substring(s4StartIdx, extPropsStartIdx);
let checklistBlockInner = '';
const checklistMatch = s4BlockRaw.match(new RegExp('<div className="space-y-1\\\\.5">\\\\s*<label[\\\\s\\\\S]*?</label>[\\\\s\\\\S]*?<div className="flex gap-2">'));
if (checklistMatch) {
  const cStart = s4BlockRaw.indexOf(checklistMatch[0]);
  const cEnd = s4BlockRaw.indexOf('</div>', s4BlockRaw.lastIndexOf('</button>')) + '</div>'.length;
  checklistBlockInner = s4BlockRaw.substring(cStart, cEnd);
  const titleStart = checklistBlockInner.indexOf('<label');
  const titleEnd = checklistBlockInner.indexOf('</label>') + '</label>'.length;
  checklistBlockInner = checklistBlockInner.substring(0, titleStart) + checklistBlockInner.substring(titleEnd);
}

let attachBlockInner = '';
const attachMatch = s4BlockRaw.match(new RegExp('<div className="space-y-1\\\\.5 mt-5">\\\\s*<label[\\\\s\\\\S]*?</label>'));
if (attachMatch) {
  const aStart = s4BlockRaw.indexOf(attachMatch[0]);
  const aEnd = s4BlockRaw.lastIndexOf('</div>');
  attachBlockInner = s4BlockRaw.substring(aStart, aEnd);
  if (attachBlockInner.startsWith('<div className="space-y-1.5 mt-5">')) {
    attachBlockInner = attachBlockInner.replace('<div className="space-y-1.5 mt-5">', '<div className="space-y-1.5">');
  }
  const titleStart = attachBlockInner.indexOf('<label');
  const titleEnd = attachBlockInner.indexOf('</label>') + '</label>'.length;
  attachBlockInner = attachBlockInner.substring(0, titleStart) + attachBlockInner.substring(titleEnd);
}

const customFieldsEndIdx = code.indexOf('</EnterpriseWizardShell>');
const extPropsBlockRaw = code.substring(extPropsStartIdx, customFieldsEndIdx);
let customFieldsInner = extPropsBlockRaw;
const cfTitleMatch = customFieldsInner.match(new RegExp('<div className="flex items-center gap-2 mb-4">\\\\s*<div[\\\\s\\\\S]*?</div>\\\\s*<h3[\\\\s\\\\S]*?</h3>\\\\s*</div>'));
if (cfTitleMatch) {
  customFieldsInner = customFieldsInner.replace(cfTitleMatch[0], '');
}
const extPropsWrapperStart = customFieldsInner.indexOf('<div className={`p-5 rounded-2xl border ${"bg-surface border-border shadow-[var(--shadow-ambient)]"}`}>');
if (extPropsWrapperStart !== -1) {
  customFieldsInner = customFieldsInner.replace('<div className={`p-5 rounded-2xl border ${"bg-surface border-border shadow-[var(--shadow-ambient)]"}`}>', '');
  customFieldsInner = customFieldsInner.substring(0, customFieldsInner.lastIndexOf('</div>'));
}

const finalGridJsx = `
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            
            {/* 1. Tags & Labels Box */}
            <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-purple-100 text-purple-600" : "bg-purple-500/20 text-purple-400"}\`}>
                  <LayoutTemplate className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Tags & Labels</h3>
              </div>
              ${tagsBlockInner}
            </div>

            {/* 2. Tasks & Assets Box */}
            <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-emerald-100 text-emerald-600" : "bg-emerald-500/20 text-emerald-400"}\`}>
                  <LayoutList className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Tasks & Assets</h3>
              </div>
              ${checklistBlockInner}
              ${attachBlockInner}
            </div>

            {/* 3. Attachments Component (Placeholder if not handled by Tasks & Assets) */}
            {/* Wait, the user already said Tasks & Assets = Checklist + Attachments, so we don't need a separate Attachments box. */}
            
            {/* 4. Extended Properties Box */}
            <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"} lg:col-span-2\`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-blue-100 text-blue-600" : "bg-blue-500/20 text-blue-400"}\`}>
                  <Activity className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Extended Properties</h3>
              </div>
              ${customFieldsInner}
            </div>

          </div>
`;

code = code.substring(0, tagsStartIdx) + finalGridJsx + '\\n        ' + code.substring(customFieldsEndIdx);
code = code.replace('<Briefcase className="h-3 w-3" />', '');

fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', code);
console.log('Script ran successfully');
