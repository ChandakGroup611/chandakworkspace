const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('d:/adios/app').concat(walk('d:/adios/components'));
const issues = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf-8');
  if(content.includes('<table') && !content.includes('<AppTable')) {
    issues.push(f + ' uses raw <table> instead of <AppTable>');
  }
  if(content.includes('<button') && !content.includes('<AppButton')) {
    issues.push(f + ' uses raw <button> instead of <AppButton>');
  }
  if(content.match(/className="[^"]*bg-white dark:bg-\[#0a0d14\][^"]*rounded-lg[^"]*"/)) {
    issues.push(f + ' uses hardcoded card styles instead of <AppCard>');
  }
  if(content.includes('bg-white rounded-lg shadow') || content.includes('bg-white shadow rounded')) {
    issues.push(f + ' uses hardcoded light-only card styles (missing dark mode)');
  }
  if(content.match(/<div className="[^"]*modal[^"]*"/i) || content.match(/<div className="[^"]*fixed inset-0[^"]*bg-black\/50/)) {
     if(!content.includes('AppModal') && !content.includes('Dialog')) {
         issues.push(f + ' uses raw hardcoded modal backdrop instead of standard component');
     }
  }
});

fs.writeFileSync('d:/adios/ui_issues.txt', issues.join('\n'));
console.log(`Found ${issues.length} potential issues.`);
