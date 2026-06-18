const fs = require('fs');
let code = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');

const sprintParentBlock = `            <div className="grid grid-cols-2 gap-5 mt-5">
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

// Remove from Section 2
code = code.replace(sprintParentBlock, '');

// Add to Section 1 before the closing div of Section 1
const extLinkBlock = `            <div className="mt-5 space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link (Optional)</label>
              <AppInput placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className={"bg-surface"} />
            </div>`;

code = code.replace(extLinkBlock, extLinkBlock + '\n' + sprintParentBlock);

fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', code);
console.log("Moved successfully.");
