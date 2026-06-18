const fs = require('fs');
let code = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');

const s1_start = code.indexOf('{/* Section 1: Core Details */}');
const s2_start = code.indexOf('{/* Section 2: Timeline & Priority */}');
const s3_start = code.indexOf('{/* Section 3: Assignment & Execution */}');
const s4_start = code.indexOf('{/* Section 4: Tasks & Assets */}');
const s5_start = code.indexOf('{/* Section 5: Extended Properties */}');
const s_end = code.indexOf('</EnterpriseWizardShell>');

const sec1 = code.substring(s1_start, s2_start);
const sec2 = code.substring(s2_start, s3_start);
const sec3 = code.substring(s3_start, s4_start);
const sec4 = code.substring(s4_start, s5_start);
const sec5 = code.substring(s5_start, s_end);

const sec2Lines = sec2.split('\n');
const getSecLines = (lines, matchStr) => {
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

const startDate = getSecLines(sec2Lines, 'Start Date <span');
const dueDate = getSecLines(sec2Lines, 'Target Due Date <span');
const parentTask = getSecLines(sec2Lines, 'Parent Task Link');
const sprint = getSecLines(sec2Lines, 'Assign to Sprint');
const priority = getSecLines(sec2Lines, 'Task Priority');
const dept = getSecLines(sec2Lines, 'Department</label>');
const status = getSecLines(sec2Lines, 'Task Status');

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
const tags = getSecLines(sec3Lines, 'Tags & Labels');
const execNotes = getSecLines(sec3Lines, 'Execution Notes (Rich Text)');

let sec4Text = sec4.replace('Tasks & Assets', 'Checklist');
let sec5Text = sec5;


const newLayout = 
'        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">\n' +
'          {/* LEFT COLUMN */}\n' +
'          <div className="md:col-span-7 space-y-4">\n' +
sec1 + '\n' +
'            <div className={`p-3.5 rounded-xl border ${"bg-surface border-border shadow-[var(--shadow-ambient)]"}`}>\n' +
'              <div className="flex items-center gap-2 mb-3">\n' +
'                <div className={`p-1.5 rounded-lg ${isLightMode ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"}`}>\n' +
'                  <CalendarDays className="h-4 w-4" />\n' +
'                </div>\n' +
'                <h3 className={`text-sm font-bold tracking-wide ${"text-foreground"}`}>Timeline & Classification</h3>\n' +
'              </div>\n' +
'              <div className="grid grid-cols-2 gap-3 mb-3">\n' +
startDate + '\n' +
dueDate + '\n' +
'              </div>\n' +
'              <div className="grid grid-cols-2 gap-3">\n' +
parentTask + '\n' +
sprint + '\n' +
'              </div>\n' +
'            </div>\n' +
'\n' +
'            <div className={`p-3.5 rounded-xl border ${"bg-surface border-border shadow-[var(--shadow-ambient)]"}`}>\n' +
execNotes + '\n' +
'            </div>\n' +
'          </div>\n' +
'\n' +
'          {/* RIGHT COLUMN */}\n' +
'          <div className="md:col-span-5 space-y-4">\n' +
'            <div className={`p-3.5 rounded-xl border ${"bg-surface border-border shadow-[var(--shadow-ambient)]"}`}>\n' +
'              <div className="flex items-center gap-2 mb-3">\n' +
'                <div className={`p-1.5 rounded-lg ${isLightMode ? "bg-emerald-100 text-emerald-600" : "bg-emerald-500/20 text-emerald-400"}`}>\n' +
'                  <Activity className="h-4 w-4" />\n' +
'                </div>\n' +
'                <h3 className={`text-sm font-bold tracking-wide ${"text-foreground"}`}>Classification</h3>\n' +
'              </div>\n' +
'              <div className="space-y-3">\n' +
priority + '\n' +
dept + '\n' +
status + '\n' +
'              </div>\n' +
'            </div>\n' +
'\n' +
'            <div className={`p-3.5 rounded-xl border ${"bg-surface border-border shadow-[var(--shadow-ambient)]"}`}>\n' +
'              <div className="flex items-center gap-2 mb-3">\n' +
'                <div className={`p-1.5 rounded-lg ${isLightMode ? "bg-cyan-100 text-cyan-600" : "bg-cyan-500/20 text-cyan-400"}`}>\n' +
'                  <Users className="h-4 w-4" />\n' +
'                </div>\n' +
'                <h3 className={`text-sm font-bold tracking-wide ${"text-foreground"}`}>Assignment & Execution</h3>\n' +
'              </div>\n' +
'              <div className="space-y-3">\n' +
assignees + '\n' +
tags + '\n' +
'              </div>\n' +
'            </div>\n' +
'\n' +
sec4Text + '\n' +
sec5Text + '\n' +
'          </div>\n' +
'        </div>\n';

const preWrapper = code.substring(0, code.lastIndexOf('<div className="space-y-', s1_start));
const postWrapper = code.substring(s_end);

fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', preWrapper + '\n' + newLayout + '\n' + postWrapper);
console.log("Done flawlessly!");
