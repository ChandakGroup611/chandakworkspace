const fs = require('fs');
const p = 'components/workspaces/WorkspaceMasterTable.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/\\n/g, '\n');
fs.writeFileSync(p, c);
console.log('Fixed newlines');
