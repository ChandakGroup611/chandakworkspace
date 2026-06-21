const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:/adios');
let changed = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  const target1 = '["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme)';
  const target2 = '["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"]';
  const replacement1 = '["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"].includes(theme)';
  const replacement2 = '["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"]';
  
  if (content.includes(target2)) {
    content = content.split(target2).join(replacement2);
    fs.writeFileSync(f, content);
    changed++;
    console.log("Updated", f);
  } else if (content.includes('theme === "pure-elegance"')) {
    // Check if it's the ThemeProvider line
    if (!content.includes('pristine-white')) {
       console.log("Found manual OR statement in", f);
    }
  }
});

console.log('Modified files:', changed);
