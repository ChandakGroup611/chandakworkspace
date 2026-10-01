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
console.log('Total UI Files to scan:', allFiles.length);

const issues = {
  rainbowGradients: [],
  marketingSubtext: [],
  unnecessaryCardNesting: [],
  hardcodedColors: [],
  oversizedHeadings: [],
  excessiveBadgesOrPills: []
};

allFiles.forEach(file => {
  const relPath = path.relative('D:/adios', file);
  if (relPath.includes('scratch') || relPath.endsWith('page_backup.tsx')) return;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // 1. Rainbow gradients or AI atmospheric blobs
    if ((line.includes('bg-gradient-to-r') || line.includes('bg-gradient-to-br') || line.includes('from-purple-') || line.includes('from-pink-') || line.includes('from-indigo-')) && !relPath.includes('dashboard.css') && !relPath.includes('login')) {
      if (!line.includes('bg-gradient-to-b') && !line.includes('from-surface')) {
        issues.rainbowGradients.push({ file: relPath, line: idx + 1, code: line.trim() });
      }
    }

    // 2. Marketing subtext / filler phrases
    if (line.includes('v2.0') || line.includes('Realtime Engine') || line.includes('Smart AI') || line.includes('Powered by') || line.includes('Manage and monitor all your')) {
      issues.marketingSubtext.push({ file: relPath, line: idx + 1, code: line.trim() });
    }

    // 3. Oversized text (text-4xl, text-5xl on non-dashboard metric/hero)
    if ((line.includes('text-4xl') || line.includes('text-5xl') || line.includes('text-6xl')) && !relPath.includes('login') && !relPath.includes('dashboard') && !relPath.includes('analytics')) {
      issues.oversizedHeadings.push({ file: relPath, line: idx + 1, code: line.trim() });
    }
  });
});

console.log('--- MASTER UI SCAN SUMMARY ---');
console.log('Rainbow Gradients:', issues.rainbowGradients.length);
console.log('Marketing Subtext:', issues.marketingSubtext.length);
console.log('Oversized Headings on non-dashboards:', issues.oversizedHeadings.length);

console.log('\nSample Rainbow Gradients (first 10):');
issues.rainbowGradients.slice(0, 10).forEach(i => console.log(`[${i.file}:${i.line}] ${i.code.slice(0, 90)}`));

console.log('\nSample Marketing Subtext:');
issues.marketingSubtext.forEach(i => console.log(`[${i.file}:${i.line}] ${i.code.slice(0, 90)}`));

console.log('\nSample Oversized Headings:');
issues.oversizedHeadings.slice(0, 10).forEach(i => console.log(`[${i.file}:${i.line}] ${i.code.slice(0, 90)}`));
