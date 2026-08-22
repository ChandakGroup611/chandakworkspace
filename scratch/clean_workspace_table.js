const fs = require('fs');
const file = 'd:/adios/components/workspaces/WorkspaceMasterTable.tsx';
let content = fs.readFileSync(file, 'utf8');

// Header standardization
content = content.replace(/text-\[11px\] tracking-widest font-semibold uppercase/g, 'text-[12px] tracking-wider font-bold uppercase text-muted');

// Cell text standardization
content = content.replace(/text-\[14px\]/g, 'text-sm');
content = content.replace(/text-\[13px\]/g, 'text-[13px]');
content = content.replace(/text-xs/g, 'text-[13px]');
content = content.replace(/text-\[12px\]/g, 'text-[13px]');

// Padding standardization in grid columns
content = content.replace(/py-1 px-2/g, 'py-3 px-4');
content = content.replace(/py-2 px-2/g, 'py-3 px-4');
content = content.replace(/py-2 px-1/g, 'py-3 px-4');
content = content.replace(/h-6 px-2/g, 'h-7 px-3');

fs.writeFileSync(file, content);
console.log('WorkspaceMasterTable.tsx cleaned up');
