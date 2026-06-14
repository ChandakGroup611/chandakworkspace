const fs = require('fs');
let content = fs.readFileSync('d:/adios/lib/actions/requirements.ts', 'utf8');

// The duplicates are before line 366. We can just use string replace to remove the first ones.
const fetchReqStatRegex = /export async function fetchRequirementStatuses\(\) \{[\s\S]*?return data \|\| \[\];\r?\n\}/;
content = content.replace(fetchReqStatRegex, '');

const genAppFlowRegex = /export async function generateApprovalFlow\(reqId: string, performedBy: string\) \{[\s\S]*?revalidatePath\(\`\/requirements\/\$\{reqId\}\`\);\r?\n\}/;
content = content.replace(genAppFlowRegex, '');

fs.writeFileSync('d:/adios/lib/actions/requirements.ts', content);
console.log("Duplicates removed.");
