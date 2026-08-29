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
  
  const parts = content.split('<AppButton');
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      // Find the end of the opening tag
      let tagEnd = parts[i].indexOf('>');
      if (tagEnd > -1) {
        let props = parts[i].substring(0, tagEnd);
        // Check if it's a tab or toggle button
        if ((props.includes('isActive') || props.includes('activeTab') || props.includes('active ===') || props.includes('activeMenu')) && !props.includes('variant=')) {
          // Inject variant="ghost" at the beginning
          parts[i] = ' variant="ghost"' + parts[i];
        }
      }
    }
    content = parts.join('<AppButton');
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    filesModified.push(file);
  }
});

console.log('Modified files:', filesModified);
