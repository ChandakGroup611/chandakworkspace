const fs = require('fs');
const lines = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8').split('\n');
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('<label')) console.log(lines[i].trim());
}
