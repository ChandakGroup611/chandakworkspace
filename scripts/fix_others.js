const fs = require('fs');
let f = fs.readFileSync('d:/adios/components/tickets/TicketFormOthers.tsx', 'utf8');

f = f.replace(/requirement_domain:\s*"General Business",[\s\S]*?budget_impact:\s*"",/, '');

fs.writeFileSync('d:/adios/components/tickets/TicketFormOthers.tsx', f, 'utf8');
