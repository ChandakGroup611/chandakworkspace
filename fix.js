const fs = require('fs');
const file = 'd:/adios/app/requirements/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  { old: "|| 'Standard Business Request'}", new: "|| '-'}" },
  { old: "|| 'HIGH'}", new: "|| '-'}" },
  { old: "|| 'Cost Optimization & Efficiency'}", new: "|| '-'}" },
  { old: "|| 'No immediate impact details provided.'}", new: "|| '-'}" },
  { old: "|| 'Requires integration approval and system setup verification.'}", new: "|| '-'}" },
  { old: "|| 'Technical architecture, schema specifications, and API integration scope.' }}", new: "|| '-' }}" },
  { old: "|| 'Not specified'}", new: "|| '-'}" },
  { old: "|| 'Not specified'}</span>", new: "|| '-'}</span>" },
  { old: "|| 'No dependency notes.'}", new: "|| '-'}" },
  { old: "|| 'Provide operational justification for requirement execution.'}", new: "|| '-'}" },
  { old: "|| 'Detailed requirement workflow description.'}", new: "|| '-'}" },
  { old: "|| 'Standard Team'}", new: "|| '-'}" },
  { old: "|| 'Unknown User'}", new: "|| '-'}" },
  { old: "|| 'Unknown User'}</div>", new: "|| '-'}</div>" },
  { old: "|| 'IT & Digital Transformation'}", new: "|| '-'}" }
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
