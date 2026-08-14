const fs = require('fs');

const drawerFile = 'd:/adios/components/requirements/RequirementDetailDrawer.tsx';
let d = fs.readFileSync(drawerFile, 'utf8');

d = d.replace(/className="text-xs font-bold text-muted uppercase tracking-widest"/g, 'className="theme-label text-muted"');
d = d.replace(/className="text-xs font-bold text-theme-icon uppercase tracking-widest mb-3"/g, 'className="theme-label text-theme-icon mb-3"');
d = d.replace(/className="text-xs font-bold text-muted uppercase tracking-widest flex justify-between items-center mb-4"/g, 'className="theme-label text-muted flex justify-between items-center mb-4"');
d = d.replace(/className="text-muted text-sm leading-relaxed/g, 'className="theme-data-value text-muted leading-relaxed');
d = d.replace(/className="text-sm font-semibold text-foreground"/g, 'className="theme-label text-foreground"');
d = d.replace(/className="text-sm font-bold text-foreground"/g, 'className="theme-label text-foreground"');
d = d.replace(/className="text-sm font-bold text-amber-500/g, 'className="theme-label text-amber-500');
d = d.replace(/className="text-\[10px\] text-muted uppercase font-bold tracking-wider mb-1"/g, 'className="theme-label text-muted mb-1"');
d = d.replace(/className="text-sm font-semibold text-theme-heading truncate"/g, 'className="theme-data-value font-semibold text-theme-heading truncate"');
d = d.replace(/className="space-y-1 text-sm font-semibold text-theme-heading mt-1"/g, 'className="space-y-1 theme-data-value font-semibold text-theme-heading mt-1"');
d = d.replace(/className="text-sm text-muted flex items-center/g, 'className="theme-data-value text-muted flex items-center');
d = d.replace(/className="text-sm text-muted"/g, 'className="theme-data-value text-muted"');

fs.writeFileSync(drawerFile, d, 'utf8');


const modalFile = 'd:/adios/components/requirements/RequirementAnalysisModal.tsx';
let m = fs.readFileSync(modalFile, 'utf8');

m = m.replace(/className=\{\`text-sm font-bold flex items-center gap-2 pb-2 border-b text-theme-icon border-border\`\}/g, 'className={`theme-label flex items-center gap-2 pb-2 border-b text-theme-icon border-border`}');
m = m.replace(/className=\{\`text-sm font-bold flex items-center gap-2 pb-2 border-b text-emerald-700 border-border\`\}/g, 'className={`theme-label flex items-center gap-2 pb-2 border-b text-emerald-700 border-border`}');
m = m.replace(/className=\{\`text-sm font-bold flex items-center gap-2 pb-2 border-b text-amber-700 border-border\`\}/g, 'className={`theme-label flex items-center gap-2 pb-2 border-b text-amber-700 border-border`}');
m = m.replace(/className=\{\`text-sm font-bold flex items-center gap-2 pb-2 border-b text-pink-700 border-border\`\}/g, 'className={`theme-label flex items-center gap-2 pb-2 border-b text-pink-700 border-border`}');
m = m.replace(/className=\{\`text-\[10px\] text-muted\`\}/g, 'className={`theme-label text-muted`}');
m = m.replace(/className="text-xs text-muted"/g, 'className="theme-label text-muted"');
m = m.replace(/text-xs font-semibold mb-2/g, 'theme-label mb-2');

fs.writeFileSync(modalFile, m, 'utf8');

console.log('Fixed modals and drawer typography');
