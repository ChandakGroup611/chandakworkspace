const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove "Manage Templates" button and logic
content = content.replace(/<AppButton variant="ghost" className="p-1\.5 h-auto text-xs" onClick=\{[^}]+\}>\s*Manage Templates\s*<\/AppButton>/g, "");
content = content.replace(/\{isTemplateManagerOpen && \([\s\S]*?<\/>\s*\)\}/g, "");
content = content.replace(/const \[isTemplateManagerOpen, setIsTemplateManagerOpen\] = useState\(false\);/g, "");

// 2. Remove all outer border boxes to "keep only input fields and labels"
const borderBoxRegex = /<div className=\{`p-3\.5 rounded-xl border \$\{"bg-surface border-border shadow-\[var\(--shadow-ambient\)\]"\}\`\}>/g;
content = content.replace(borderBoxRegex, `<div className="w-full flex flex-col">`);

// 3. Remove section headers to remove decorations (or keep them minimal?)
// User said: "remove boxes keep only input fields and labels"
// But they also referred to "under Timeline & Classification section" so the titles should stay.

// 4. Move Parent Task Link, Assign to Sprint, and Execution Notes under Core Details.
const parentSprintBlock = `            <div className="grid grid-cols-2 gap-3 mt-3">
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
            </div>`;

const executionNotesBlock = `            <div className="space-y-1.5">
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
            </div>`;

const externalLinkBlock = `            <div className="mt-3 space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link (Optional)</label>
              <AppInput placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className={"bg-surface"} />
            </div>`;

// Remove them from where they are
content = content.replace(parentSprintBlock, "");
content = content.replace(executionNotesBlock, "");
content = content.replace(externalLinkBlock, "");

// Rebuild Core Details to include them
const coreDetailsTarget = `<div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Code</label>
                <AppInput disabled placeholder="[Auto-Generated]" value="[Auto-Generated]" className={isLightMode ? "bg-gray-50" : "bg-white/5"} />
              </div>
            </div>`;

const coreDetailsInjection = `${coreDetailsTarget}
${parentSprintBlock}
            <div className="mt-3">
${executionNotesBlock}
            </div>`;

content = content.replace(coreDetailsTarget, coreDetailsInjection);

// Rebuild Timeline & Classification for the sequence requested
const timelineTarget = `            <div className="grid grid-cols-2 gap-3 mb-3">
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
            </div>`;

const timelineInjection = `            <div className="grid grid-cols-3 gap-3 mb-3">
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
            </div>`;

content = content.replace(timelineTarget, timelineInjection);

// Fix the "department in line of Department, Task Priority, Task Status in a one row"
// The current code actually has priority, department, status. Let's make sure it's 3 cols.
// It is already grid-cols-3 in the code I reviewed earlier!

fs.writeFileSync(path, content);
console.log("FINAL FIX APPLIED");
