const fs = require('fs');
let code = fs.readFileSync('temp_TaskCreationWizard.tsx', 'utf8');

// 1. We know temp_TaskCreationWizard is perfectly balanced.
// We just extract what we need from it.
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

const s1_start = code.indexOf('{/* Section 1: Core Details */}');
const s2_start = code.indexOf('{/* Section 2: Timeline & Priority */}');
const s3_start = code.indexOf('{/* Section 3: Assignment & Execution */}');
const s4_start = code.indexOf('{/* Section 4: Tasks & Assets */}');
const s5_start = code.indexOf('{/* Section 5: Extended Properties */}');
const s_end = code.indexOf('</EnterpriseWizardShell>');

const sec1 = code.substring(s1_start, s2_start);
const sec2 = code.substring(s2_start, s3_start);
const sec3 = code.substring(s3_start, s4_start);

// Fields
const title = getSecLines(sec1, 'Task Title *');
const parentTask = getSecLines(sec2, 'Parent Task Link');
const sprint = getSecLines(sec2, 'Assign to Sprint');

const startDate = getSecLines(sec2, 'Start Date <span');
const dueDate = getSecLines(sec2, 'Target Due Date <span');
const priority = getSecLines(sec2, 'Task Priority');
const dept = getSecLines(sec2, 'Department</label>');
const execNotes = getSecLines(sec3, 'Execution Notes (Rich Text)');

// Assignees (custom fix)
const sec3Lines = sec3.split('\n');
let assignees = '';
let assStart = sec3Lines.findIndex(l => l.includes('Assignees (Task Owners)')) - 1;
if(assStart >= 0) {
    let depth = 0; let found = false;
    for(let i=assStart; i<sec3Lines.length; i++){
        if(sec3Lines[i].includes('<div')) depth++;
        if(sec3Lines[i].includes('</div')) depth--;
        if(depth === 0 && found) {
            assignees = sec3Lines.slice(assStart, i+1).join('\n');
            break;
        }
        found = true;
    }
}
const status = getSecLines(sec2, 'Task Status');
const tags = getSecLines(sec3, 'Tags & Labels');

// Sections 4 & 5
let sec4Content = code.substring(s4_start, s5_start);
let checklist = getSecLines(sec4Content, '{/* Checklist */}');
if(!checklist) checklist = getSecLines(sec4Content, 'Action Items</h4>');

let attachments = getSecLines(sec4Content, 'Attachments</h4>');

