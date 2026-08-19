const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

try {
  // Find all .tsx, .ts, .jsx, .js files that contain 'alert(' or 'window.alert('
  const out = execSync('git grep -lE "(window\\.)?alert\\("').toString().split('\n').filter(Boolean);
  
  for(const file of out) {
    if (!file.match(/\.(tsx|ts|js|jsx)$/)) continue;
    if (file.includes('node_modules')) continue;

    console.log(`Processing ${file}...`);
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Check if the file imports toast, if not we will inject it if we modify something
    const hasToastImport = content.includes("import { toast } from 'react-toastify'") || content.includes('import { toast } from "react-toastify"');
    let needsImport = false;

    // Pattern to match alert(...) or window.alert(...)
    // Uses a simple replacement approach with replacer function to analyze message content
    const regex = /(?:window\.)?alert\s*\(\s*(.*?)\s*\)/gs;
    
    content = content.replace(regex, (match, args) => {
      // Analyze the arguments to determine toast type
      const lowerArgs = args.toLowerCase();
      let method = 'toast.warning'; // Default for generic warnings / validations
      
      if (lowerArgs.includes('error') || lowerArgs.includes('fail') || lowerArgs.includes('denied') || lowerArgs.includes('invalid') || lowerArgs.includes('cannot')) {
        method = 'toast.error';
      } else if (lowerArgs.includes('success') || lowerArgs.includes('done')) {
        method = 'toast.success';
      } else if (lowerArgs.includes('mandatory') || lowerArgs.includes('required') || lowerArgs.includes('please')) {
        method = 'toast.warning';
      }
      
      needsImport = true;
      return `${method}(${args})`;
    });

    if (content !== original) {
      if (needsImport && !hasToastImport) {
        // Inject import after the last import, or at top
        const importMatch = content.match(/import .*?;?\n/g);
        if (importMatch && importMatch.length > 0) {
          const lastImport = importMatch[importMatch.length - 1];
          content = content.replace(lastImport, `${lastImport}import { toast } from 'react-toastify';\n`);
        } else {
          // If no imports (rare in Next.js tsx), put at top
          content = `import { toast } from 'react-toastify';\n` + content;
        }
      }
      fs.writeFileSync(file, content);
      console.log(`Replaced alerts in ${file}`);
    }
  }
} catch (e) {
  console.error("Error:", e.message);
}
