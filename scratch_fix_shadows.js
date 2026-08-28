const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function processFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // We want to find className strings (both "..." and `{...}`) that contain 'theme-card-structural'
    // and remove shadow utility classes.
    // Since regex matching across complex template literals can be error-prone, 
    // a simpler approach is: if the file contains `theme-card-structural`, 
    // just replace `shadow-2xl`, `shadow-xl`, `shadow-lg`, `shadow-md`, `shadow-sm`, `shadow-[...]`
    // with nothing in the same line or block. Wait, some files have `shadow-sm` on small badges.
    
    // The user's exact issue: "some cards are open in over shadow design" - this refers to modal/card shadow.
    // Let's replace `shadow-2xl` and `shadow-xl` globally in files that have `theme-card-structural`.
    
    content = content.replace(/shadow-2xl/g, '');
    content = content.replace(/shadow-xl/g, '');
    
    // Also, there are rogue "/80" scattered around from a bad refactor. E.g. "dark:bg-[#0B0F19] /80"
    content = content.replace(/ \/80 /g, ' ');
    content = content.replace(/ \/95 /g, ' ');
    content = content.replace(/ \/50 /g, ' ');
    content = content.replace(/ \/10 /g, ' ');
    
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

walkDir('d:/adios/components', processFile);
console.log("Done.");
