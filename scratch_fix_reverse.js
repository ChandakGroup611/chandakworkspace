const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\\n');

const newLines = [
  ...lines.slice(0, 220),       // Lines 1 to 220
  ...lines.slice(308, 341),     // Lines 309 to 341 (Parent Task & Sprint)
  ...lines.slice(378, 393),     // Lines 379 to 393 (Execution Notes)
  ...lines.slice(220, 308),     // Lines 221 to 308 (Rest of Core details + Timeline up to Status)
  ...lines.slice(341, 378),     // Lines 342 to 378 (Assignment start up to Assignees)
  ...lines.slice(393)           // Lines 394 to End
];

fs.writeFileSync(path, newLines.join('\\n'));
console.log('Fixed completely with precise slice.');
