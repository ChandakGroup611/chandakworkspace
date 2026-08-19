const fs = require('fs');
const { execSync } = require('child_process');

try {
  const files = execSync('git grep -l "toast"').toString().split('\n').filter(Boolean);
  
  for(const file of files) {
    if (!file.match(/\.(tsx|ts|js|jsx)$/)) continue;
    
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if it starts with import toast followed by use client
    if (content.startsWith("import { toast } from 'react-toastify';\n\"use client\";") ||
        content.startsWith("import { toast } from 'react-toastify';\r\n\"use client\";") ||
        content.startsWith("import { toast } from 'react-toastify';\n'use client';") ||
        content.startsWith("import { toast } from 'react-toastify';\r\n'use client';")) {
        
        // Remove the import from the top
        content = content.replace(/import \{ toast \} from 'react-toastify';\r?\n/, '');
        
        // Insert it after "use client";
        content = content.replace(/("use client";|'use client';)\r?\n/, "$1\nimport { toast } from 'react-toastify';\n");
        
        fs.writeFileSync(file, content);
        console.log("Fixed", file);
    }
  }
} catch (e) {
  console.error(e);
}
