const fs = require('fs');
let content = fs.readFileSync('d:/adios/lib/actions/requirements.ts', 'utf8');

// Fix 1: Header import
if (!content.includes("dispatchNotification")) {
  content = content.replace(
    /"use server";\r?\n/,
    `"use server";\n\nimport { dispatchNotification } from '@/lib/actions/notifications';\n`
  );
}

// Fix 2: Type error
content = content.replace('const userMap = {};', 'const userMap: Record<string, any> = {};');

fs.writeFileSync('d:/adios/lib/actions/requirements.ts', content);
console.log("Fixed TS errors");
