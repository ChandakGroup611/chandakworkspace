const fs = require('fs');
let code = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');
const tagsLabelIdx = code.indexOf('Tags & Labels');
const tagsStartIdx = code.lastIndexOf('<div className="space-y-1.5 mt-5">', tagsLabelIdx);
console.log('tagsLabelIdx:', tagsLabelIdx);
console.log('tagsStartIdx:', tagsStartIdx);
