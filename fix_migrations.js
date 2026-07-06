const fs = require('fs');
const path = require('path');
const dir = 'd:/adios/supabase/migrations';
fs.readdirSync(dir).forEach(file => {
    if(!file.endsWith('.sql')) return;
    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    const regex = /CREATE POLICY \"([^\"]+)\"\s+ON\s+public\.([a-zA-Z0-9_]+)/g;
    content = content.replace(regex, 'DROP POLICY IF EXISTS "$1" ON public.$2;\nCREATE POLICY "$1" ON public.$2');
    fs.writeFileSync(path.join(dir, file), content);
});
console.log('Fixed policies');
