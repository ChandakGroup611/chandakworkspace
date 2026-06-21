const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk('d:/adios/components/tasks');

const replacements = [
  // isLightMode replacements
  ['isLightMode ? "text-gray-900" : "text-white"', '"text-foreground"'],
  ['isLightMode ? "text-slate-900" : "text-white"', '"text-foreground"'],
  ['isLightMode ? "text-gray-800" : "text-gray-200"', '"text-foreground"'],
  ['isLightMode ? "text-gray-700" : "text-gray-300"', '"text-muted"'],
  ['isLightMode ? "text-gray-600" : "text-gray-400"', '"text-muted"'],
  ['isLightMode ? "text-gray-500" : "text-gray-400"', '"text-muted"'],
  ['isLightMode ? "bg-white border-gray-200" : "bg-[#0a0c16] border-white/10"', '"bg-surface border-subtle"'],
  ['isLightMode ? "bg-white border-gray-200" : "bg-[#1f2233] border-white/10"', '"bg-surface border-subtle"'],
  ['isLightMode ? "bg-white border-gray-200" : "bg-black/20 border-white/10"', '"bg-surface border-subtle"'],
  ['isLightMode ? "bg-white border-gray-200" : "bg-white/[0.01] border-white/5"', '"bg-surface border-subtle"'],
  ['isLightMode ? "border-gray-200 bg-gray-50/50" : "border-white/5 bg-black/20"', '"border-subtle bg-elevated"'],
  ['isLightMode ? "bg-gray-50 border-gray-200" : "bg-black/20 border-white/5"', '"bg-elevated border-subtle"'],
  ['isLightMode ? "bg-gray-50 border-gray-200" : "bg-white/[0.02] border-white/10"', '"bg-elevated border-subtle"'],
  ['isLightMode ? "border-gray-100 bg-white" : "border-white/5 bg-white/5"', '"border-subtle bg-surface"'],
  ['isLightMode ? "text-blue-600" : "text-blue-400"', '"text-accent"'],
  ['isLightMode ? "text-purple-600" : "text-purple-400"', '"text-accent-secondary"'],
  ['isLightMode ? "text-emerald-600" : "text-emerald-400"', '"text-success"'],
  ['isLightMode ? "bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-tl-sm" : "bg-indigo-900/30 border border-indigo-500/20 text-indigo-100 rounded-tl-sm"', '"bg-accent/10 border border-accent/20 text-accent rounded-tl-sm"'],
  ['isLightMode ? "bg-gray-100 text-gray-800 rounded-tl-sm" : "bg-[#1f2233] text-gray-200 rounded-tl-sm"', '"bg-elevated text-foreground rounded-tl-sm"'],
  ['isLightMode ? "bg-white border-gray-300" : "bg-[#0a0c16] border-white/10"', '"bg-surface border-subtle"'],
  ['isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"', '"bg-surface border-subtle text-foreground"'],
  ['isLightMode ? "text-gray-700 group-hover:text-blue-600" : "text-gray-400 group-hover:text-blue-400"', '"text-muted group-hover:text-accent"'],
  ['isLightMode ? "text-gray-800 group-hover/item:text-purple-600" : "text-gray-200 group-hover/item:text-purple-300"', '"text-foreground group-hover/item:text-accent-secondary"'],
  ['isLightMode ? "bg-purple-100 text-purple-600" : "bg-purple-500/20 text-purple-400"', '"bg-accent-secondary/10 text-accent-secondary"'],
  ['isLightMode ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/20 text-indigo-400"', '"bg-accent/10 text-accent"'],
  ['isLightMode ? "bg-blue-100 text-blue-600" : "bg-blue-500/20 text-blue-400"', '"bg-accent/10 text-accent"'],
  ['isLightMode ? "bg-emerald-100 text-emerald-600" : "bg-emerald-500/20 text-emerald-400"', '"bg-success/10 text-success"'],
  ['isLightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400"', '"bg-accent-secondary/10 text-accent-secondary"'],
  ['isLightMode ? "bg-gray-50" : "bg-white/5"', '"bg-elevated"'],
  ['isLightMode ? "bg-white border-gray-200 focus-within:border-emerald-500" : "bg-black/30 border-white/10 focus-within:border-emerald-500/50"', '"bg-surface border-subtle focus-within:border-success"'],
  ['isLightMode ? "text-gray-900 placeholder:text-gray-400" : "text-white placeholder:text-gray-500"', '"text-foreground placeholder:text-muted"'],
  ['isLightMode ? "bg-white border-gray-200" : "bg-black/30 border-white/10"', '"bg-surface border-subtle"'],
  ['isLightMode ? "border-gray-200 bg-white hover:border-blue-300 shadow-sm" : "border-white/10 bg-black/20 hover:border-blue-500/50"', '"border-subtle bg-surface hover:border-accent shadow-sm"'],
  ['isLightMode ? "border-gray-300 bg-gray-50" : "border-gray-600 bg-black/40"', '"border-subtle bg-elevated"'],

  // dark: modifier generic cleanup
  ['bg-white dark:bg-[#06080f]', 'bg-surface'],
  ['bg-white dark:bg-[#0f111a]', 'bg-surface'],
  ['bg-white dark:bg-[#1a1d2d]', 'bg-surface'],
  ['bg-white dark:bg-slate-950', 'bg-surface'],
  ['bg-white dark:bg-black', 'bg-surface'],
  ['bg-gray-50 dark:bg-[#1a1d2d]', 'bg-elevated'],
  ['bg-gray-50 dark:bg-white/5', 'bg-elevated'],
  ['bg-gray-50 dark:bg-gray-800', 'bg-elevated'],
  ['bg-gray-50/50 dark:bg-white/[0.02]', 'bg-elevated'],
  ['bg-gray-100 dark:bg-white/10', 'bg-elevated'],
  ['bg-gray-200 dark:bg-gray-700', 'bg-border'],
  ['bg-gray-200 dark:bg-gray-800', 'bg-border'],
  ['bg-gray-200 dark:bg-white/10', 'bg-border'],
  
  ['text-gray-900 dark:text-white', 'text-foreground'],
  ['text-gray-900 dark:text-gray-100', 'text-foreground'],
  ['text-gray-900 dark:text-gray-300', 'text-foreground'],
  ['text-gray-800 dark:text-white', 'text-foreground'],
  ['text-gray-800 dark:text-gray-200', 'text-foreground'],
  ['text-gray-700 dark:text-gray-300', 'text-muted'],
  ['text-gray-600 dark:text-gray-400', 'text-muted'],
  ['text-gray-500 dark:text-gray-400', 'text-muted'],
  ['text-gray-500 dark:text-gray-500', 'text-muted'],
  
  ['border-gray-300 dark:border-gray-700', 'border-subtle'],
  ['border-gray-200 dark:border-white/10', 'border-subtle'],
  ['border-gray-200 dark:border-white/5', 'border-subtle'],
  ['border-gray-200 dark:border-gray-700', 'border-subtle'],
  ['border-gray-100 dark:border-white/5', 'border-subtle'],
  ['border-white dark:border-[#0f111a]', 'border-surface'],
  ['border-white dark:border-[#06080f]', 'border-surface'],
  
  ['ring-white dark:ring-[#0f111a]', 'ring-surface'],
  
  ['hover:bg-gray-50 dark:hover:bg-white/5', 'hover:bg-elevated'],
  ['hover:bg-slate-300/50 dark:hover:bg-slate-700/50', 'hover:bg-border/50'],
  ['hover:text-gray-900 dark:hover:text-white', 'hover:text-foreground'],
  ['hover:bg-gray-100 dark:hover:bg-white/5', 'hover:bg-elevated'],
  
  ['text-emerald-600 dark:text-emerald-400', 'text-success'],
  ['text-rose-600 dark:text-rose-400', 'text-danger'],
  ['text-blue-600 dark:text-blue-400', 'text-accent'],
  ['text-purple-600 dark:text-purple-400', 'text-accent-secondary'],
  ['text-indigo-600 dark:text-indigo-400', 'text-accent']
];

// Complex generic regex cleanup for leftovers
const regexes = [
  // Remove dark: classes that were missed or are singular
  { re: /dark:[a-zA-Z0-9\-\/\[\]#\.]+\s?/g, sub: '' },
  // Clean up double spaces
  { re: /\s{2,}/g, sub: ' ' },
  // Remove empty classNames or trailing spaces in classes
  { re: /className="\s+"/g, sub: 'className=""' },
  { re: /className={`\s+`}/g, sub: 'className={``}' }
];

let totalReplaced = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  for (const [find, replace] of replacements) {
    if (content.includes(find)) {
      content = content.split(find).join(replace);
      changed = true;
      totalReplaced++;
    }
  }

  for (const { re, sub } of regexes) {
    if (re.test(content)) {
      content = content.replace(re, sub);
      changed = true;
      totalReplaced++;
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, content);
  }
}

console.log("Refactor tasks complete. Processed " + files.length + " files. Replaced patterns: " + totalReplaced);
