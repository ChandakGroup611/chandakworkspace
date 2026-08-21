const fs = require('fs');
const path = require('path');

const themesDir = path.join(__dirname, 'src', 'styles', 'themes');

function updateFile(filename, replacePairs) {
    const filepath = path.join(themesDir, filename);
    if (!fs.existsSync(filepath)) return;
    let content = fs.readFileSync(filepath, 'utf8');
    let changed = false;
    for (const [findStr, replaceStr] of replacePairs) {
        if (content.includes(findStr)) {
            content = content.replace(findStr, replaceStr);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(filepath, content, 'utf8');
        console.log('Updated ' + filename);
    }
}

updateFile('amazon-prime-upi-v2.css', [
    ['--text-secondary: #565959;', '--text-secondary: #333333;'],
    ['--text-muted: #888888;', '--text-muted: #565959;']
]);

updateFile('amazon-v2.css', [
    ['--text-secondary: #cccccc;', '--text-secondary: #f1f5f9;'],
    ['--text-muted: #888888;', '--text-muted: #cccccc;']
]);

updateFile('light-neumorphic-v2.css', [
    ['--text-secondary: #64748b;', '--text-secondary: #334155;'],
    ['--text-muted: #94a3b8;', '--text-muted: #475569;']
]);

console.log('Done!');
