const fs = require('fs');
const path = require('path');

const targetDirs = ['app', 'components'];
const fileExtensions = ['.tsx', '.ts', '.js', '.jsx'];

const mappings = [
  // Micro-text (10-11px) -> text-xs
  { regex: /text-\[0\.625rem\]/g, replacement: 'text-xs' },
  { regex: /text-\[10px\]/g, replacement: 'text-xs' },
  { regex: /text-\[0\.6875rem\]/g, replacement: 'text-xs' },
  { regex: /text-\[11px\]/g, replacement: 'text-xs' },

  // Small text (12-13px) -> text-sm
  { regex: /text-\[0\.8rem\]/g, replacement: 'text-sm' },
  { regex: /text-\[13px\]/g, replacement: 'text-sm' },

  // Standard text (14-15px) -> text-sm
  { regex: /text-\[0\.875rem\]/g, replacement: 'text-sm' },
  { regex: /text-\[14px\]/g, replacement: 'text-sm' },
  
  // Larger text
  { regex: /text-\[16px\]/g, replacement: 'text-base' },
  { regex: /text-\[1rem\]/g, replacement: 'text-base' },
  { regex: /text-\[2rem\]/g, replacement: 'text-3xl' },
  
  // Edge cases observed in UI
  { regex: /text-\[0\.5625rem\]/g, replacement: 'text-xs' }, // 9px
];

let totalFilesModified = 0;
let totalReplacements = 0;

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else {
      if (fileExtensions.includes(path.extname(file))) {
        processFile(fullPath);
      }
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let fileModifications = 0;

  for (const mapping of mappings) {
    const matches = content.match(mapping.regex);
    if (matches) {
      fileModifications += matches.length;
      totalReplacements += matches.length;
      content = content.replace(mapping.regex, mapping.replacement);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFilesModified++;
    console.log(`Updated ${filePath} (${fileModifications} replacements)`);
  }
}

for (const dir of targetDirs) {
  walkDir(path.join(__dirname, dir));
}

console.log(`\nSweep Complete!`);
console.log(`Total files modified: ${totalFilesModified}`);
console.log(`Total classes replaced: ${totalReplacements}`);
