const fs = require('fs');
const files = [
  'app/requirements/reports/page.tsx',
  'app/workspaces/tasks/page.tsx',
  'app/workspaces/transfer-tasks/page.tsx',
  'app/migration/page.tsx',
  'app/settings/identity/page.tsx',
  'app/settings/notifications/page.tsx'
];
files.forEach(f => {
  if (fs.existsSync('d:\\adios\\' + f)) {
    const code = fs.readFileSync('d:\\adios\\' + f, 'utf8');
    console.log(f, 'is client:', code.includes('"use client"') || code.includes("'use client'"));
  } else {
    console.log(f, 'NOT FOUND');
  }
});
