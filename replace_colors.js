const fs = require('fs');
const path = require('path');

const directories = ['d:/adios/app', 'd:/adios/components'];
const excludeFiles = ['ThemeProvider.tsx', 'SettingsGallery.tsx'];

const replacements = [
  // Text colors
  { regex: /\btext-(purple|indigo|blue)-(400|500|600|700)\b/g, replacement: 'text-accent' },
  { regex: /\btext-(purple|indigo|blue)-(800|900)\b/g, replacement: 'text-accent-secondary' },
  { regex: /\bhover:text-(purple|indigo|blue)-(400|500|600|700)\b/g, replacement: 'hover:text-accent-secondary' },
  { regex: /\bhover:text-(purple|indigo|blue)-(800|900)\b/g, replacement: 'hover:text-accent-secondary' },
  { regex: /\bdark:text-(purple|indigo|blue)-(400|500|600|700)\b/g, replacement: 'dark:text-accent' },
  
  // Backgrounds
  { regex: /\bbg-(purple|indigo|blue)-(50|100|200)\b/g, replacement: 'bg-accent/10' },
  { regex: /\bbg-(purple|indigo|blue)-(500|600)\b/g, replacement: 'bg-accent' },
  { regex: /\bbg-(purple|indigo|blue)-(700|800)\b/g, replacement: 'bg-accent-secondary' },
  { regex: /\bhover:bg-(purple|indigo|blue)-(50|100|200)\b/g, replacement: 'hover:bg-accent/20' },
  { regex: /\bhover:bg-(purple|indigo|blue)-(500|600|700)\b/g, replacement: 'hover:bg-accent-secondary' },
  { regex: /\bdark:bg-(purple|indigo|blue)-(400|500|600|700|800|900)\/(\d+)\b/g, replacement: 'dark:bg-accent/$2' },
  { regex: /\bdark:bg-(purple|indigo|blue)-(400|500|600|700)\b/g, replacement: 'dark:bg-accent/10' },
  
  // Borders
  { regex: /\bborder-(purple|indigo|blue)-(400|500|600)\b/g, replacement: 'border-accent' },
  { regex: /\bborder-(purple|indigo|blue)-(200|300)\b/g, replacement: 'border-accent/30' },
  { regex: /\bhover:border-(purple|indigo|blue)-(400|500|600)\b/g, replacement: 'hover:border-accent-secondary' },
  { regex: /\bdark:border-(purple|indigo|blue)-(400|500|600)\/(\d+)\b/g, replacement: 'dark:border-accent/$2' },

  // Rings
  { regex: /\bring-(purple|indigo|blue)-(400|500|600)\b/g, replacement: 'ring-accent' },
  { regex: /\bring-(purple|indigo|blue)-(400|500|600|700)\/(\d+)\b/g, replacement: 'ring-accent/$2' },
  { regex: /\bdark:ring-(purple|indigo|blue)-(400|500|600)\/(\d+)\b/g, replacement: 'dark:ring-accent/$2' },
  { regex: /\bfocus:ring-(purple|indigo|blue)-(400|500|600)\b/g, replacement: 'focus:ring-accent' },
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
      if (excludeFiles.includes(file)) continue;
      
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
        console.log(`Updated ${filePath}`);
      }
    }
  }
}

directories.forEach(walkDir);
console.log(`Finished. Total files changed: ${filesChanged}`);
