const fs = require('fs');

const hostPath = 'D:/adios/components/vehicle/FleetDeskHost.tsx';
const code = fs.readFileSync(hostPath, 'utf8');
const lines = code.split('\n');

const editLines = lines.slice(12366, 13745);

let depth = 0;
const stack = [];

editLines.forEach((line, idx) => {
  const lineNum = 12367 + idx;
  // Match opening tags <div or <TransactionFormLayout or <AppButton etc.
  const tags = line.match(/<\/?([a-zA-Z0-9_-]+)[^>]*\/?>/g) || [];
  tags.forEach(tag => {
    if (tag.endsWith('/>')) {
      // self closing
    } else if (tag.startsWith('</')) {
      const tagName = tag.match(/<\/([a-zA-Z0-9_-]+)>/)?.[1];
      const popped = stack.pop();
      if (popped !== tagName) {
        console.log(`Mismatch at line ${lineNum}: expected </${popped}>, got ${tag}`);
      }
    } else {
      const tagName = tag.match(/<([a-zA-Z0-9_-]+)/)?.[1];
      if (tagName && !['input', 'img', 'br', 'hr'].includes(tagName)) {
        stack.push(tagName);
      }
    }
  });
});

console.log('Remaining open stack:', stack);
