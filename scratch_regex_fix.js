const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /footer=\{\s*<div className="flex justify-end gap-3 w-full">\s*<AppButton variant="ghost" type="button" onClick=\{onClose\} disabled=\{isLoading\}>Cancel<\/AppButton>\s*<AppInput placeholder="e\.g\. Audit API Endpoints" value=\{title\} onChange=\{e => setTitle\(e\.target\.value\)\} required className=\{"bg-surface"\} \/>\s*<\/div>/;

const replacement = `footer={
        <div className="flex justify-end gap-3 w-full">
          <AppButton variant="ghost" type="button" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="primary" onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700" disabled={isLoading}>
            {isLoading ? "Deploying..." : "Deploy Directive"}
          </AppButton>
        </div>
      }
    >
        <div className="space-y-6">
          
          {/* Section 1: Core Details */}
          <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
            <div className="flex items-center gap-2 mb-4 justify-between">
              <div className="flex items-center gap-2">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-purple-100 text-purple-600" : "bg-purple-500/20 text-purple-400"}\`}>
                  <LayoutTemplate className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Core Details</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  className={\`p-1.5 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer \${
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
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Task Title *</label>
                <AppInput placeholder="e.g. Audit API Endpoints" value={title} onChange={e => setTitle(e.target.value)} required className={"bg-surface"} />
              </div>`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content);
  console.log("Successfully replaced with regex!");
} else {
  console.log("Regex did not match.");
}
