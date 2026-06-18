const fs = require('fs');
let code = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');

// 1. Add Department
code = code.replace(/const \[priorityId, setPriorityId\] = useState\(""\);/, 'const [priorityId, setPriorityId] = useState("");\n  const [departmentId, setDepartmentId] = useState("");');
code = code.replace(/const \[priorities, setPriorities\] = useState<any\[\]>\(\[\]\);/, 'const [priorities, setPriorities] = useState<any[]>([]);\n  const [departments, setDepartments] = useState<any[]>([]);');

code = code.replace(/m\.getPriorities\(workspaceId\),/, 'm.getPriorities(workspaceId),\n          m.getDepartments(workspaceId),');
code = code.replace(/const \[tagsList, prioritiesList, statusesList, sprintsList, templatesList, stakeholdersList, tasksList\] = await Promise\.all/, 'const [tagsList, prioritiesList, statusesList, sprintsList, templatesList, stakeholdersList, tasksList, departmentsList] = await Promise.all');
code = code.replace(/setPriorities\(prioritiesList\);/, 'setPriorities(prioritiesList);\n        setDepartments(departmentsList);');

code = code.replace(/priority_id: priorityId \|\| null,/, 'priority_id: priorityId || null,\n      department_id: departmentId || null,');

// 2. Remove templates
code = code.replace(/import TemplateManager from "@\/components\/tasks\/TemplateManager";\n/, '');
code = code.replace(/\s*const \[templateId, setTemplateId\] = useState\(""\);/, '');
code = code.replace(/\s*const \[templates, setTemplates\] = useState\<any\[\]\>\(\[\]\);/, '');
code = code.replace(/\s*const \[isTemplateManagerOpen, setIsTemplateManagerOpen\] = useState\(false\);/, '');
code = code.replace(/, templatesList/, '');
code = code.replace(/,\s*m\.fetchTaskTemplates\(workspaceId\)/, '');
code = code.replace(/\s*setTemplates\(templatesList\);/, '');
code = code.replace(/\s*\/\/ Handle Template Selection[\s\S]*?\}, \[templateId, templates\]\);/, '');
code = code.replace(/template_id: templateId \|\| null,/, '');
code = code.replace(/\s*\{isTemplateManagerOpen && \([\s\S]*?\<TemplateManager[\s\S]*?\/\>\s*\)\}/, '');
code = code.replace(/\s*<div className="flex items-center gap-2">\s*<select[\s\S]*?<option value="">-- Apply a Task Template --<\/option>[\s\S]*?<\/select>[\s\S]*?Manage Templates\s*<\/AppButton>\s*<\/div>/, '');

// 3, 4, 5, 6: We will completely rewrite the UI section by extracting the parts from `code`.
const formStart = code.indexOf('<div className="space-y-6">');
const formEnd = code.lastIndexOf('</EnterpriseWizardShell>');

const assigneesStart = code.indexOf('<div className="space-y-1.5 mb-5">\n              <div className="flex items-center justify-between">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assignees (Task Owners) *</label>');
const assigneesEnd = code.indexOf('<div className="space-y-1.5">\n              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">');
const assigneesBlock = code.substring(assigneesStart, assigneesEnd).trim();

const tagsStart = code.indexOf('<div className="space-y-1.5 mt-5">\n              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">\n                Tags & Labels');
const tagsEnd = code.indexOf('</div>\n          </div>\n\n          {/* Section 4: Tasks & Assets */}');
const tagsBlockInner = code.substring(tagsStart, tagsEnd + 6);

const s4Start = code.indexOf('{/* Section 4: Tasks & Assets */}');
const s4End = code.indexOf('{/* Section 5: Extended Properties */}');
const s4Block = code.substring(s4Start, s4End);

const s5Block = code.substring(s4End, formEnd);


