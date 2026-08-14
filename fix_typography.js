const fs = require('fs');
const file = 'd:/adios/app/requirements/[id]/page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/className="block text-\[10px\] font-bold uppercase tracking-wider text-muted"/g, 'className="block theme-label text-muted"');
c = c.replace(/className="text-\[10px\] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1"/g, 'className="theme-label text-purple-600 dark:text-purple-400 mb-1"');

fs.writeFileSync(file, c, 'utf8');
console.log('Fixed remaining labels in page.tsx');
