const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

// I will re-balance the entire file.

// Find exactly where <EnterpriseWizardShell> starts and ends.
const ewsOpen = content.indexOf('<EnterpriseWizardShell');
const ewsClose = content.lastIndexOf('</EnterpriseWizardShell>');

let inner = content.substring(ewsOpen, ewsClose);
let openDivs = 0;
const divRegex = /<\/?div/g;
let match;
while ((match = divRegex.exec(inner)) !== null) {
  if (match[0] === '<div') openDivs++;
  else openDivs--;
}

console.log("Unclosed DIVs:", openDivs);

let missingTags = "";
for (let i = 0; i < openDivs; i++) {
  missingTags += "</div>\n";
}

let newContent = content.substring(0, ewsClose) + missingTags + "</EnterpriseWizardShell>\n  );\n}\n";
fs.writeFileSync(path, newContent);
