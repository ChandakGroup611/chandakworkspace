const fs = require('fs');
const { execSync } = require('child_process');

try {
  const files = execSync('git grep -l "rounded-t-2xl"').toString().split('\n').filter(Boolean);
  
  for(const f of files) {
    if (!f.endsWith('.tsx') && !f.endsWith('.ts')) continue;
    
    console.log(`Processing ${f}...`);
    const content = fs.readFileSync(f, 'utf8');
    const newContent = content.replace(/ rounded-t-2xl/g, '')
                              .replace(/rounded-t-2xl /g, '')
                              .replace(/rounded-t-2xl/g, '');
                              
    fs.writeFileSync(f, newContent);
    console.log(`Fixed ${f}`);
  }
} catch (e) {
  console.error("Error:", e.message);
}
