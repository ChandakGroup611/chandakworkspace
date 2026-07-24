const fs = require('fs');
const path = require('path');

const themesDir = path.join(__dirname, 'src', 'styles', 'themes');
const files = fs.readdirSync(themesDir).filter(f => f.endsWith('.css'));

files.forEach(file => {
  const filePath = path.join(themesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Wrap [data-theme="xxx"] with :where() to reduce specificity.
  // Example: [data-theme="light-neumorphic"] -> :where([data-theme="light-neumorphic"])
  content = content.replace(/\[data-theme="([^"]+)"\]/g, ':where([data-theme="$1"])');
  
  // Also strip !important from border, background, color just to be safe
  content = content.replace(/(background(?:-color)?|color|border(?:-color)?):\s*([^;!]+)\s*!important\s*;/g, '$1: $2;');
  
  fs.writeFileSync(filePath, content);
  console.log(`Lowered specificity for ${file}`);
});
console.log('Successfully applied :where() to theme scopes to enable true Tailwind utility overrides!');
