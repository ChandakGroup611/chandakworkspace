const fs = require('fs');
const path = require('path');

const directories = ['d:/adios/app', 'd:/adios/components'];

const replacements = {
  // Backgrounds
  'bg-white': 'bg-surface',
  'bg-gray-50': 'bg-surface',
  'bg-gray-100': 'bg-surface',
  'bg-gray-200': 'bg-elevated',
  'bg-gray-300': 'bg-elevated',
  'bg-gray-700': 'bg-surface',
  'bg-gray-800': 'bg-surface',
  'bg-gray-900': 'bg-surface',
  'bg-black': 'bg-surface',

  // Text
  'text-gray-900': 'text-foreground',
  'text-gray-800': 'text-foreground',
  'text-gray-700': 'text-subtle',
  'text-gray-600': 'text-subtle',
  'text-gray-500': 'text-muted',
  'text-gray-400': 'text-muted',
  'text-gray-300': 'text-muted',
  'text-gray-200': 'text-muted',
  'text-black': 'text-foreground',

  // Borders
  'border-gray-50': 'border-border/30',
  'border-gray-100': 'border-border/50',
  'border-gray-200': 'border-border',
  'border-gray-300': 'border-border',
  'border-gray-400': 'border-border',
  'border-gray-600': 'border-border',
  'border-gray-700': 'border-border',
  'border-gray-800': 'border-border',
  'border-gray-900': 'border-border',
};

let filesChangedCount = 0;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const allFiles = directories.reduce((acc, dir) => acc.concat(walk(dir)), []);

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  const keys = Object.keys(replacements).join('|');
  const regex = new RegExp(`\\b(${keys})\\b`, 'g');
  
  content = content.replace(regex, (match) => {
    return replacements[match];
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    filesChangedCount++;
  }
});

console.log(`Successfully refactored colors in ${filesChangedCount} files.`);