const newForm = `        <div className="space-y-6">
          
          {/* Section 1: Core Details */}
          <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
            <div className="flex items-center gap-2 mb-4 justify-between">
              <div className="flex items-center gap-2">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-purple-100 text-purple-600" : "bg-purple-500/20 text-purple-400"}\`}>
                  <LayoutTemplate className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Core Details</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Title *</label>
                <AppInput placeholder="e.g. Audit API Endpoints" value={title} onChange={e => setTitle(e.target.value)} required className={"bg-surface"} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Code</label>
                <AppInput disabled placeholder="[Auto-Generated]" value="[Auto-Generated]" className={isLightMode ? "bg-gray-50" : "bg-white/5"} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-5 mt-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Parent Task Link</label>
                <select
                  className={\`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed \${
                    isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                  }\`}
                  value={parentTaskId}
                  onChange={e => setParentTaskId(e.target.value)}
                  disabled={!!initialParentTaskId}
                >
                  <option value="">-- No Parent (Independent) --</option>
                  {workspaceTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title || t.subject}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assign to Sprint</label>
                <select
                  className={\`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer \${
                    isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                  }\`}
                  value={sprintId}
                  onChange={e => setSprintId(e.target.value)}
                >
                  <option value="">-- Backlog (No Sprint) --</option>
                  {sprints.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 mt-5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlignLeft className="h-3 w-3" /> Execution Notes (Rich Text) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed execution instructions, context, or constraints..."
                className={\`w-full min-h-[120px] p-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors resize-y \${
                  isLightMode 
                    ? "bg-[#f8fafc] border-[#e2e8f0] text-gray-900" 
                    : "bg-white/[0.05] border-white/10 text-white placeholder-gray-500"
                }\`}
              />
            </div>
          </div>

          {/* Section 2: Timeline & Priority */}
          <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"}\`}>
                <CalendarDays className="h-4 w-4" />
              </div>
              <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Timeline & Classification</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date <span className="text-red-500">*</span></label>
                <AppInput 
                  type="date" 
                  min={localTodayString} 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className={"bg-surface"} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Due Date <span className="text-red-500">*</span></label>
                <AppInput 
                  type="date" 
                  min={startDate || localTodayString} 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  className={"bg-surface"} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link (Optional)</label>
                <AppInput placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className={"bg-surface"} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Priority</label>
                <select
                  className={\`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer \${
                    isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                  }\`}
                  value={priorityId}
                  onChange={e => setPriorityId(e.target.value)}
                >
                  <option value="">-- Select Priority --</option>
                  {priorities.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department</label>
                <select
                  className={\`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer \${
                    isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                  }\`}
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                >
                  <option value="">-- No Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Status</label>
                <select
                  className={\`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer \${
                    isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                  }\`}
                  value={statusId}
                  onChange={e => setStatusId(e.target.value)}
                >
                  <option value="">-- Default Status --</option>
                  {statuses.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Assignment */}
          <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-emerald-100 text-emerald-600" : "bg-emerald-500/20 text-emerald-400"}\`}>
                <Users className="h-4 w-4" />
              </div>
              <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Assignment</h3>
            </div>
            
            \${assigneesBlock}
          </div>

          {/* Section 4: Metadata & Action Items */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left Column: Tags & Labels */}
            <div className={\`p-5 rounded-2xl border bg-surface border-border shadow-[var(--shadow-ambient)]\`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-purple-100 text-purple-600" : "bg-purple-500/20 text-purple-400"}\`}>
                  <LayoutList className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide text-foreground\`}>Tags & Labels</h3>
              </div>
              \${tagsBlockInner.replace('<div className="space-y-1.5 mt-5">', '<div className="space-y-1.5">').replace(/<label[\\s\\S]*?<\\/label>/, '')}
            </div>

            {/* Right Column: Tasks & Assets */}
            \${s4Block.trim()}
          </div>

          <div className="mt-6">
            \${s5Block.trim()}
          </div>
        </div>
`;

code = code.substring(0, formStart) + newForm + '\n    </EnterpriseWizardShell>\n  );\n}\n';

fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', code);
console.log("Reconstructed fully.");
