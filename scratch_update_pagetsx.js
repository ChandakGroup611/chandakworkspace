const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');

// Replace table headers
content = content.replace(
  /<thead className="sticky top-0 z-10">[\s\S]*?<\/thead>/,
  `<thead className="sticky top-0 z-10">
                <tr className={\`border-b text-[10px] uppercase tracking-wider bg-black border-white/10 text-gray-400\`}>
                  <th className="p-4 font-bold">Requirement Number</th>
                  <th className="p-4 font-bold">Scope</th>
                  <th className="p-4 font-bold">Software System</th>
                  <th className="p-4 font-bold">Module</th>
                  <th className="p-4 font-bold">Submodule</th>
                  <th className="p-4 font-bold">Category</th>
                  <th className="p-4 font-bold">Sub Category</th>
                  <th className="p-4 font-bold">Priority</th>
                  <th className="p-4 font-bold">Subject</th>
                  <th className="p-4 font-bold">Requester</th>
                  <th className="p-4 font-bold">Department</th>
                  <th className="p-4 font-bold">Current Status</th>
                  <th className="p-4 font-bold">Current Stage</th>
                  <th className="p-4 font-bold">Current Approver</th>
                  <th className="p-4 font-bold">Created Date</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>`
);

// Replace table cells
const newBody = `                ) : reqs.map((r: any) => {
                  const scopeType = r.scope || "-";
                  const prioName = r.priority?.name || "-";
                  const systemName = r.software_system?.name || "-";
                  const modName = r.module?.name || "-";
                  const subModName = r.sub_module?.name || "-";
                  const categoryName = r.category?.name || "-";
                  const subCategoryName = r.sub_category?.name || "-";
                  
                  const creatorName = r.requester?.full_name || r.creator?.full_name || "System";
                  const deptName = r.requester_department?.name || r.department?.name || "Global";
                  const assigneeName = r.assignee?.full_name || "-";
                  const dateObj = new Date(r.created_at);

                  return (
                    <tr key={r.id} className={\`transition-colors group hover:bg-white/[0.02]\`}>
                        <td className="p-4">
                          <span className={\`text-xs font-mono text-gray-300\`}>{r.code || "-"}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs text-gray-400\`}>{scopeType}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs text-gray-400\`}>{systemName}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs text-gray-400\`}>{modName}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs text-gray-400\`}>{subModName}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs text-gray-400\`}>{categoryName}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs text-gray-400\`}>{subCategoryName}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs text-gray-400\`}>{prioName}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`font-bold truncate max-w-[150px] block text-white\`} title={r.title || "Untitled"}>
                            {r.title || "Untitled Requirement"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-500 font-bold border border-indigo-500/30">
                              {creatorName.charAt(0).toUpperCase()}
                            </div>
                            <span className={\`text-xs text-gray-300\`}>{creatorName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs text-gray-400\`}>{deptName}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={\`h-1.5 w-1.5 rounded-full \${r.status?.status_color === 'green' ? 'bg-emerald-400' : r.status?.status_color === 'amber' ? 'bg-amber-400' : r.status?.status_color === 'blue' ? 'bg-blue-400' : 'bg-gray-400'}\`}></span>
                            <span className="text-xs text-gray-300">{r.status?.status_name || 'Draft'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs text-gray-400\`}>{r.current_stage || "Intake"}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs text-gray-400\`}>{assigneeName}</span>
                        </td>
                        <td className="p-4">
                          <div className="text-xs text-gray-400">
                            <div>{dateObj.toLocaleDateString()}</div>
                            <div className="text-[10px] text-gray-500">{dateObj.toLocaleTimeString()}</div>
                          </div>
                        </td>
                        <td className="p-4 text-right">`;

content = content.replace(/                \) : reqs\.map\(\(r: any\) => \{[\s\S]*?<td className="p-4 text-right">/, newBody);

// We should also remove fetchMasters completely
content = content.replace(/const fetchMasters = async \(\) => \{[\s\S]*?fetchMasters\(\);\n/g, '');
content = content.replace(/const \[masters, setMasters\] = useState<any>\(\{\}\);\n/g, '');
content = content.replace(/colSpan=\{11\}/g, 'colSpan={16}'); // since we have 16 columns now

fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);
