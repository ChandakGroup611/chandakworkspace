const fs = require('fs');
let c = fs.readFileSync('d:/adios/app/api/seed-iam/route.ts', 'utf8');
c = c.replace(/COMPLIANCE_/g, 'TRASH_');
c = c.replace(/"module": "Compliance"/g, '"module": "Trash Data"');
c = c.replace(/Compliance/g, 'Trash Data');
fs.writeFileSync('d:/adios/app/api/seed-iam/route.ts', c);
console.log('Seed IAM updated.');
