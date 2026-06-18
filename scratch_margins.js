const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Grid gaps
content = content.replace(
  'gap-x-8 gap-y-6 mt-6 items-start',
  'gap-x-8 gap-y-4 mt-2 items-start'
);

// 2. Tags Header
content = content.replace(
  '<div className="flex items-center gap-2 mb-4">',
  '<div className="flex items-center gap-2">'
);

// 3. Checklist Header
content = content.replace(
  '<div className="flex items-center justify-between mb-6">',
  '<div className="flex items-center justify-between">'
);

// 4. Extended Properties Header
content = content.replace(
  '<div className={`flex items-center justify-between ${customFields.length > 0 || isAddingField ? "mb-5" : ""}`}>',
  '<div className="flex items-center justify-between">'
);

// 5. Attachments Header (Wait, since we replaced mb-6 in Checklist, if they are identical strings, it might have replaced both if we used replaceAll. Let's use string replace but we need to check if there are multiple mb-6 headers)
// Let's do it robustly using regex or specific substring.

let newContent = content;
// Actually string.replace replaces only the FIRST occurrence.
// The attachments header is currently:
// <div className="flex items-center justify-between mb-6">
// Wait, the previous string replace for checklist might have caught checklist if it was first. Let's do a global replace for the exact attachments header just in case.
newContent = newContent.replace(
  /<div className="flex items-center justify-between mb-6">/g,
  '<div className="flex items-center justify-between">'
);

// Also need to remove the mb-4 from tags:
newContent = newContent.replace(
  /<div className="flex items-center gap-2 mb-4">/g,
  '<div className="flex items-center gap-2">'
);

fs.writeFileSync(path, newContent);
console.log('Margins removed');
