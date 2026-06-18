const fs = require('fs');

const lines = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8').split('\n');

const find = (str) => {
  for(let i=0; i<lines.length; i++) {
    if (lines[i].includes(str)) return i;
  }
  return -1;
};

const extractBlock = (startStr) => {
  const startIdx = find(startStr) - 1; 
  if (startIdx < 0) return [];
  let block = [];
  let depth = 0;
  for (let i = startIdx; i < lines.length; i++) {
    block.push(lines[i]);
    if (lines[i].includes('<div') && !lines[i].includes('/>')) depth++;
    if (lines[i].includes('</div')) depth--;
    if (depth === 0) break;
  }
  return block;
};

const startDateBlock = extractBlock('Start Date <span');
const dueDateBlock = extractBlock('Target Due Date <span');
const parentTaskBlock = extractBlock('Parent Task Link');
const sprintBlock = extractBlock('Assign to Sprint');
const priorityBlock = extractBlock('Task Priority');
const deptBlock = extractBlock('Department</label>');
const statusBlock = extractBlock('Task Status');
const tagsBlock = extractBlock('Tags & Labels');
const execBlock = extractBlock('Execution Notes');

let assigneesBlock = [];
const assigneesStart = find('Assignees (Task Owners) *') - 1;
if(assigneesStart >= 0) {
    for (let i = assigneesStart; i < lines.length; i++) {
      assigneesBlock.push(lines[i]);
      if (lines[i].includes('</SelectAssignees>')) {
         assigneesBlock.push('                </div>');
         break;
      }
    }
}

let checklistBlock = [];
let checkDepth = 0;
const checklistStart = find('Tasks & Assets') - 1;
if(checklistStart >= 0) {
    for (let i = checklistStart; i < lines.length; i++) {
      let line = lines[i].replace('Tasks & Assets', 'Checklist');
      checklistBlock.push(line);
      if (line.includes('<div') && !line.includes('/>')) checkDepth++;
      if (line.includes('</div')) checkDepth--;
      if (checkDepth === 0) break;
    }
}

let attBlock = [];
let attDepth = 0;
const attStart = find('Attachments') - 1;
if(attStart >= 0) {
    for (let i = attStart; i < lines.length; i++) {
      let line = lines[i];
      attBlock.push(line);
      if (line.includes('<div') && !line.includes('/>')) attDepth++;
      if (line.includes('</div')) attDepth--;
      if (attDepth === 0) break;
    }
}

let customFieldsBlock = [];
for (let i = find('{/* Section 5: Extended Properties */}'); i < find('</EnterpriseWizardShell>'); i++) {
  customFieldsBlock.push(lines[i]);
}

let coreDetailsBlock = [];
for (let i = find('{/* Section 1: Core Details */}'); i < find('{/* Section 2: Timeline & Priority */}'); i++) {
  if (lines[i].trim() === '</div>') continue; 
  coreDetailsBlock.push(lines[i]);
}

const newLayout = `
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT SIDE: Core Details, Timeline, Notes, Sprints */}
          <div className="lg:col-span-7 space-y-4">
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
          <div className="lg:col-span-5 space-y-4">
            {/* Classification */}
            <div className={\`p-3.5 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="space-y-3">
                \${priorityBlock.join('\\n')}
                \${deptBlock.join('\\n')}
                \${statusBlock.join('\\n')}
              </div>
            </div>

            {/* Assignment */}
            <div className={\`p-3.5 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="space-y-3">
                \${assigneesBlock.join('\\n')}
                \${tagsBlock.join('\\n')}
              </div>
            </div>

            {/* Checklist & Assets */}
            <div className={\`p-3.5 rounded-xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
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

const preWrapper = lines.slice(0, find('<div className="space-y-3">')).join('\\n');
const postWrapper = lines.slice(find('</EnterpriseWizardShell>')).join('\\n');

fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', preWrapper + '\\n' + newLayout + '\\n' + postWrapper);
