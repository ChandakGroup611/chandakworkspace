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
console.log('Total TSX files scanned:', allTsx.length);

const hits = [];
for (const file of allTsx) {
  const content = fs.readFileSync(file, 'utf8');
  // Look for <PageHeader or <WorkingDocumentLayout or <TransactionFormLayout with description=
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if ((line.includes('<PageHeader') || line.includes('<WorkingDocumentLayout') || line.includes('<TransactionFormLayout')) && line.includes('description=')) {
      hits.push({ file: path.relative('D:/adios', file), line: idx + 1, text: line.trim() });
    }
    // Also check for multiline description right below PageHeader
    if (line.includes('description="') && (lines[Math.max(0, idx - 1)].includes('PageHeader') || lines[Math.max(0, idx - 2)].includes('PageHeader'))) {
      hits.push({ file: path.relative('D:/adios', file), line: idx + 1, text: line.trim() });
    }
  });
}

console.log('Hits found:', hits);
