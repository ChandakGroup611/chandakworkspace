const fs = require('fs');
const file = 'd:/adios/app/requirements/[id]/page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/className="text-\[11px\] font-medium text-muted"/g, 'className="theme-label text-muted"');
c = c.replace(/className="text-xs font-extrabold uppercase tracking-wider text-muted flex items-center gap-1.5"/g, 'className="theme-label flex items-center gap-1.5"');
c = c.replace(/className="text-xs text-muted-foreground leading-relaxed break-words"/g, 'className="theme-data-value text-muted-foreground leading-relaxed break-words"');
c = c.replace(/className="text-\[10px\] font-semibold text-muted"/g, 'className="theme-label text-muted"');
c = c.replace(/className="px-2 py-0.5 rounded-full text-\[10px\] font-extrabold bg-amber-500\/20/g, 'className="px-2 py-0.5 rounded-full theme-label bg-amber-500/20');
c = c.replace(/className="text-\[10px\] font-extrabold uppercase tracking-wider/g, 'className="theme-label');

fs.writeFileSync(file, c, 'utf8');
console.log('Fixed missing fields in page.tsx');
