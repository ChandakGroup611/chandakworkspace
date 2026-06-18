const fs = require('fs');
let code = fs.readFileSync('temp_TaskCreationWizard.tsx', 'utf8');

const s1_start = code.indexOf('{/* Section 1: Core Details */}');
const s2_start = code.indexOf('{/* Section 2: Timeline & Priority */}');
const s3_start = code.indexOf('{/* Section 3: Assignment & Execution */}');
const s4_start = code.indexOf('{/* Section 4: Tasks & Assets */}');
const s5_start = code.indexOf('{/* Section 5: Extended Properties */}');
const s_end = code.indexOf('</EnterpriseWizardShell>');

const sec2 = code.substring(s2_start, s3_start);
const sec3 = code.substring(s3_start, s4_start);

const getSecLines = (str, matchStr) => {
    const lines = str.split('\n');
    let matchIdx = lines.findIndex(l => l.includes(matchStr));
    if (matchIdx < 0) return "";
    let startIdx = matchIdx;
    while(startIdx > 0 && !lines[startIdx].includes('<div')) {
        startIdx--;
    }
    let depth = 0; let endIdx = -1;
    for(let i=startIdx; i<lines.length; i++) {
        if(lines[i].includes('<div') && !lines[i].includes('/>')) depth++;
        if(lines[i].includes('</div')) depth--;
        if(depth===0 && lines[i].includes('</div')) { endIdx = i; break; }
    }
    return lines.slice(startIdx, endIdx + 1).join('\n');
};

const startDate = getSecLines(sec2, 'Start Date <span');
const dueDate = getSecLines(sec2, 'Target Due Date <span');
const parentTask = getSecLines(sec2, 'Parent Task Link');
const sprint = getSecLines(sec2, 'Assign to Sprint');
const priority = getSecLines(sec2, 'Task Priority');
const dept = getSecLines(sec2, 'Department</label>');
const status = getSecLines(sec2, 'Task Status');

const sec3Lines = sec3.split('\n');
let assignees = '';
let assStart = sec3Lines.findIndex(l => l.includes('Assignees (Task Owners)')) - 1;
if(assStart >= 0) {
    for(let i=assStart; i<sec3Lines.length; i++){
        if(sec3Lines[i].includes('</SelectAssignees>')){
            assignees = sec3Lines.slice(assStart, i+1).join('\n') + '\n                </div>';
            break;
        }
    }
}
const tags = getSecLines(sec3, 'Tags & Labels');
const execNotes = getSecLines(sec3, 'Execution Notes (Rich Text)');

const sec1 = code.substring(s1_start, s2_start);
const workspace = getSecLines(sec1, 'Workspace <span');
const template = getSecLines(sec1, '-- Apply a Task Template --');
const title = getSecLines(sec1, 'Task Title *');

const sec4Content = code.substring(s4_start, s5_start).replace(/<div className={`p-5 rounded-2xl border.*`}>/s, '').replace(/<\/div>\s*$/s, '');
const sec5Content = code.substring(s5_start, s_end).replace(/<div className={`p-5 rounded-2xl border.*`}>/s, '').replace(/<\/div>\s*$/s, '');

const newLayout = `
        <div className="bg-white dark:bg-[#050505] rounded-lg border border-gray-100 dark:border-white/5 p-4 shadow-sm mb-10">
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Core Classification */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold flex items-center gap-2 pb-1 border-b text-indigo-500 dark:text-indigo-400 border-gray-200 dark:border-white/10">
                <Briefcase className="h-3 w-3" /> Core Classification & Linkage
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                ${workspace}
                ${template}
                ${parentTask}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${title}
                ${sprint}
              </div>
            </div>

            {/* Planning & Specifications */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold flex items-center gap-2 pb-1 border-b text-emerald-500 dark:text-emerald-400 border-gray-200 dark:border-white/10">
                <Server className="h-3 w-3" /> Planning & Execution Specs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                ${startDate}
                ${dueDate}
                ${priority}
                ${dept}
              </div>
              <div className="grid grid-cols-1 gap-4">
                ${execNotes}
              </div>
            </div>

            {/* Assignment & Tracking */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold flex items-center gap-2 pb-1 border-b text-cyan-600 dark:text-cyan-400 border-gray-200 dark:border-white/10">
                <Target className="h-3 w-3" /> Assignment & Tracking
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                   ${assignees}
                </div>
                ${status}
                <div className="md:col-span-3">
                   ${tags}
                </div>
              </div>
            </div>

            {/* Extended Properties */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold flex items-center gap-2 pb-1 border-b text-purple-500 dark:text-purple-400 border-gray-200 dark:border-white/10">
                <FileText className="h-3 w-3" /> Checklist, Assets & Custom Fields
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                   ${sec4Content}
                </div>
                <div>
                   ${sec5Content}
                </div>
              </div>
            </div>

          </div>
        </div>
`;

let finalNewLayout = newLayout
    .replace('<h3 className="text-sm font-bold tracking-wide">Tasks & Assets</h3>', '')
    .replace('<h3 className="text-sm font-bold tracking-wide">Extended Properties</h3>', '');

finalNewLayout = finalNewLayout.replace(/<div className=\{\`p-5 rounded-2xl border \$\{"bg-surface"\}\`\}>/g, '<div className="space-y-4">');

const preWrapper = code.substring(0, code.lastIndexOf('<div className="space-y-', s1_start));
const postWrapper = code.substring(s_end);

let newCode = preWrapper + '\n' + finalNewLayout + '\n' + postWrapper;
if (!newCode.includes('Briefcase')) {
    newCode = newCode.replace('import {', 'import { Briefcase, Server, Target, FileText,');
}

newCode = newCode.replace(/          <\/div>\n        <\/div>\n\n<\/EnterpriseWizardShell>/, '\n</EnterpriseWizardShell>');
newCode = newCode.replace(/<\/div>\n<\/div>\n\n\n    \n<\/EnterpriseWizardShell>/, '\n</EnterpriseWizardShell>');
newCode = newCode.replace(/<\/div>\n\n<\/EnterpriseWizardShell>/, '\n</EnterpriseWizardShell>');

fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', newCode);
console.log("Applied BA layout perfectly");
