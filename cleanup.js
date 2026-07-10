const fs = require('fs');
const path = require('path');

const directories = ['d:/adios/app', 'd:/adios/components'];
const replacements = [
  { regex: /ring-accent\/\d00/g, replacement: 'ring-accent/10' },
  { regex: /bg-accent\/\d00/g, replacement: 'bg-accent/10' },
  { regex: /text-accent-secondary-secondary/g, replacement: 'text-accent-secondary' },
  { regex: /bg-accent-secondary-secondary/g, replacement: 'bg-accent-secondary' },
  { regex: /dark:bg-accent\/10\/(\d+)/g, replacement: 'dark:bg-accent/$1' }
];

let filesChanged = 0;

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      for (const { regex, replacement } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        filesChanged++;
      }
    }
  }
}

directories.forEach(walkDir);
console.log(`Cleaned up. Total files changed: ${filesChanged}`);
