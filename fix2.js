const fs = require('fs');
const file = 'd:/adios/app/requirements/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  { old: "|| 'Updated requirement parameters.'", new: "|| '-'" },
  { old: "|| 'Designation'", new: "|| '-'" },
  { old: "|| 'Department'", new: "|| '-'" },
  { old: "|| 'Unknown Department'", new: "|| '-'" }
];

let updatedContent = content;
for (const r of replacements) {
  updatedContent = updatedContent.split(r.old).join(r.new);
}

if (updatedContent !== content) {
  fs.writeFileSync(file, updatedContent);
  console.log('Updated page.tsx');
} else {
  console.log('No changes made');
}
