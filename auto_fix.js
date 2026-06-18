const fs = require('fs');
const babel = require('@babel/core');
const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';

let content = fs.readFileSync(path, 'utf8');

for (let i = 0; i < 5; i++) {
  try {
    babel.transformSync(content, {
      presets: ['@babel/preset-react', '@babel/preset-typescript'],
      filename: 'TaskCreationWizard.tsx'
    });
    console.log("BABEL SUCCESS WITH", i, "DIVS REMOVED");
    fs.writeFileSync(path, content);
    break;
  } catch (e) {
    console.log("Failed, removing one </div>. Error was:", e.message);
    const lastDiv = content.lastIndexOf('</div>');
    if (lastDiv !== -1) {
      content = content.substring(0, lastDiv) + content.substring(lastDiv + 6);
    }
  }
}
