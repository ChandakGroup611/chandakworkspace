const fs = require('fs');
const content = fs.readFileSync('d:\\adios\\components\\tasks\\TaskCreationWizard.tsx', 'utf8');

const target = `                  <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Attachments</h3>
                      <div className={\`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold \${isLightMode ? "bg-blue-100 text-blue-700" : "bg-blue-500/20 text-blue-400"}\`}>`;

const replacement = `                  <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Attachments</h3>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((item, index) => (
                  <div key={\`\${item.file_url}-\${index}\`} className={\`group flex items-center justify-between gap-3 p-3 rounded-xl border transition-all \${isLightMode ? "border-gray-200 bg-white hover:border-blue-300 shadow-sm" : "border-white/10 bg-black/20 hover:border-blue-500/50"}\`}>
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <div className={\`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold \${isLightMode ? "bg-blue-100 text-blue-700" : "bg-blue-500/20 text-blue-400"}\`}>`;

if (content.includes(target)) {
  fs.writeFileSync('d:\\adios\\components\\tasks\\TaskCreationWizard.tsx', content.replace(target, replacement));
  console.log("Success");
} else {
  console.log("Target not found");
}
