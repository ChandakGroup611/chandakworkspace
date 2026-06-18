const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove External Link from Section 1
const externalLinkBlock = `            
            <div className="mt-5 space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link (Optional)</label>
              <AppInput placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className={"bg-surface"} />
            </div>`;

// Or dynamically using regex to avoid whitespace issues
const regexLink = /<div className="mt-5 space-y-1\.5">\s*<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link \(Optional\)<\/label>\s*<AppInput placeholder="https:\/\/..." value=\{linkUrl\} onChange=\{e => setLinkUrl\(e\.target\.value\)\} className=\{"bg-surface"\} \/>\s*<\/div>/;

if (regexLink.test(content)) {
  content = content.replace(regexLink, '');
} else {
  console.log('regexLink failed');
}

// 2. Change grid-cols-2 to grid-cols-3 and add External Link
const gridRegex = /<div className="grid grid-cols-2 gap-5 mb-5">\s*<div className="space-y-1\.5">/;

const newGrid = `<div className="grid grid-cols-3 gap-5 mb-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link (Optional)</label>
                <AppInput placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className={"bg-surface"} />
              </div>
              <div className="space-y-1.5">`;

if (gridRegex.test(content)) {
  content = content.replace(gridRegex, newGrid);
} else {
  console.log('gridRegex failed');
}

fs.writeFileSync(path, content);
console.log('Moved External Link to Timeline grid');
