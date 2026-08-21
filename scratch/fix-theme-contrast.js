const fs = require('fs');
const path = require('path');

const themesDir = path.join(__dirname, 'src', 'styles', 'themes');

const replaceInFileRegex = (file, replacements) => {
  const filePath = path.join(themesDir, file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [regex, replace] of replacements) {
    if (regex.test(content)) {
      content = content.replace(regex, replace);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
};

// amazon-v2.css (Dark theme)
replaceInFileRegex('amazon-v2.css', [
  [/--text-secondary:\s*#[a-f0-9]+;/i, '--text-secondary: #f1f5f9;'],
  [/--text-muted:\s*#[a-f0-9]+;/i, '--text-muted: #cccccc;']
]);

// light-neumorphic-v2.css
replaceInFileRegex('light-neumorphic-v2.css', [
  [/--text-secondary:\s*#[a-f0-9]+;/i, '--text-secondary: #334155;'],
  [/--text-muted:\s*#[a-f0-9]+;/i, '--text-muted: #475569;']
]);

console.log('Theme updates complete.');
