const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('d:/adios/app/masters');
let fixedCount = 0;

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let original = content;
    
    // Fix textareas and inputs that have bg-surface/5 and text-white
    content = content.replace(/className="([^"]*)bg-surface\/5 border border-white\/10([^"]*)text-white([^"]*)"/g, 'className="$1bg-surface dark:bg-[#0a0d14] border border-border dark:border-white/10$2text-foreground dark:text-white$3"');
    
    // Specifically looking for any other hardcoded white text on inputs/textareas
    content = content.replace(/className="w-full bg-surface\/5 border border-white\/10 rounded-xl p-3 text-sm text-white/g, 'className="w-full bg-surface dark:bg-[#0a0d14] border border-border dark:border-white/10 rounded-xl p-3 text-sm text-foreground dark:text-white');
    
    if(content !== original) {
        fs.writeFileSync(f, content);
        fixedCount++;
        console.log('Fixed', f);
    }
});

console.log('Total files fixed:', fixedCount);
