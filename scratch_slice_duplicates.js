const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\\n');

// 1. Keep lines 1 to 308 (inclusive, which is index 0 to 307)
// 2. Skip lines 309 to 341 (Duplicate 1: Parent Link & Sprint)
// 3. Keep lines 342 to 378 (inclusive, which is index 341 to 377)
// 4. Skip lines 379 to 393 (Duplicate 2: Execution Notes)
// 5. Keep lines 394 to end.

const newLines = [
  ...lines.slice(0, 308),
  ...lines.slice(341, 378),
  ...lines.slice(393)
];

fs.writeFileSync(path, newLines.join('\\n'));
console.log('Removed duplicate blocks safely using line numbers.');
