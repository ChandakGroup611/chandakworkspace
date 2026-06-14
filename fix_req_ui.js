const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/[id]/page.tsx', 'utf8');

// Replace dark mode only classes with light/dark adaptive classes
content = content.replace(/text-white/g, 'text-gray-900 dark:text-white');
content = content.replace(/text-gray-200/g, 'text-gray-900 dark:text-gray-200');
content = content.replace(/text-gray-300/g, 'text-gray-800 dark:text-gray-300');
content = content.replace(/text-gray-400/g, 'text-gray-600 dark:text-gray-400');
content = content.replace(/border-white\/10/g, 'border-gray-200 dark:border-white/10');
content = content.replace(/bg-white\/5/g, 'bg-gray-50 dark:bg-white/5');
content = content.replace(/bg-\[\#0a0d14\]/g, 'bg-white dark:bg-[#0a0d14]');
content = content.replace(/bg-\[\#050505\]/g, 'bg-white dark:bg-[#050505]');
// Fix any double replacements
content = content.replace(/text-gray-900 dark:text-gray-900 dark:text-white/g, 'text-gray-900 dark:text-white');

// Adjust spacing
content = content.replace(/mt-8 space-y-6/g, 'mt-4 space-y-4');
content = content.replace(/mt-4 flex/g, 'mt-2 flex');
content = content.replace(/pb-20/g, 'pb-10');

fs.writeFileSync('d:/adios/app/requirements/[id]/page.tsx', content);
console.log('Fixed styling');
