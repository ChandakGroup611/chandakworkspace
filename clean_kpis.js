const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'components/dashboard/widgets/ExecutiveKPIWidget.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/className="h-full border-[^ ]*\/20 bg-gradient-to-br from-surface to-[^ ]* hover:to-[^ ]* dark:from-[^ ]* dark:to-[^ ]* overflow-hidden relative"/g, 
  'className="h-full overflow-hidden relative theme-card-structural"');

fs.writeFileSync(file, content);
console.log('Done!');
