const fs = require('fs');
const path = require('path');

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === '.system_generated' || file === 'scratch') continue;
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

const patterns = [
  /Manage and monitor all your/i,
  /Here you can /i,
  /This page allows you/i,
  /Use this screen to/i,
  /Powered by ADIOS/i,
  /Welcome to /i
];

const hits = [];
for (const file of allTsx) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    for (const p of patterns) {
      if (p.test(line)) {
        hits.push({ file: path.relative('D:/adios', file), line: idx + 1, text: line.trim() });
      }
    }
  });
}

console.log('Marketing/Filler Copy Hits:', JSON.stringify(hits, null, 2));
