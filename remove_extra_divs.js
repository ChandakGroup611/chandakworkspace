const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

let newContent = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/EnterpriseWizardShell>/, `    </EnterpriseWizardShell>`);

fs.writeFileSync(path, newContent);
