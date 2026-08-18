const fs = require('fs');

const files = [
  'app/requirements/page.tsx',
  'app/requirements/approvals/page.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // 1. Replace all header backgrounds
  content = content.replace(/bg-gradient-to-r from-[a-z]+-500\/15 via-(?:surface|rose)-[a-z0-9]+\/[0-9]+ to-(?:surface|elevated)\/[0-9]+ dark:from-[a-z]+-600\/30 dark:via-(?:elevated|rose)-[a-z0-9]+\/[0-9]+ dark:to-elevated\/40( select-none)?/g, 'bg-surface dark:bg-elevated/50');

  // 2. Replace the little colored indicator bars in headers
  content = content.replace(/className=\"w-1\.5 h-4 rounded-full bg-[a-z]+-500 shadow-xs( animate-pulse)?\"/g, 'className=\"w-1.5 h-4 rounded-full bg-accent shadow-xs$1\"');

  // 3. Replace colored header icons
  content = content.replace(/className=\"w-4 h-4 text-[a-z]+-[0-9]{3} dark:text-[a-z]+-[0-9]{3}\"/g, 'className=\"w-4 h-4 text-accent\"');

  // 4. Replace tinted card backgrounds (like Analysis Remarks, Impact Analysis, Target Audiences)
  content = content.replace(/bg-[a-z]+-500\/10 dark:bg-[a-z]+-500\/20 border border-[a-z]+-200 dark:border-[a-z]+-800\/60/g, 'bg-surface/50 dark:bg-elevated/20 border border-border/60');
  content = content.replace(/bg-[a-z]+-500\/5 dark:bg-[a-z]+-500\/10 border border-[a-z]+-200 dark:border-[a-z]+-800\/60/g, 'bg-surface/50 dark:bg-elevated/20 border border-border/60');

  // 5. Replace coloured pills (purple/rose) in details tab
  content = content.replace(/bg-[a-z]+-500\/15 text-[a-z]+-700 dark:text-[a-z]+-300 border border-[a-z]+-500\/30/g, 'bg-surface dark:bg-elevated text-foreground border border-border/60');

  // 6. Yellow highlight boxes
  content = content.replace(/bg-amber-50 dark:bg-amber-900\/20 border-l-4 border-amber-500/g, 'bg-surface dark:bg-elevated/40 border-l-4 border-accent');

  // 7. Icon colors in the content
  content = content.replace(/text-[a-z]+-500 hover:text-[a-z]+-600/g, 'text-accent hover:text-accent/80');
  content = content.replace(/hover:bg-[a-z]+-500\/10/g, 'hover:bg-accent/10');

  fs.writeFileSync(file, content);
  console.log('Standardized: ' + file);
}
