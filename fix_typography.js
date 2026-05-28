const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
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

const dirs = ['components', 'app', 'lib'];
let allFiles = [];
dirs.forEach(d => {
  allFiles = allFiles.concat(walk(path.join(__dirname, d)));
});

let count = 0;
allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/text-\[7px\]/g, 'text-[0.6rem]');
  content = content.replace(/text-\[8px\]/g, 'text-[0.65rem]');
  content = content.replace(/text-\[9px\]/g, 'text-[0.7rem]');
  content = content.replace(/text-\[10px\]/g, 'text-xs');
  content = content.replace(/text-\[11px\]/g, 'text-[0.8rem]');
  content = content.replace(/text-\[12px\]/g, 'text-xs');
  content = content.replace(/text-\[13px\]/g, 'text-sm');
  content = content.replace(/text-\[14px\]/g, 'text-sm');
  content = content.replace(/text-\[15px\]/g, 'text-base');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
  }
});

console.log(`Successfully updated typography in ${count} files.`);
