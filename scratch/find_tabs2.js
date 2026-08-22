const fs = require('fs');

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

const matches = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('setActiveTab(') && content.includes('<AppButton')) {
    matches.push(file);
  }
});

console.log(matches);
