const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'scratch' || file === 'brain') return;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const allFiles = walk(path.join(__dirname, 'app')).concat(walk(path.join(__dirname, 'components'))).concat(walk(path.join(__dirname, 'lib')));

let modifiedCount = 0;

const regex1 = /\["light-neumorphic",\s*"pure-white",\s*"pure-white-neumorphic"\]/g;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (regex1.test(content)) {
    content = content.replace(regex1, '["light-neumorphic", "pure-white", "pure-white-neumorphic", "amazon-prime-upi"]');
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
});

console.log(`Updated ${modifiedCount} files.`);
