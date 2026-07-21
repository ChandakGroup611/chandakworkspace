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

const regex1 = /\["executive-light", "material-ocean", "aurora-breeze", "pure-elegance", "pristine-white"\]\.includes\(theme\)/g;
const regex2 = /\['executive-light', 'material-ocean', 'aurora-breeze', 'pure-elegance', 'pristine-white'\]\.includes\(theme\)/g;
const regex3 = /\["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"\]\.includes\(theme\)/g;
const regex4 = /\["executive-light", "material-ocean", "aurora-breeze"\]\.includes\(theme\)/g;

const replacement = `["light-neumorphic", "industrial-control", "glassmorphism"].includes(theme)`;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(regex1, replacement);
  content = content.replace(regex2, replacement);
  content = content.replace(regex3, replacement);
  content = content.replace(regex4, replacement);
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log("Refactored themes in:", file);
  }
});

console.log(`Successfully refactored ${count} files.`);
