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

  // Replace text ternaries
  content = content.replace(/isLightMode \? "text-gray-900" : "text-white"/g, '"text-foreground"');
  content = content.replace(/isLightMode \? "text-gray-700" : "text-gray-300"/g, '"text-foreground"');
  content = content.replace(/isLightMode \? "text-gray-600" : "text-gray-400"/g, '"text-muted"');
  content = content.replace(/isLightMode \? "text-gray-500" : "text-gray-400"/g, '"text-muted"');
  
  // Replace background + border ternaries
  content = content.replace(/isLightMode \? "bg-white border-gray-200" : "bg-\[#0A0D14\] border-white\/5"/g, '"bg-surface border-border"');
  content = content.replace(/isLightMode \? "bg-white border-gray-200" : "bg-black\/30 border-white\/10"/g, '"bg-surface border-border"');
  content = content.replace(/isLightMode \? "bg-white border-gray-200" : "bg-white\/5 border-white\/10"/g, '"bg-surface border-border"');
  content = content.replace(/isLightMode \? "bg-white border-gray-200 shadow-sm" : "bg-white\/\[0\.02\] border-white\/5 shadow-lg"/g, '"bg-surface border-border shadow-[var(--shadow-ambient)]"');
  content = content.replace(/isLightMode \? "bg-white\/60 border-gray-200\/60 shadow-sm" : "bg-white\/\[0\.02\] border-white\/5 shadow-lg"/g, '"bg-surface border-border shadow-[var(--shadow-ambient)]"');
  content = content.replace(/isLightMode \? "bg-white" : "bg-black\/30"/g, '"bg-surface"');
  content = content.replace(/isLightMode \? "bg-gray-50 text-gray-900" : "bg-\[#070913\] text-white"/g, '"bg-surface text-foreground"');
  
  // Replace border ternaries
  content = content.replace(/isLightMode \? "border-gray-200" : "border-white\/5"/g, '"border-border"');
  content = content.replace(/isLightMode \? "border-gray-200" : "border-white\/10"/g, '"border-border"');
  content = content.replace(/isLightMode \? "border-gray-100" : "border-white\/5"/g, '"border-border"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log("Semantic refactored:", file);
  }
});

console.log(`Refactored ${count} files.`);
