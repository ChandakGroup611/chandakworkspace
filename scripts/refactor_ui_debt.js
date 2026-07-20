const fs = require('fs');
const path = require('path');

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const rootDir = path.join(__dirname, '..');
const appFiles = getAllFiles(path.join(rootDir, 'app'));
const componentFiles = getAllFiles(path.join(rootDir, 'components'));
const files = new Set([...appFiles, ...componentFiles]);

console.log(`Found ${files.size} total files to process.`);

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  
  // Skip components/ui itself to prevent circular imports and breaking the base components
  if (file.includes(path.join('components', 'ui'))) return;

  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  let needsAppButton = false;
  let needsAppTable = false;

  // <button> replacements
  if (content.includes('<button') || content.includes('</button>')) {
    const originalContent = content;
    content = content.replace(/<button([\s\S]*?)>/g, (match, p1) => {
      if (match.includes('<AppButton')) return match;
      
      let variant = 'secondary';
      const classNameMatch = p1.match(/className=["'{](.*?)["'}]/);
      if (classNameMatch) {
        const classes = classNameMatch[1];
        if (classes.includes('bg-accent') || classes.includes('bg-blue') || classes.includes('bg-indigo') || classes.includes('text-white') || classes.includes('bg-primary') || classes.includes('bg-black')) {
          variant = 'primary';
        } else if (classes.includes('bg-red') || classes.includes('bg-rose') || classes.includes('text-red')) {
          variant = 'destructive';
        } else if (classes.includes('transparent') && (classes.includes('text-muted') || classes.includes('text-gray'))) {
          variant = 'ghost';
        } else if (classes.includes('border') && classes.includes('transparent')) {
          variant = 'outline';
        }
      }
      
      needsAppButton = true;
      changed = true;
      return `<AppButton variant="${variant}"${p1}>`;
    });
    
    if (needsAppButton) {
      content = content.replace(/<\/button>/g, '</AppButton>');
    }
  }

  // <table> replacements
  if (content.includes('<table') || content.includes('</table')) {
    needsAppTable = true;
    changed = true;
    
    content = content.replace(/<table\b/g, '<AppTable');
    content = content.replace(/<\/table>/g, '</AppTable>');
    content = content.replace(/<thead\b/g, '<AppTableHeader');
    content = content.replace(/<\/thead>/g, '</AppTableHeader>');
    content = content.replace(/<tbody\b/g, '<AppTableBody');
    content = content.replace(/<\/tbody>/g, '</AppTableBody>');
    content = content.replace(/<tr\b/g, '<AppTableRow');
    content = content.replace(/<\/tr>/g, '</AppTableRow>');
    content = content.replace(/<th\b/g, '<AppTableHead');
    content = content.replace(/<\/th>/g, '</AppTableHead>');
    content = content.replace(/<td\b/g, '<AppTableCell');
    content = content.replace(/<\/td>/g, '</AppTableCell>');
  }

  if (changed) {
    const importsToAdd = [];
    if (needsAppButton && !content.includes('import { AppButton }')) {
      importsToAdd.push('import { AppButton } from "@/components/ui/AppButton";');
    }
    if (needsAppTable && !content.includes('import { AppTable')) {
      importsToAdd.push('import { AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";');
    }

    if (importsToAdd.length > 0) {
      const importRegex = /^import\s+[\s\S]+?from\s+['"].+?['"];?/gm;
      let lastImportMatch = null;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        lastImportMatch = match;
      }

      const importStr = importsToAdd.join('\n') + '\n';
      
      if (lastImportMatch) {
        const insertIndex = lastImportMatch.index + lastImportMatch[0].length;
        content = content.slice(0, insertIndex) + '\n' + importStr + content.slice(insertIndex);
      } else {
        if (content.includes('"use client"') || content.includes("'use client'")) {
            const useClientRegex = /['"]use client['"];?/;
            content = content.replace(useClientRegex, (m) => `${m}\n\n${importStr}`);
        } else {
            content = importStr + '\n' + content;
        }
      }
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Refactored: ${file}`);
  }
});

console.log('Refactoring complete.');
