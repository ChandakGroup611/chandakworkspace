const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/[id]/page.tsx', 'utf8');

const newDetails = `<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Requirement Number</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.code || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Scope</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.scope || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Software System</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.software_system?.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Module</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.module?.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Submodule</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.sub_module?.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Category</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.category?.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Sub Category</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.sub_category?.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Priority</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.priority?.name || '-'}</div>
                    </div>
                    <div className="col-span-full">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Subject</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.title || '-'}</div>
                    </div>
                    <div className="col-span-full">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Issue Description</div>
                      <div className={\`text-sm \${isLightMode ? 'text-gray-700' : 'text-gray-300'}\`}>{requirement?.objective || '-'}</div>
                    </div>
                    <div className="col-span-full">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Requirement Reason</div>
                      <div className={\`text-sm \${isLightMode ? 'text-gray-700' : 'text-gray-300'}\`}>{requirement?.requirement_reason || '-'}</div>
                    </div>
                    <div className="col-span-full">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Requirement Details</div>
                      <div className={\`text-sm \${isLightMode ? 'text-gray-700' : 'text-gray-300'}\`}>{requirement?.requirement_details || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Requester</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.requester?.full_name || requirement?.creator?.full_name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Department</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.requester_department?.name || requirement?.department?.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold mb-1">Created Date</div>
                      <div className={\`text-sm font-medium \${isLightMode ? 'text-gray-900' : 'text-gray-200'}\`}>{requirement?.created_at ? new Date(requirement.created_at).toLocaleString() : '-'}</div>
                    </div>
                  </div>`;

content = content.replace(/<div className="grid grid-cols-2 md:grid-cols-4 gap-6">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/AppCardContent>/, newDetails + '\n                </AppCardContent>');
fs.writeFileSync('d:/adios/app/requirements/[id]/page.tsx', content);
