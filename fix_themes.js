const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.resolve(dir, file);
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

const files = walk(path.join(__dirname, 'app'));

let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/const isLightMode = theme === "executive-light";/g, 'const isLightMode = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);');
  content = content.replace(/const isLight = theme === "executive-light";/g, 'const isLight = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);');
  content = content.replace(/isLight = theme === "executive-light";/g, 'isLight = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);');
  content = content.replace(/isLightMode = theme === "executive-light";/g, 'isLightMode = ["executive-light", "material-ocean", "aurora-breeze"].includes(theme);');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Successfully updated ${count} files.`);
