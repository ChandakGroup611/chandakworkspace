const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');

const headOld = `<tr className={\`border-b text-[10px] uppercase tracking-wider \${isLightMode ? "bg-gray-50 border-gray-200 text-gray-500" : "bg-white/5 border-white/10 text-gray-400"}\`}>
                    <th className="p-4 font-bold">Number</th>
                    <th className="p-4 font-bold">Scope</th>
                    <th className="p-4 font-bold">System</th>
                    <th className="p-4 font-bold">Module</th>
                    <th className="p-4 font-bold">Submodule</th>
                    <th className="p-4 font-bold">Category</th>
                    <th className="p-4 font-bold">Sub Category</th>
                    <th className="p-4 font-bold">Subject</th>
                    <th className="p-4 font-bold">Requester</th>
                    <th className="p-4 font-bold">Department</th>
                    <th className="p-4 font-bold">Stage</th>
                    <th className="p-4 font-bold">Approver</th>
                    <th className="p-4 font-bold">Created Date</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>`;

const headNew = `<tr className={\`border-b text-[10px] uppercase tracking-wider \${isLightMode ? "bg-gray-50 border-gray-200 text-gray-500" : "bg-white/5 border-white/10 text-gray-400"}\`}>
                    <th className="p-4 font-bold">Scope</th>
                    <th className="p-4 font-bold">Subject</th>
                    <th className="p-4 font-bold">Priority</th>
                    <th className="p-4 font-bold">Module</th>
                    <th className="p-4 font-bold">Submodule</th>
                    <th className="p-4 font-bold">Category</th>
                    <th className="p-4 font-bold">Requester</th>
                    <th className="p-4 font-bold">Department</th>
                    <th className="p-4 font-bold">Approver</th>
                    <th className="p-4 font-bold">Created Date</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>`;

content = content.replace(headOld, headNew);

const varsOld = `const assigneeName = r.assignee?.full_name || "-";`;
const varsNew = `const assigneeName = r.assignee?.full_name || "-";
                    const prioId = r.custom_fields?.priority_id;
                    const prioName = masters.priority?.find((x: any) => x.id === prioId)?.name || "-";`;

content = content.replace(varsOld, varsNew);

const bodyStartIdx = content.indexOf(`<tr key={r.id} className={\`transition-colors group \${isLightMode ? "hover:bg-gray-50 border-b border-gray-100" : "hover:bg-white/[0.02]"}\`}>`);
const bodyEndIdx = content.indexOf(`<td className="p-4 text-right">`, bodyStartIdx);

if (bodyStartIdx !== -1 && bodyEndIdx !== -1) {
  const bodyNew = `<tr key={r.id} className={\`transition-colors group \${isLightMode ? "hover:bg-gray-50 border-b border-gray-100" : "hover:bg-white/[0.02]"}\`}>
                        <td className="p-4">
                          <span className={\`text-xs \${isLightMode ? "text-gray-600" : "text-gray-400"}\`}>{scopeType}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`font-bold truncate max-w-[150px] block \${isLightMode ? "text-gray-900" : "text-white"}\`} title={r.title || "Untitled"}>
                            {r.title || "Untitled Requirement"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs \${isLightMode ? "text-gray-600" : "text-gray-400"}\`}>{prioName}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs \${isLightMode ? "text-gray-600" : "text-gray-400"}\`}>{modName}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs \${isLightMode ? "text-gray-600" : "text-gray-400"}\`}>{subModName}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs \${isLightMode ? "text-gray-600" : "text-gray-400"}\`}>{issueSubName}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs text-indigo-500 font-bold border border-indigo-500/30">
                              {creatorName.charAt(0).toUpperCase()}
                            </div>
                            <span className={\`text-xs \${isLightMode ? "text-gray-700" : "text-gray-300"}\`}>{creatorName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs \${isLightMode ? "text-gray-600" : "text-gray-400"}\`}>{deptName}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs \${isLightMode ? "text-gray-600" : "text-gray-400"}\`}>{assigneeName}</span>
                        </td>
                        <td className="p-4">
                          <span className={\`text-xs \${isLightMode ? "text-gray-500" : "text-gray-500"}\`}>
                            {dateObj.toLocaleDateString()}
                          </span>
                        </td>
                        `;
  
  content = content.substring(0, bodyStartIdx) + bodyNew + content.substring(bodyEndIdx);
}

fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);
