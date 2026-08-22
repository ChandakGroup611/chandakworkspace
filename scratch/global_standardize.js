const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (f !== 'node_modules' && f !== '.next') walkDir(dirPath, callback);
    } else {
      if (f.endsWith('.tsx') || f.endsWith('.ts')) callback(dirPath);
    }
  });
}

let modifiedCount = 0;

walkDir('d:/adios/app', processFile);
walkDir('d:/adios/components', processFile);

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Remove bg-gradient-to-r and shadow-lg/shadow-[color] from Dialog/Modal/Drawer headers
  content = content.replace(/className="(.*?)bg-gradient-to-r(.*?)"/g, (match, p1, p2) => {
    // If it's a button, maybe keep a subtle elevated look, otherwise strip it
    if (match.includes('from-') || match.includes('via-')) {
      return `className="${p1} bg-surface border border-border/50 text-foreground ${p2}"`.replace(/\s+/g, ' ');
    }
    return match;
  });

  // 2. Standardize Tabs globally (replace custom px/py/text sizes with theme-tab-standard)
  // For standard buttons acting as tabs:
  content = content.replace(/className="(.*?)px-4 py-2(.*?)text-sm(.*?)font-medium(.*?)"/g, 'className="$1 theme-tab-standard $2 $4"');
  
  // 3. Fix small cards (replace hardcoded borders/bg with theme-card-structural)
  content = content.replace(/className="(.*?)bg-white dark:bg-\[#111520\](.*?)border-border(.*?)rounded-xl(.*?)"/g, 'className="$1 theme-card-structural $2 $4"');

  // 4. Standardize AppTableCell (strip text-[13px] etc.)
  content = content.replace(/<AppTableCell([^>]*)className="([^"]*text-\[[0-9]+px\].*?)"/g, (match, p1, p2) => {
    const cleanedClass = p2.replace(/text-\[[0-9]+px\]/g, '').replace(/text-xs/g, '').replace(/text-sm/g, '').trim();
    return `<AppTableCell${p1}className="${cleanedClass}"`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    modifiedCount++;
  }
}

console.log(`Global standardization complete. Modified ${modifiedCount} files.`);