let sec5Content = code.substring(s5_start, s_end);
let customFields = getSecLines(sec5Content, 'New Field');
if(customFields) {
    // get the wrapper containing everything inside the section
    customFields = getSecLines(sec5Content, '<div className={`p-3.5 rounded-xl border');
    customFields = customFields.replace(/<div className={`p-3\.5 rounded-xl border[^>]+>/, '').replace(/<\/div>\s*$/, '');
}

const newLayout = `
        <div className="bg-white dark:bg-[#050505] rounded-lg border border-gray-100 dark:border-white/5 p-4 shadow-sm mb-10">
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Core Classification */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold flex items-center gap-2 pb-1 border-b text-indigo-500 dark:text-indigo-400 border-gray-200 dark:border-white/10">
                <Briefcase className="h-3 w-3" /> Core Classification & Linkage
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                `+title+`
                `+parentTask+`
                `+sprint+`
              </div>
            </div>

            {/* Planning & Specifications */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold flex items-center gap-2 pb-1 border-b text-emerald-500 dark:text-emerald-400 border-gray-200 dark:border-white/10">
                <Server className="h-3 w-3" /> Planning & Execution Specs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                `+startDate+`
                `+dueDate+`
                `+priority+`
                `+dept+`
              </div>
              <div className="grid grid-cols-1 gap-4">
                `+execNotes+`
              </div>
            </div>

            {/* Assignment & Tracking */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold flex items-center gap-2 pb-1 border-b text-cyan-600 dark:text-cyan-400 border-gray-200 dark:border-white/10">
                <Target className="h-3 w-3" /> Assignment & Tracking
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                   `+assignees+`
                </div>
                `+status+`
              </div>
            </div>

            {/* Metadata & Action Items */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold flex items-center gap-2 pb-1 border-b text-blue-500 dark:text-blue-400 border-gray-200 dark:border-white/10">
                <LayoutList className="h-3 w-3" /> Metadata & Action Items
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={\`p-3.5 rounded-xl border \${isLightMode ? "bg-white border-gray-200" : "bg-[#0a0a0a] border-white/5"}\`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-purple-100 text-purple-600" : "bg-purple-500/20 text-purple-400"}\`}>
                      <Target className="h-4 w-4" />
                    </div>
                    <h3 className={\`text-sm font-bold tracking-wide \${isLightMode ? "text-gray-900" : "text-white"}\`}>Tags & Labels</h3>
                  </div>
                  `+tags.replace('<div className="space-y-1.5 mt-3">', '<div className="space-y-1.5">')+`
                </div>
                <div className={\`p-3.5 rounded-xl border \${isLightMode ? "bg-white border-gray-200" : "bg-[#0a0a0a] border-white/5"}\`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-blue-100 text-blue-600" : "bg-blue-500/20 text-blue-400"}\`}>
                      <LayoutList className="h-4 w-4" />
                    </div>
                    <h3 className={\`text-sm font-bold tracking-wide \${isLightMode ? "text-gray-900" : "text-white"}\`}>Action Items</h3>
                  </div>
                  `+checklist+`
                </div>
              </div>
            </div>

            {/* Assets & Extended Properties */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold flex items-center gap-2 pb-1 border-b text-amber-500 dark:text-amber-400 border-gray-200 dark:border-white/10">
                <FileText className="h-3 w-3" /> Assets & Extended Properties
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={\`p-3.5 rounded-xl border \${isLightMode ? "bg-white border-gray-200" : "bg-[#0a0a0a] border-white/5"}\`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-gray-100 text-gray-600" : "bg-gray-800 text-gray-400"}\`}>
                      <Paperclip className="h-4 w-4" />
                    </div>
                    <h3 className={\`text-sm font-bold tracking-wide \${isLightMode ? "text-gray-900" : "text-white"}\`}>Attachments</h3>
                  </div>
                  `+attachments+`
                </div>
                <div className={\`p-3.5 rounded-xl border \${isLightMode ? "bg-white border-gray-200" : "bg-[#0a0a0a] border-white/5"}\`}>
                  `+customFields+`
                </div>
              </div>
            </div>

          </div>
        </div>
`;

// Now assemble it together
const preWrapper = code.substring(0, code.lastIndexOf('<div className="space-y-', s1_start));
const postWrapper = code.substring(s_end);

let newCode = preWrapper + '\n' + newLayout + '\n' + postWrapper;
if (!newCode.includes('Briefcase')) {
    newCode = newCode.replace('import {', 'import { Briefcase, Server, Target, FileText,');
}

// Ensure Template code is removed from top
newCode = newCode.replace(/const \[templateId, setTemplateId\] = useState\(""\);\s*const \[templates, setTemplates\] = useState<any\[\]>\(\[\]\);\s*const \[isTemplateManagerOpen, setIsTemplateManagerOpen\] = useState\(false\);/, '');
newCode = newCode.replace(/m\.fetchTaskTemplates\(workspaceId\),/g, '');
newCode = newCode.replace(/const \[fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, templateList, deptList\] = await Promise\.all\(/, 'const [fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, deptList] = await Promise.all(');
newCode = newCode.replace(/setTemplates\(templateList\);/, '');
newCode = newCode.replace(/\/\/ Handle Template Selection[\s\S]*?\}, \[templateId, templates\]\);/, '');
newCode = newCode.replace(/template_id: templateId \|\| null,/, 'template_id: null,');
newCode = newCode.replace(/\{isTemplateManagerOpen[\s\S]*?\/\}\s*\)\}/, ''); // The TemplateManager modal logic

fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', newCode);
console.log("Rebuilt layout completely from scratch");
