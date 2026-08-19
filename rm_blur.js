const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('d:/adios/app').concat(walk('d:/adios/components')).concat(walk('d:/adios/lib'));

let count = 0;
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    const initial = content;
    
    // Globally replace backdrop-blur related tailwind classes
    content = content.replace(/ backdrop-blur-(sm|md|lg|xl|2xl|3xl|none)/g, '');
    content = content.replace(/backdrop-blur-(sm|md|lg|xl|2xl|3xl|none) /g, '');
    content = content.replace(/backdrop-blur /g, '');
    content = content.replace(/ backdrop-blur/g, '');

    if (content !== initial) {
        fs.writeFileSync(f, content);
        count++;
    }
});

console.log('Removed backdrop-blur from ' + count + ' files globally.');
