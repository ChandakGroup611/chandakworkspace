const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix gap
content = content.replace(
  '<div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10 mt-6 items-start">',
  '<div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 mt-6 items-start">'
);

// 2. Checklist Header
const oldChecklist = `<div className="flex items-center gap-2 mb-6">
              <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-blue-100 text-blue-600" : "bg-blue-500/20 text-blue-400"}\`}>
                <LayoutList className="h-4 w-4" />
              </div>
              <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Tasks & Assets</h3>
            </div>

            {/* Checklist */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className={\`text-[11px] font-bold uppercase tracking-wider \${"text-foreground"}\`}>Action Items</h4>
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">{checklistItems.length} items</span>
              </div>`;

const newChecklist = `<div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-blue-100 text-blue-600" : "bg-blue-500/20 text-blue-400"}\`}>
                  <LayoutList className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Checklist</h3>
              </div>
              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">{checklistItems.length} items</span>
            </div>

            {/* Checklist */}
            <div className="mb-6">`;

content = content.replace(oldChecklist, newChecklist);

// 3. Attachments Header
const oldAttachments = `<div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-cyan-100 text-cyan-600" : "bg-cyan-500/20 text-cyan-400"}\`}>
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Attachments</h3>
                </div>
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">{attachments.length} files</span>
              </div>
              
              <div className={attachments.length > 0 ? "mb-3" : ""}>
                <input 
                  type="file" 
                  id="task-attachment" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const mockUrl = URL.createObjectURL(file);
                    const fileType = file.name.split('.').pop()?.trim().toLowerCase() || "unknown";
                    setAttachments([...attachments, {
                      file_name: file.name,
                      file_url: mockUrl,
                      file_type: fileType,
                      size: file.size
                    }]);
                    e.target.value = "";
                  }}
                />
                <label 
                  htmlFor="task-attachment"
                  className={\`flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-bold border border-dashed cursor-pointer transition-all \${
                    isLightMode 
                      ? "bg-gray-50/50 border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600" 
                      : "bg-black/20 border-white/10 text-gray-400 hover:bg-black/40 hover:border-blue-500/50 hover:text-blue-400"
                  }\`}
                >
                  <Paperclip className="h-4 w-4" />
                  <span>Click to Browse & Attach Files</span>
                </label>
              </div>`;

const newAttachments = `<div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-cyan-100 text-cyan-600" : "bg-cyan-500/20 text-cyan-400"}\`}>
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Attachments</h3>
                </div>
                <div className="flex items-center gap-3">
                  <label 
                    htmlFor="task-attachment" 
                    className={\`cursor-pointer flex items-center justify-center p-1.5 rounded-md transition-colors \${isLightMode ? "text-gray-500 hover:text-cyan-600 hover:bg-cyan-50" : "text-gray-400 hover:text-cyan-400 hover:bg-white/10"}\`}
                    title="Click to Browse & Attach Files"
                  >
                    <Paperclip className="h-4 w-4" />
                  </label>
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">{attachments.length} files</span>
                </div>
              </div>
              
              <div>
                <input 
                  type="file" 
                  id="task-attachment" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const mockUrl = URL.createObjectURL(file);
                    const fileType = file.name.split('.').pop()?.trim().toLowerCase() || "unknown";
                    setAttachments([...attachments, {
                      file_name: file.name,
                      file_url: mockUrl,
                      file_type: fileType,
                      size: file.size
                    }]);
                    e.target.value = "";
                  }}
                />
              </div>`;

content = content.replace(oldAttachments, newAttachments);

fs.writeFileSync(path, content);
console.log('Modifications applied successfully');
