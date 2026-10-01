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

const colorRegex = /\b(bg-gradient-to-[a-z]+|from-(purple|pink|indigo|violet|fuchsia|cyan|teal|rose|amber|blue)-[0-9]+|to-(purple|pink|indigo|violet|fuchsia|cyan|teal|rose|amber|blue)-[0-9]+|via-(purple|pink|indigo|violet|fuchsia|cyan|teal|rose|amber|blue)-[0-9]+|bg-(purple|pink|indigo|violet|fuchsia|cyan)-[0-9]+(\/[0-9]+)?|text-(purple|pink|indigo|violet|fuchsia|cyan)-[0-9]+|border-(purple|pink|indigo|violet|fuchsia|cyan)-[0-9]+(\/[0-9]+)?)\b/g;

const hits = [];

allFiles.forEach(file => {
  const rel = path.relative('D:/adios', file);
  if (rel.endsWith('page_backup.tsx') || rel.includes('dashboard.css')) return;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Skip legitimate semantic status colors in badges if they are small, but catch big colorful cards/gradients
    const matches = line.match(colorRegex);
    if (matches && matches.length > 0) {
      hits.push({
        file: rel,
        line: idx + 1,
        matches: [...new Set(matches)],
        text: line.trim()
      });
    }
  });
});

console.log('Total Colorful lines found:', hits.length);

// Group by file
const byFile = {};
hits.forEach(h => {
  if (!byFile[h.file]) byFile[h.file] = [];
  byFile[h.file].push(h);
});

console.log('\nFiles with most colorful elements:');
Object.keys(byFile)
  .sort((a, b) => byFile[b].length - byFile[a].length)
  .slice(0, 20)
  .forEach(f => console.log(`${f}: ${byFile[f].length} occurrences`));

fs.writeFileSync('D:/adios/.gemini/antigravity-ide/brain/4e0c50e8-7061-4dd1-92bc-ee7db1f9f01d/scratch/color-hits.json', JSON.stringify(hits, null, 2), 'utf8');
