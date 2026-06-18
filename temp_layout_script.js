const fs = require('fs');

const content = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');

const s1_idx = content.indexOf('{/* Section 1: Core Details */}');
const s2_idx = content.indexOf('{/* Section 2: Timeline & Priority */}');
const s3_idx = content.indexOf('{/* Section 3: Details & Context */}');
const s4_idx = content.indexOf('{/* Section 4: Tasks & Assets */}');
const s5_idx = content.indexOf('{/* Section 5: Extended Properties */}');
const end_idx = content.indexOf('</EnterpriseWizardShell>');

console.log({s1_idx, s2_idx, s3_idx, s4_idx, s5_idx, end_idx});
