const fs = require('fs');
const path = require('path');
const dir = 'd:/adios/supabase/migrations';
fs.readdirSync(dir).forEach(file => {
    if(!file.endsWith('.sql')) return;
    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    
    // Handle quoted policies
    let regex = /CREATE POLICY \"([^\"]+)\"\s+ON\s+public\.([a-zA-Z0-9_]+)/g;
    content = content.replace(regex, 'DROP POLICY IF EXISTS "$1" ON public.$2;\nCREATE POLICY "$1" ON public.$2');
    
    // Handle unquoted policies
    let regex2 = /CREATE POLICY ([a-zA-Z0-9_]+)\s+ON\s+public\.([a-zA-Z0-9_]+)/g;
    content = content.replace(regex2, 'DROP POLICY IF EXISTS $1 ON public.$2;\nCREATE POLICY $1 ON public.$2');

    fs.writeFileSync(path.join(dir, file), content);
});
console.log('Fixed more policies');
