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
  let original = content;

  // Various ways it might be defined
  content = content.replace(/\["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"\]\.includes\(theme\)/g, '["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme)');
  
  content = content.replace(/\['executive-light', 'material-ocean', 'aurora-breeze', 'pure-elegance'\]\.includes\(theme\)/g, '["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme)');

  content = content.replace(/\["executive-light", "material-ocean", "aurora-breeze"\]\.includes\(theme\)/g, '["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme)');
  
  content = content.replace(/\['executive-light', 'material-ocean', 'aurora-breeze'\]\.includes\(theme\)/g, '["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme)');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log('Fixed:', file);
  }
});

console.log('Fixed ' + count + ' files.');
