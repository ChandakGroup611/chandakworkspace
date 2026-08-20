const fs = require('fs');
const path = require('path');

const dir = path.join('d:', 'adios', 'components', 'tickets');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const searchString = `className="w-full h-11 px-4 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 disabled:opacity-50"`;
const replaceString = `className={\`w-full h-11 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-theme-btn-primary/50 disabled:opacity-50 \${ "theme-input-structural text-foreground" }\`}`;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes(searchString)) {
    content = content.split(searchString).join(replaceString);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
