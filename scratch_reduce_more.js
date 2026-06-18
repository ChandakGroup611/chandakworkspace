const fs = require('fs');
const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Grid
content = content.replace(
  'gap-x-8 gap-y-4 mt-2 items-start',
  'gap-x-8 gap-y-1 mt-0 items-start'
);

// 2. Section wrappers (there are 4 of them)
content = content.replace(
  /className="w-full flex flex-col gap-2"/g,
  'className="w-full flex flex-col"'
);

fs.writeFileSync(path, content);
console.log('Reduced spacing more');
