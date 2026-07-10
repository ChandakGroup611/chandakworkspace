const fs = require('fs');
const path = require('path');

function findFiles(dir, ext) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) results = results.concat(findFiles(filePath, ext));
    else if (filePath.endsWith(ext)) results.push(filePath);
  });
  return results;
}

const files = findFiles('d:/adios/app', '.tsx').concat(findFiles('d:/adios/components', '.tsx'));

let totalModified = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // A helper to replace complex ternaries based on keywords
  // We use a function replacement to dynamically analyze the true/false sides
  
  // Replace ${isLightMode ? '...' : '...'}
  content = content.replace(/\$\{isLight(Mode)?\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]\}/g, (match, mode, lightStr, darkStr) => {
    let newStr = lightStr;
    
    // Backgrounds
    if (newStr.includes('bg-white') && (darkStr.includes('bg-[#') || darkStr.includes('bg-gray-') || darkStr.includes('bg-black'))) {
      newStr = newStr.replace('bg-white', 'bg-surface');
      if (newStr.includes('shadow-sm')) {
        newStr = newStr.replace('shadow-sm', 'shadow-[var(--shadow-ambient)]');
      }
    }
    if (newStr.includes('bg-gray-50') && (darkStr.includes('bg-white/') || darkStr.includes('bg-transparent'))) {
      newStr = newStr.replace('bg-gray-50', 'bg-elevated').replace('bg-gray-50/50', 'bg-elevated');
    }
    if (newStr.includes('bg-gray-100') && (darkStr.includes('bg-white/') || darkStr.includes('bg-black/'))) {
      newStr = newStr.replace('bg-gray-100', 'bg-elevated');
    }

    // Texts
    if (newStr.includes('text-gray-900') || newStr.includes('text-gray-800') || newStr.includes('text-black')) {
      newStr = newStr.replace(/text-(gray-900|gray-800|black)/g, 'text-foreground');
    }
    if (newStr.includes('text-gray-500') || newStr.includes('text-gray-600') || newStr.includes('text-gray-700')) {
      newStr = newStr.replace(/text-(gray-500|gray-600|gray-700)/g, 'text-muted');
    }
    
    // Borders
    if (newStr.includes('border-gray-200') || newStr.includes('border-gray-100') || newStr.includes('border-gray-300')) {
      newStr = newStr.replace(/border-(gray-200|gray-100|gray-300)/g, 'border-border');
    }

    // Clean up
    newStr = newStr.trim().replace(/\s+/g, ' ');
    return newStr; // Replaces the entire ${...} with just the classes
  });
  
  // Replace plain isLightMode ? '...' : '...'
  content = content.replace(/isLight(Mode)?\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g, (match, mode, lightStr, darkStr) => {
    let newStr = lightStr;
    
    // Backgrounds
    if (newStr.includes('bg-white') && (darkStr.includes('bg-[#') || darkStr.includes('bg-gray-') || darkStr.includes('bg-black'))) {
      newStr = newStr.replace('bg-white', 'bg-surface');
      if (newStr.includes('shadow-sm')) {
        newStr = newStr.replace('shadow-sm', 'shadow-[var(--shadow-ambient)]');
      }
    }
    if (newStr.includes('bg-gray-50') && (darkStr.includes('bg-white/') || darkStr.includes('bg-transparent'))) {
      newStr = newStr.replace('bg-gray-50', 'bg-elevated').replace('bg-gray-50/50', 'bg-elevated');
    }
    if (newStr.includes('bg-gray-100') && (darkStr.includes('bg-white/') || darkStr.includes('bg-black/'))) {
      newStr = newStr.replace('bg-gray-100', 'bg-elevated');
    }

    // Texts
    if (newStr.includes('text-gray-900') || newStr.includes('text-gray-800') || newStr.includes('text-black')) {
      newStr = newStr.replace(/text-(gray-900|gray-800|black)/g, 'text-foreground');
    }
    if (newStr.includes('text-gray-500') || newStr.includes('text-gray-600') || newStr.includes('text-gray-700')) {
      newStr = newStr.replace(/text-(gray-500|gray-600|gray-700)/g, 'text-muted');
    }
    
    // Borders
    if (newStr.includes('border-gray-200') || newStr.includes('border-gray-100') || newStr.includes('border-gray-300')) {
      newStr = newStr.replace(/border-(gray-200|gray-100|gray-300)/g, 'border-border');
    }

    // Clean up
    newStr = newStr.trim().replace(/\s+/g, ' ');
    return `"${newStr}"`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalModified++;
    console.log(`Refactored: ${file}`);
  }
});

console.log(`\nTotal files modified: ${totalModified}`);
