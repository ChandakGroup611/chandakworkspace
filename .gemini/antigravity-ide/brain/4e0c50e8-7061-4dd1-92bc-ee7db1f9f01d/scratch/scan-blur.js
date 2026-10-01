const fs = require('fs');
const path = require('path');

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === '.system_generated') continue;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDir(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allTsx = scanDir('D:/adios');

const blurHits = [];
for (const file of allTsx) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('blur-[100px]') || line.includes('blur-[120px]') || line.includes('blur-[150px]') || line.includes('blur-3xl') || line.includes('blur-2xl')) {
      // Check if it is a decorative background blob
      if (line.includes('rounded-full') || line.includes('-z-10') || line.includes('pointer-events-none')) {
        blurHits.push({ file: path.relative('D:/adios', file), line: idx + 1, text: line.trim() });
      }
    }
  });
}

console.log('Atmospheric blur hits:', blurHits);
