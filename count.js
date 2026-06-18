const fs = require('fs');
let c = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');
let block = c.substring(c.indexOf('<EnterpriseWizardShell'));
let open = block.match(/<div\b/g).length;
let close = block.match(/<\/div>/g).length;
console.log('Open divs:', open, 'Close divs:', close);
