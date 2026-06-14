const fs = require('fs');

let content = fs.readFileSync('d:/adios/lib/actions/requirements.ts', 'utf8');

// Fix dispatchNotification signature inside processApprovalAction
const oldCall = `await dispatchNotification(
      'REQUIREMENT',
      \`STATUS_\${action.toUpperCase()}\`,
      reqRes.data.requester_id,
      \`Requirement \${action}\`,
      \`Requirement \${reqRes.data.code} ("\${reqRes.data.title}") has been marked as \${action}.\`,
      \`/requirements/\${reqId}\`,
      null
    )`;

const newCall = `await dispatchNotification(
      reqRes.data.requester_id,
      \`Requirement \${action}\`,
      \`Requirement \${reqRes.data.code} ("\${reqRes.data.title}") has been marked as \${action}.\`,
      \`/requirements/\${reqId}\`,
      'REQUIREMENT',
      \`STATUS_\${action.toUpperCase()}\`
    )`;

if (content.includes(oldCall)) {
  content = content.replace(oldCall, newCall);
  fs.writeFileSync('d:/adios/lib/actions/requirements.ts', content);
  console.log('Fixed dispatchNotification call');
} else {
  console.log('Could not find oldCall to replace');
}
