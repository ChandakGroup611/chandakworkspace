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

let totalReplaced = 0;

for (const file of allFiles) {
  const rel = path.relative('D:/adios', file);
  if (rel.endsWith('page_backup.tsx') || rel.includes('dashboard.css')) continue;

  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Standardize random rainbow button / icon backgrounds
  content = content.replace(/bg-indigo-600 hover:bg-indigo-700/g, 'bg-theme-btn-primary hover:opacity-90');
  content = content.replace(/bg-purple-600 hover:bg-purple-700/g, 'bg-theme-btn-primary hover:opacity-90');
  content = content.replace(/bg-cyan-600 hover:bg-cyan-700/g, 'bg-theme-btn-primary hover:opacity-90');
  content = content.replace(/bg-violet-600 hover:bg-violet-700/g, 'bg-theme-btn-primary hover:opacity-90');
  content = content.replace(/bg-fuchsia-600 hover:bg-fuchsia-700/g, 'bg-theme-btn-primary hover:opacity-90');
  
  // 2. Standardize rainbow icon backgrounds in headers/cards
  content = content.replace(/bg-purple-500\/10 border-purple-500\/20/g, 'bg-surface border-border');
  content = content.replace(/bg-purple-500\/15 text-purple-600 dark:text-purple-400 border-purple-500\/25/g, 'bg-surface text-theme-icon border-border');
  content = content.replace(/bg-purple-500\/10 text-purple-600 dark:text-purple-400 border-purple-500\/20/g, 'bg-surface text-foreground border-border');
  content = content.replace(/bg-purple-500\/10 text-purple-600 border-purple-500\/20/g, 'bg-surface text-foreground border-border');

  content = content.replace(/bg-indigo-500\/10 border-indigo-500\/20/g, 'bg-surface border-border');
  content = content.replace(/bg-indigo-500\/15 text-indigo-600 dark:text-indigo-400 border-indigo-500\/25/g, 'bg-surface text-theme-icon border-border');
  content = content.replace(/bg-indigo-500\/10 text-indigo-600 dark:text-indigo-400 border-indigo-500\/20/g, 'bg-surface text-foreground border-border');
  content = content.replace(/bg-indigo-500\/10 text-indigo-600 border-indigo-500\/20/g, 'bg-surface text-foreground border-border');

  content = content.replace(/bg-cyan-500\/10 border-cyan-500\/20/g, 'bg-surface border-border');
  content = content.replace(/bg-cyan-500\/15 text-cyan-600 dark:text-cyan-400 border-cyan-500\/25/g, 'bg-surface text-theme-icon border-border');
  content = content.replace(/bg-cyan-500\/10 text-cyan-600 dark:text-cyan-400 border-cyan-500\/20/g, 'bg-surface text-foreground border-border');
  content = content.replace(/bg-cyan-500\/10 text-cyan-600 border-cyan-500\/20/g, 'bg-surface text-foreground border-border');

  // 3. Standardize rainbow icon text colors
  content = content.replace(/text-purple-500/g, 'text-theme-icon');
  content = content.replace(/text-purple-600/g, 'text-theme-icon');
  content = content.replace(/text-indigo-500/g, 'text-theme-icon');
  content = content.replace(/text-indigo-600/g, 'text-theme-icon');
  content = content.replace(/text-cyan-500/g, 'text-theme-icon');
  content = content.replace(/text-cyan-600/g, 'text-theme-icon');
  content = content.replace(/text-violet-500/g, 'text-theme-icon');
  content = content.replace(/text-violet-600/g, 'text-theme-icon');

  // 4. Standardize rainbow hover and active states
  content = content.replace(/hover:bg-purple-50 dark:hover:bg-purple-950\/30/g, 'hover:bg-elevated');
  content = content.replace(/hover:bg-indigo-50 dark:hover:bg-indigo-950\/30/g, 'hover:bg-elevated');
  content = content.replace(/hover:bg-cyan-50 dark:hover:bg-cyan-950\/30/g, 'hover:bg-elevated');
  content = content.replace(/hover:border-purple-500/g, 'hover:border-theme-btn-primary');
  content = content.replace(/hover:border-indigo-500/g, 'hover:border-theme-btn-primary');
  content = content.replace(/hover:border-cyan-500/g, 'hover:border-theme-btn-primary');

  // 5. Standardize rainbow borders
  content = content.replace(/border-purple-500\/30/g, 'border-border');
  content = content.replace(/border-indigo-500\/30/g, 'border-border');
  content = content.replace(/border-cyan-500\/30/g, 'border-border');
  content = content.replace(/border-teal-500\/30/g, 'border-border');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalReplaced++;
    console.log('Standardized colors in:', rel);
  }
}

console.log(`\nComplete! Standardized colors in ${totalReplaced} files.`);
