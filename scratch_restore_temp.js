const fs = require('fs');

const source = 'd:\\adios\\temp_TaskCreationWizard.tsx';
const target = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';

// 1. Copy the file back
let content = fs.readFileSync(source, 'utf8');

// The user requested to order Timeline & Classification as: Start Date, Target Due Date, External Link.
// Let's manually replace the 3-column block with a regex since this file is fresh and known.
const regexTimeline = /<div className="grid grid-cols-3 gap-[^>]+>\s*<div className="space-y-1\.5">\s*<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date[^<]*<\/label>[\s\S]*?<div className="space-y-1\.5">\s*<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Due Date[^<]*<\/label>[\s\S]*?<div className="space-y-1\.5">\s*<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link \(Optional\)<\/label>[\s\S]*?<\/div>\s*<\/div>/;

// Actually, wait, let's look at temp_TaskCreationWizard.tsx's timeline block. Let's view it first!
// We'll write this script just to copy the file over first.
fs.writeFileSync(target, content);
console.log("Restored temp_TaskCreationWizard.tsx over TaskCreationWizard.tsx");
