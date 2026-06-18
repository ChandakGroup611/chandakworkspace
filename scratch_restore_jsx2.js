const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /<div className="space-y-1\.5">\s*<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Due Date <span className="text-red-500">\*<\/span><\/label>\s*<AppInput\s*type="date"\s*min=\{startDate \|\| localTodayString\}\s*value=\{endDate\}\s*onChange=\{e => setEndDate\(e\.target\.value\)\}\s*value=\{priorityId\}\s*onChange=\{e => setPriorityId\(e\.target\.value\)\}\s*>\s*<option value="">-- Select Priority --<\/option>\s*\{priorities\.map\(p => \(\s*<option key=\{p\.id\} value=\{p\.id\}>\{p\.name\}<\/option>\s*\)\)\}\s*<\/select>\s*<\/div>/;

const correctSection = `<div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Due Date <span className="text-red-500">*</span></label>
                <AppInput 
                  type="date" 
                  min={startDate || localTodayString} 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  className={"bg-surface"} 
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Department</label>
                <select
                  className={\`w-full p-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer \${
                    isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                  }\`}
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} {d.code ? \`(\${d.code})\` : ''}</option>
                  ))}
                </select>
              </div>
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
              </div>`;

if (regex.test(content)) {
  content = content.replace(regex, correctSection);
  fs.writeFileSync(path, content);
  console.log("Reconstructed Section successfully!");
} else {
  console.log("Regex did not match!");
}
