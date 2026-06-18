const fs = require('fs');
const lines = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8').split('\n');
const find = (str) => {
  for(let i=0; i<lines.length; i++) {
    if (lines[i].includes(str)) return i;
  }
  return -1;
};
console.log({
  wrap: find('<div className="space-y-3">'),
  s1: find('{/* Section 1: Core Details */}'),
  s2: find('{/* Section 2: Timeline & Priority */}'),
  s3: find('{/* Section 3: Details & Context */}'),
  s4: find('{/* Section 4: Tasks & Assets */}'),
  s5: find('{/* Section 5: Extended Properties */}'),
  end: find('    </EnterpriseWizardShell>')
});
