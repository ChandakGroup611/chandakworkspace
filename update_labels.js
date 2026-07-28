const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content.replace(/<label([^>]*)text-xs([^>]*)>/g, '<label$1text-sm$2>');
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log('Updated', filePath);
  }
}

function findFiles(dir, ext) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    if (!fullPath.includes('node_modules') && !fullPath.includes('.next') && !fullPath.includes('.git')) {
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findFiles(fullPath, ext));
      } else if (fullPath.endsWith(ext)) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const tsxFiles = findFiles('d:/adios', '.tsx');
tsxFiles.forEach(replaceInFile);

const tsFiles = findFiles('d:/adios', '.ts');
tsFiles.forEach(replaceInFile);
