const fs = require('fs');
const path = require('path');

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

const files = walk('d:\\adios\\components').concat(walk('d:\\adios\\app'));
let count = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const target1 = `["executive-light", "material-ocean", "aurora-breeze"].includes(theme)`;
  const target2 = `['executive-light', 'material-ocean', 'aurora-breeze'].includes(theme)`;
  
  if (content.includes(target1) || content.includes(target2)) {
    content = content.replace(/\["executive-light", "material-ocean", "aurora-breeze"\]\.includes\(theme\)/g, `["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme)`);
    content = content.replace(/\['executive-light', 'material-ocean', 'aurora-breeze'\]\.includes\(theme\)/g, `["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme)`);
    
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log("Fixed:", file);
  }
});

console.log(`Fixed ${count} files.`);
