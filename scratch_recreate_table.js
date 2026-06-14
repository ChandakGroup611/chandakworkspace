const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');

const splitStart = content.indexOf('{/* Orchestrated Split Layout */}');
const splitEnd = content.indexOf('</PageContainer>');

if (splitStart !== -1 && splitEnd !== -1) {
  const newTable = `{/* Full Width Detailed List View */}
      <div className="flex-1 min-h-0 overflow-hidden mt-4">
        <AppCard className="h-full flex flex-col min-h-0 border-white/10 shadow-2xl">
          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10">
                <tr className={\`border-b text-[10px] uppercase tracking-wider \${isLightMode ? "bg-gray-50 border-gray-200 text-gray-500" : "bg-black border-white/10 text-gray-400"}\`}>
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
                </tr>
              </thead>
              <tbody className={\`divide-y \${isLightMode ? "divide-gray-100" : "divide-white/5"}\`}>
                {reqs.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-gray-500 text-xs italic">
                      No requirements found.
                    </td>
                  </tr>
                ) : reqs.map((r: any) => {
                  const scopeType = r.custom_fields?.scope_type || "-";
                  const prioId = r.custom_fields?.priority_id;
                  const prioName = masters.priority?.find((x: any) => x.id === prioId)?.name || "-";
                  const modId = r.custom_fields?.module_id;
                  const modName = masters.modules?.find((x: any) => x.id === modId)?.name || "-";
                  const subModId = r.custom_fields?.sub_module_id;
                  const subModName = masters.submodules?.find((x: any) => x.id === subModId)?.name || "-";
                  const issueSubId = r.custom_fields?.sub_category_id;
                  const issueSubName = masters.issue_subs?.find((x: any) => x.id === issueSubId)?.name || "-";
                  
                  const creatorName = r.creator?.full_name || "System";
                  const deptName = r.department?.name || "Global";
                  const assigneeName = r.assignee?.full_name || "-";
                  const dateObj = new Date(r.created_at);

                  return (
                    <tr key={r.id} className={\`transition-colors group \${isLightMode ? "hover:bg-gray-50 border-b border-gray-100" : "hover:bg-white/[0.02]"}\`}>
                      <td className="p-4">
                        <span className={\`text-xs \${isLightMode ? "text-gray-600" : "text-gray-400"}\`}>{scopeType}</span>
                      </td>
                      <td className="p-4">
                        <span className={\`font-bold truncate max-w-[200px] block \${isLightMode ? "text-gray-900" : "text-white"}\`} title={r.title || "Untitled"}>
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
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => router.push(\`/requirements/\${r.id}\`)} title="Analyze / View" className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors">
                            <Search className="h-4 w-4" />
                          </button>
                          {hasPermission("REQUIREMENTS_UPDATE") && (
                            <button onClick={() => router.push(\`/requirements/\${r.id}\`)} title="Edit Requirement" className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {hasPermission("REQUIREMENTS_DELETE") && (
                            <button onClick={() => handleDelete(r.id)} title="Delete Requirement" className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AppCard>
      </div>
    `;
  
  content = content.substring(0, splitStart) + newTable + '\n    </PageContainer>\n  );\n}';
  fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);
  console.log('Successfully recreated list view');
} else {
  console.log('Split markers not found');
}
