const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      // skip node_modules and .next
      if (f !== 'node_modules' && f !== '.next' && f !== '.git') {
        walkDir(dirPath, callback);
      }
    } else {
      if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
        callback(path.join(dir, f));
      }
    }
  });
}

const warnings = [];

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find components without "use client" but using hooks
  if (!content.includes('"use client"') && !content.includes("'use client'")) {
    if (content.includes('useState(') || content.includes('useEffect(')) {
      warnings.push(`[Server Component with Hooks] ${filePath}`);
    }
  }

  // Find useEffect missing dependency array entirely
  // e.g. useEffect(() => { ... }) without , []
  const noDepsRegex = /useEffect\s*\(\s*(?:async\s*)?(?:\([^)]*\)|[^=]+)\s*=>\s*\{[^}]*\}\s*\)(?!\s*;?\s*\[)/g;
  let match;
  // This regex is brittle, let's do a simpler check:
  // If the file contains useEffect, let's check for missing dependencies manually by looking at lines
  const lines = content.split('\n');
  
  let inUseEffect = false;
  let useEffectBraces = 0;
  let useEffectStart = 0;

  // Let's just look for Realtime subscription leaks (no removeChannel)
  if (content.includes('.subscribe()') && !content.includes('removeChannel') && !content.includes('unsubscribe')) {
    warnings.push(`[Realtime Leak - No Unsubscribe] ${filePath}`);
  }
  
  // Look for infinite setState loops (setState inside render phase)
  if (content.match(/set[A-Z]\w*\([^)]+\)/) && !content.includes('useEffect') && !content.includes('useCallback') && !content.includes('onClick=') && !content.includes('onChange=')) {
     // A bit noisy, but helps
  }
  
  // Look for Supabase queries without error checking
  const supabaseQueries = content.match(/await supabase\.[^;]+;/g);
  if (supabaseQueries) {
    for (const q of supabaseQueries) {
      if (!content.includes('error') && q.includes('select')) {
        // warnings.push(`[Unchecked Supabase Error] ${filePath}`);
      }
    }
  }
}

console.log("Starting analysis...");
walkDir(path.join(__dirname, 'app'), analyzeFile);
walkDir(path.join(__dirname, 'components'), analyzeFile);
walkDir(path.join(__dirname, 'lib'), analyzeFile);

console.log(`Found ${warnings.length} issues:`);
warnings.forEach(w => console.log(w));
