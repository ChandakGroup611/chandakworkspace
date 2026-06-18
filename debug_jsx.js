const fs = require('fs');
const content = fs.readFileSync('d:\\adios\\components\\tasks\\TaskCreationWizard.tsx', 'utf8');

const openingTags = [];
const regex = /<([a-zA-Z][a-zA-Z0-9]*)(?![^>]*\/>)[^>]*>/g;
const closingRegex = /<\/([a-zA-Z][a-zA-Z0-9]*)>/g;

// A simple stack trace for JSX is hard with regex because of { } blocks containing tags.
// Let's just use an AST parser.

const { execSync } = require('child_process');
try {
  execSync('npm i -D @babel/core @babel/preset-react @babel/preset-typescript');
  const babel = require('@babel/core');
  babel.transformSync(content, {
    presets: ['@babel/preset-react', '@babel/preset-typescript'],
    filename: 'TaskCreationWizard.tsx'
  });
  console.log("BABEL SUCCESS");
} catch (e) {
  console.log("BABEL ERROR:", e.message);
}
