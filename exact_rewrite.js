const fs = require('fs');

const lines = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8').split('\n');
const code = lines.join('\n');

const find = (str) => {
  for(let i=0; i<lines.length; i++) {
    if (lines[i].includes(str)) return i;
  }
  return -1;
};

// Start Date Block
const startDateLabel = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date';
let startDateBlock = [];
for (let i = find(startDateLabel) - 1; i < lines.length; i++) {
  startDateBlock.push(lines[i]);
  if (lines[i].includes('</div>')) break;
}

// Due Date Block
const dueDateLabel = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Due Date';
let dueDateBlock = [];
for (let i = find(dueDateLabel) - 1; i < lines.length; i++) {
  dueDateBlock.push(lines[i]);
  if (lines[i].includes('</div>')) break;
}

// Parent Task Block
const parentTaskLabel = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Parent Task Link';
let parentTaskBlock = [];
for (let i = find(parentTaskLabel) - 1; i < lines.length; i++) {
  parentTaskBlock.push(lines[i]);
  if (lines[i].includes('</div>')) break;
}

// Sprint Block
const sprintLabel = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assign to Sprint';
let sprintBlock = [];
for (let i = find(sprintLabel) - 1; i < lines.length; i++) {
  sprintBlock.push(lines[i]);
  if (lines[i].includes('</div>')) break;
}

// Priority Block
const priorityLabel = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Priority';
let priorityBlock = [];
for (let i = find(priorityLabel) - 1; i < lines.length; i++) {
  priorityBlock.push(lines[i]);
  if (lines[i].includes('</div>')) break;
}

// Department Block
const deptLabel = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department Field';
let deptBlock = [];
for (let i = find(deptLabel) - 1; i < lines.length; i++) {
  deptBlock.push(lines[i]);
  if (lines[i].includes('</div>')) break;
}

// Status Block
const statusLabel = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Status';
let statusBlock = [];
for (let i = find(statusLabel) - 1; i < lines.length; i++) {
  statusBlock.push(lines[i]);
  if (lines[i].includes('</div>')) break;
}

// Assignees Block
const assigneesLabel = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assignees';
let assigneesBlock = [];
for (let i = find(assigneesLabel) - 1; i < lines.length; i++) {
  assigneesBlock.push(lines[i]);
  if (lines[i].includes('</SelectAssignees>')) {
     assigneesBlock.push('                </div>');
     break;
  }
}

// Tags Block
const tagsLabel = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tags & Labels';
let tagsBlock = [];
let tagsDepth = 0;
for (let i = find(tagsLabel) - 1; i < lines.length; i++) {
  tagsBlock.push(lines[i]);
  if (lines[i].includes('<div')) tagsDepth++;
  if (lines[i].includes('</div')) tagsDepth--;
  if (tagsDepth === 0) break;
}

// Execution Notes Block
const execLabel = '<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Execution Notes (Rich Text)';
let execBlock = [];
let execDepth = 0;
for (let i = find(execLabel) - 1; i < lines.length; i++) {
  execBlock.push(lines[i]);
  if (lines[i].includes('<div')) execDepth++;
  if (lines[i].includes('</div')) execDepth--;
  if (execDepth === 0) break;
}

// Tasks & Assets (Checklist) Block
const checklistLabel = '<h4 className={`text-[11px] font-bold uppercase tracking-wider ${"text-foreground"}`}>Tasks & Assets</h4>';
let checklistBlock = [];
let checkDepth = 0;
for (let i = find(checklistLabel) - 1; i < lines.length; i++) {
  let line = lines[i].replace('Tasks & Assets', 'Checklist');
  checklistBlock.push(line);
  if (line.includes('<div')) checkDepth++;
  if (line.includes('</div')) checkDepth--;
  if (checkDepth === 0) break;
}

// Attachments Block
const attLabel = '<h4 className={`text-[11px] font-bold uppercase tracking-wider ${"text-foreground"}`}>Attachments</h4>';
let attBlock = [];
let attDepth = 0;
for (let i = find(attLabel) - 1; i < lines.length; i++) {
  attBlock.push(lines[i]);
  if (lines[i].includes('<div')) attDepth++;
  if (lines[i].includes('</div')) attDepth--;
  if (attDepth === 0) break;
}

// Custom Fields Block
let customFieldsBlock = [];
for (let i = find('{/* Section 5: Extended Properties */}'); i < find('</EnterpriseWizardShell>'); i++) {
  customFieldsBlock.push(lines[i]);
}

// Core Details Block
let coreDetailsBlock = [];
for (let i = find('{/* Section 1: Core Details */}'); i < find('{/* Section 2: Timeline & Priority */}'); i++) {
  if (lines[i].trim() === '</div>') continue; // remove the closing tag of section 1
  coreDetailsBlock.push(lines[i]);
}


const newLayout = `
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* LEFT SIDE: Core Details, Timeline, Notes, Sprints */}
          <div className="md:col-span-7 space-y-4">
            \${coreDetailsBlock.join('\\n')}
            </div>

            {/* Timeline & Parent */}
            <div className={\`p-3.5 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"}\`}>
                  <CalendarDays className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Timeline & Classification</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                \${startDateBlock.join('\\n')}
                \${dueDateBlock.join('\\n')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                \${parentTaskBlock.join('\\n')}
                \${sprintBlock.join('\\n')}
              </div>
            </div>

            {/* Execution Notes */}
            <div className={\`p-3.5 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              \${execBlock.join('\\n')}
            </div>
          </div>

          {/* RIGHT SIDE: Priority, Dept, Status, Assignees, Checklist, Att, Custom */}
          <div className="md:col-span-5 space-y-4">
            {/* Classification */}
            <div className={\`p-3.5 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-emerald-100 text-emerald-600" : "bg-emerald-500/20 text-emerald-400"}\`}>
                  <Activity className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Classification</h3>
              </div>
              <div className="space-y-3">
                \${priorityBlock.join('\\n')}
                \${deptBlock.join('\\n')}
                \${statusBlock.join('\\n')}
              </div>
            </div>

            {/* Assignment */}
            <div className={\`p-3.5 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-cyan-100 text-cyan-600" : "bg-cyan-500/20 text-cyan-400"}\`}>
                  <Users className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Assignment & Execution</h3>
              </div>
              <div className="space-y-3">
                \${assigneesBlock.join('\\n')}
                \${tagsBlock.join('\\n')}
              </div>
            </div>

            {/* Checklist & Assets */}
            <div className={\`p-3.5 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-rose-100 text-rose-600" : "bg-rose-500/20 text-rose-400"}\`}>
                  <LayoutList className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Checklist & Assets</h3>
              </div>
              <div className="space-y-3">
                \${checklistBlock.join('\\n')}
                \${attBlock.join('\\n')}
              </div>
            </div>

            {/* Custom Fields */}
            \${customFieldsBlock.join('\\n')}
          </div>
        </div>
`;

// Now replace from '<div className="space-y-3">' up to '</EnterpriseWizardShell>'
const preWrapper = lines.slice(0, find('<div className="space-y-3">')).join('\\n');
const postWrapper = lines.slice(find('</EnterpriseWizardShell>')).join('\\n');

fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', preWrapper + '\\n' + newLayout + '\\n' + postWrapper);
