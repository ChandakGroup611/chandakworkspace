const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, 'components/dashboard/panels'),
  path.join(__dirname, 'components/dashboard/widgets')
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.tsx')) {
      const filePath = path.join(dir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace className="panel" with className="panel theme-card-structural"
      content = content.replace(/className="panel"/g, 'className="panel theme-card-structural"');
      
      // Replace className="metric-card" with className="metric-card theme-card-structural"
      content = content.replace(/className="metric-card(?! theme-card-structural)"/g, 'className="metric-card theme-card-structural"');
      content = content.replace(/className={`metric-card(?! theme-card-structural)/g, 'className={`metric-card theme-card-structural');

      fs.writeFileSync(filePath, content);
    }
  });
});
