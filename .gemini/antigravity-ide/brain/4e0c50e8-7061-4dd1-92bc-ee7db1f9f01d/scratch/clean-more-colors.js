const fs = require('fs');
const path = require('path');

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === '.system_generated' || file === 'scratch' || file === 'dist') continue;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDir(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = scanDir('D:/adios');

let totalCleaned = 0;

for (const file of allFiles) {
  const rel = path.relative('D:/adios', file);
  if (rel.endsWith('page_backup.tsx') || rel.includes('dashboard.css')) continue;

  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace text-indigo-400, text-purple-400, text-cyan-400 with text-muted-foreground / text-foreground
  content = content.replace(/dark:text-(indigo|purple|cyan|violet)-400/g, 'dark:text-muted-foreground');
  content = content.replace(/text-(indigo|purple|cyan|violet)-700/g, 'text-foreground');
  content = content.replace(/text-(indigo|purple|cyan|violet)-600/g, 'text-theme-icon');
  content = content.replace(/text-(indigo|purple|cyan|violet)-400/g, 'text-muted-foreground');
  content = content.replace(/text-(indigo|purple|cyan|violet)-300/g, 'text-muted-foreground');

  // Replace bg-purple-500/10, bg-indigo-500/10, bg-cyan-500/10, bg-teal-500/10
  content = content.replace(/bg-(purple|indigo|cyan|violet|fuchsia)-500\/[0-9]+/g, 'bg-surface');
  content = content.replace(/bg-(purple|indigo|cyan|violet|fuchsia)-50/g, 'bg-surface');
  content = content.replace(/dark:bg-(purple|indigo|cyan|violet|fuchsia)-950\/[0-9]+/g, 'dark:bg-surface');

  // Replace border-indigo-500, border-purple-500, border-cyan-500
  content = content.replace(/border-(purple|indigo|cyan|violet|fuchsia)-500\/[0-9]+/g, 'border-border');
  content = content.replace(/border-(purple|indigo|cyan|violet|fuchsia)-200/g, 'border-border');
  content = content.replace(/border-(purple|indigo|cyan|violet|fuchsia)-300/g, 'border-border');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalCleaned++;
    console.log('Cleaned additional colors in:', rel);
  }
}

console.log(`\nCompleted 2nd pass! Cleaned ${totalCleaned} files.`);
