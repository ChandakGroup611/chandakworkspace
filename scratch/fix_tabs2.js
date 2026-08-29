const fs = require('fs');
const path = require('path');

function findFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.next') && !fullPath.includes('.git')) {
        findFiles(fullPath, filesList);
      }
    } else if (fullPath.endsWith('.tsx')) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

const allTsx = findFiles('d:/adios/components').concat(findFiles('d:/adios/app'));
let filesModified = [];

allTsx.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  let offset = 0;
  while (true) {
    const idx = content.indexOf('<AppButton', offset);
    if (idx === -1) break;
    
    const endIdx = content.indexOf('>', idx);
    if (endIdx === -1) {
      offset = idx + 10;
      continue;
    }
    
    const tag = content.substring(idx, endIdx + 1);
    
    if (tag.includes('isActive') || tag.includes('activeTab') || tag.includes('active ===') || tag.includes('activeMenu')) {
      if (!tag.includes('variant=')) {
        const newTag = tag.replace('<AppButton', '<AppButton variant="ghost"');
        content = content.substring(0, idx) + newTag + content.substring(endIdx + 1);
        offset = idx + newTag.length;
        continue;
      }
    }
    offset = endIdx + 1;
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    filesModified.push(file);
  }
});

console.log('Modified files:', filesModified);
