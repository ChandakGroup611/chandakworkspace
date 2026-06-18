const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const gridStartIdx = lines.findIndex(l => l.includes('<div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-1 mt-0 items-start">'));

const shellEndIdx = lines.findIndex(l => l.includes('</EnterpriseWizardShell>'));

let gridEndIdx = shellEndIdx - 1;
while(gridEndIdx > 0 && !lines[gridEndIdx].includes('</div>')) gridEndIdx--; 
gridEndIdx--;
while(gridEndIdx > 0 && !lines[gridEndIdx].includes('</div>')) gridEndIdx--; 

lines[gridStartIdx] = '          <div className={`p-5 rounded-2xl border ${"bg-surface border-border shadow-[var(--shadow-ambient)]"}`}>\n            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4 mt-0 items-start">';

lines.splice(gridEndIdx + 1, 0, '          </div>');

fs.writeFileSync(path, lines.join('\n'));
console.log('Wrapped in box successfully');
