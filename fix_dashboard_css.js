const fs = require('fs');
const path = require('path');

const cssFile = path.join(__dirname, 'components/dashboard/dashboard.css');
let cssContent = fs.readFileSync(cssFile, 'utf8');

// Replace .panel hardcodes
cssContent = cssContent.replace(/\.panel\s*\{\s*background:\s*var\(--bg2\);\s*border:\s*0\.5px solid var\(--border\);\s*border-radius:\s*var\(--r12\);\s*overflow:\s*hidden;\s*box-shadow:[^;]+;\s*backdrop-filter:\s*blur\(10px\);\s*transition:[^\}]+\}/s, (match) => {
  return `.panel {\n    overflow: hidden;\n    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);\n    /* theme-card-structural will provide bg, border, shadow */\n}`;
});

// Replace .metric-card hardcodes
cssContent = cssContent.replace(/\.metric-card\s*\{\s*background:\s*var\(--bg2\);\s*border:\s*0\.5px solid var\(--border\);\s*border-radius:\s*var\(--r12\);\s*padding:\s*16px;\s*position:\s*relative;\s*overflow:\s*hidden;\s*transition:[^;]+;\s*box-shadow:[^\}]+\}/s, (match) => {
  return `.metric-card {\n    padding: 16px;\n    position: relative;\n    overflow: hidden;\n    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);\n    /* theme-card-structural will provide bg, border, shadow */\n}`;
});

// Remove hover shadow overrides
cssContent = cssContent.replace(/\.panel:hover\s*\{[^}]+\}/s, (match) => {
  return `.panel:hover {\n    transform: translateY(-2px);\n    /* box-shadow provided by theme */\n}`;
});

cssContent = cssContent.replace(/\.metric-card:hover\s*\{[^}]+\}/s, (match) => {
  return `.metric-card:hover {\n    transform: translateY(-3px) scale(1.02);\n    /* box-shadow provided by theme */\n}`;
});

fs.writeFileSync(cssFile, cssContent);

// Add theme-card-structural to panels
const panelsDir = path.join(__dirname, 'components/dashboard/panels');
fs.readdirSync(panelsDir).forEach(file => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(panelsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace className="panel" with className="panel theme-card-structural"
    content = content.replace(/className="panel"/g, 'className="panel theme-card-structural"');
    
    // Replace className="metric-card" with className="metric-card theme-card-structural"
    content = content.replace(/className="metric-card(?! theme-card-structural)"/g, 'className="metric-card theme-card-structural"');
    content = content.replace(/className={`metric-card/g, 'className={`metric-card theme-card-structural');

    fs.writeFileSync(filePath, content);
  }
});
