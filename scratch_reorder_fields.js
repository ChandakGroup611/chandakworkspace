const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /<div className="space-y-1\.5">\s*<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link \(Optional\)<\/label>\s*<AppInput placeholder="https:\/\/..." value=\{linkUrl\} onChange=\{e => setLinkUrl\(e\.target\.value\)\} className=\{"bg-surface"\} \/>\s*<\/div>\s*<div className="space-y-1\.5">\s*<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date <span className="text-red-500">\*<\/span><\/label>\s*<AppInput \s*type="date" \s*min=\{localTodayString\} \s*value=\{startDate\} \s*onChange=\{e => setStartDate\(e\.target\.value\)\} \s*className=\{"bg-surface"\} \s*\/>\s*<\/div>\s*<div className="space-y-1\.5">\s*<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Due Date <span className="text-red-500">\*<\/span><\/label>\s*<AppInput \s*type="date" \s*min=\{startDate \|\| localTodayString\} \s*value=\{endDate\} \s*onChange=\{e => setEndDate\(e\.target\.value\)\} \s*className=\{"bg-surface"\} \s*\/>\s*<\/div>/;

const newContent = `<div className="space-y-1.5">
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
              </div>`;

if (regex.test(content)) {
  content = content.replace(regex, newContent);
  fs.writeFileSync(path, content);
  console.log('Successfully reordered fields!');
} else {
  console.log('Regex did not match.');
}
