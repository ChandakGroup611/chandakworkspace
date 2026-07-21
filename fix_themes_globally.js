const fs = require('fs');
const path = require('path');

const themesDir = 'd:\\adios\\src\\styles\\themes';
const files = [
  'cyberpunk.css',
  'dark-neumorphic.css',
  'glassmorphism.css',
  'industrial-control.css',
  'light-neumorphic.css'
];

files.forEach(file => {
  const filePath = path.join(themesDir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // We want to add !important to specific CSS properties inside the structural classes.
  // We can do this with regex.
  
  const propertiesToForce = [
    'background',
    'background-image',
    'background-color',
    'box-shadow',
    'border',
    'border-color',
    'border-radius',
    'backdrop-filter',
    '-webkit-backdrop-filter',
    'color'
  ];

  propertiesToForce.forEach(prop => {
    // Matches: `  background: linear-gradient(...);`
    // Captures the property and value, ensuring it doesn't already have !important
    const regex = new RegExp(`(^\\s*${prop}\\s*:\\s*)([^;!]+?)(?:\\s*;$)`, 'gm');
    
    // We only want to add !important inside the actual classes, but wait, doing it globally in the file is fine because the file is entirely dedicated to defining the theme's structural classes and root variables! 
    // Wait, we shouldn't add !important to CSS variables in :root or [data-theme="..."] block.
    // CSS variables look like `--bg-primary: #050505;`
    // Our properties are just standard CSS props.
    
    content = content.replace(regex, (match, p1, p2) => {
      // If it already has !important, skip
      if (p2.includes('!important')) return match;
      return `${p1}${p2} !important;`;
    });
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Injected !important into ${file}`);
});
