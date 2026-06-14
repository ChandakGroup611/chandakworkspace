const fs = require('fs');
let code = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');

const targetStr = `        department: d.department || null
      }));`;

const replaceStr = `        department: d.department || null,
        priority: d.priority || null,
        software_system: d.software_system || null,
        module: d.module || null,
        sub_module: d.sub_module || null,
        category: d.category || null,
        sub_category: d.sub_category || null,
        requester: d.requester || null,
        requester_department: d.requester_department || null
      }));`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('d:/adios/app/requirements/page.tsx', code);
