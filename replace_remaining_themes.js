const fs = require('fs');

const files = [
  'd:\\adios\\app\\sla\\page.tsx',
  'd:\\adios\\components\\workspaces\\WorkspaceMasterTable.tsx',
  'd:\\adios\\components\\workspaces\\EnrolledWorkspacesClient.tsx',
  'd:\\adios\\components\\tickets\\TicketFormOthers.tsx',
  'd:\\adios\\components\\tickets\\TicketFormInfra.tsx',
  'd:\\adios\\components\\tickets\\TicketFormERP.tsx',
  'd:\\adios\\components\\tasks\\TaskExecutionController.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // app/sla/page.tsx
  content = content.replace(/\$\{isLightMode \? "bg-gray-100 border-gray-200" : "bg-elevated border-border"\}/g, 'bg-elevated border-border');
  content = content.replace(/className=\{isLightMode \? "bg-white border-gray-200 text-gray-700 shadow-sm" : ""\}/g, 'className="bg-surface border-border text-foreground shadow-[var(--shadow-ambient)]"');
  content = content.replace(/\$\{isLightMode \? "bg-white" : ""\}/g, 'bg-surface');

  // components/workspaces/WorkspaceMasterTable.tsx
  content = content.replace(/isLightMode \? \(depth === 0 \? 'text-black' : 'text-slate-900'\) : \(depth === 0 \? 'text-white' : 'text-gray-200'\)/g, "(depth === 0 ? 'text-foreground' : 'text-muted')");
  
  // components/workspaces/EnrolledWorkspacesClient.tsx
  content = content.replace(/className=\{isLightMode \? "bg-white" : ""\}/g, 'className="bg-surface"');

  // components/tickets/TicketFormOthers.tsx & Infra & ERP
  content = content.replace(/className=\{isLightMode \? "bg-white border-gray-200" : ""\}/g, 'className="bg-surface border-border"');

  // components/tasks/TaskExecutionController.tsx
  content = content.replace(/isLightMode \? `\$\{task\.priority\?\.color\}15` \|\| '#f1f5f9' : `\$\{task\.priority\?\.color\}25` \|\| '#1e293b'/g, '`var(--accent-primary)15`'); // actually better just leave color as is or replace with theme var
  content = content.replace(/isLightMode \? `\$\{task\.priority\?\.color\}15` \|\| '#f1f5f9' : `\$\{task\.priority\?\.color\}25` \|\| '#1e293b'/g, 'task.priority?.color ? `${task.priority.color}20` : "var(--color-surface)"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log("Refactored:", file);
  }
});
