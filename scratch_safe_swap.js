const fs = require('fs');
const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

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

// 1. Remove them from their original locations
if (!content.includes(parentSprintBlock)) throw new Error("Could not find Parent/Sprint block");
if (!content.includes(executionNotesBlock)) throw new Error("Could not find Execution Notes block");
if (!content.includes(externalLinkBlock)) throw new Error("Could not find External Link block");

content = content.replace(parentSprintBlock + "\\n", "");
content = content.replace(executionNotesBlock + "\\n", "");
content = content.replace(externalLinkBlock + "\\n", "");

// 2. Inject Parent, Sprint, and Execution Notes into Core Details
// It should go right after the Task Title / Task Code grid.
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

if (!content.includes(coreDetailsTarget)) throw new Error("Could not find Core Details target");
content = content.replace(coreDetailsTarget, coreDetailsInjection);

// 3. Inject External Link into Timeline & Classification (reordering as requested)
// Sequence requested: Start Date, Target Due Date, External Link
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

if (!content.includes(timelineTarget)) throw new Error("Could not find Timeline target");
content = content.replace(timelineTarget, timelineInjection);

fs.writeFileSync(path, content);
console.log("SUCCESS");
