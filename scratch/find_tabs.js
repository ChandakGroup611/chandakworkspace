const fs = require('fs');
const glob = require('glob'); // Not available by default in Node.js core, let's use a simpler recursive function

const path = require('path');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = `${dir}/${file}`;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else if (name.endsWith('.tsx')) {
      files.push(name);
    }
  }
  return files;
}

const allFiles = [...getFiles('d:/adios/app'), ...getFiles('d:/adios/components')];

const regex = /className=\{`inline-flex items-center gap-2 px-[0-9.]+ py-[0-9.]+ rounded-[a-z]+ text-[a-z]+ font-semibold[^`]+`/g;
const matches = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const found = content.match(regex);
  if (found) {
    matches.push({ file, lines: found });
  }
});

console.log(JSON.stringify(matches, null, 2));
