const fs = require('fs');

const files = [
  'd:/adios/components/tickets/TicketFormERP.tsx',
  'd:/adios/components/tickets/TicketFormInfra.tsx',
  'd:/adios/components/tickets/TicketFormOthers.tsx'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  const initial = content;

  // Remove placeholders
  content = content.replace(/placeholder="Operational summary of the software issue"/g, '');
  content = content.replace(/placeholder="Describe the application fault, bug behavior, or system error in detail..."/g, '');
  content = content.replace(/placeholder="Why is this requirement needed\? \(Business Objective\)"/g, '');
  content = content.replace(/placeholder="Provide detailed functional scope and technical requirements..."/g, '');

  content = content.replace(/placeholder="Summary of the infrastructure request or issue"/g, '');
  content = content.replace(/placeholder="Describe the hardware, network, or server issue in detail..."/g, '');
  
  content = content.replace(/placeholder="Summary of the general business request"/g, '');
  content = content.replace(/placeholder="Describe the general issue or request in detail..."/g, '');

  // Add mandatory star to Subject
  content = content.replace(/<label className=\{\`text-sm font-bold uppercase tracking-wider text-muted\`\}>Subject<\/label>/g, '<label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Subject <span className="text-red-500">*</span></label>');

  // Add mandatory star to Issue Description
  content = content.replace(/<label className=\{\`text-sm font-bold uppercase tracking-wider text-muted\`\}>Issue Description<\/label>/g, '<label className={`text-sm font-bold uppercase tracking-wider text-muted`}>Issue Description <span className="text-red-500">*</span></label>');

  if (content !== initial) {
    fs.writeFileSync(f, content);
    console.log('Updated', f);
  }
});
