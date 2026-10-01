const fs = require('fs');
const path = require('path');

const files = [
  'app/masters/vendors/page.tsx',
  'app/masters/designations/page.tsx',
  'app/masters/departments/page.tsx',
  'app/learning/courses/page.tsx',
  'app/knowledge/articles/page.tsx',
  'app/amc/reports/page.tsx',
  'app/amc/analytics/page.tsx'
];

for (const rel of files) {
  const file = path.join('D:/adios', rel);
  if (!fs.existsSync(file)) {
    console.log('Not found:', file);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  content = content.replace(/\s*description="[^"]*"/g, '');
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Cleaned:', rel);
  } else {
    console.log('No change:', rel);
  }
}
