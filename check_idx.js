const fs = require('fs');
let code = fs.readFileSync('temp_TaskCreationWizard.tsx', 'utf8');

const s1_start = code.indexOf('{/* Section 1: Core Details */}');
console.log('s1_start:', s1_start);

const wrapperIdx = code.lastIndexOf('<div className="space-y-', s1_start);
console.log('wrapperIdx:', wrapperIdx);

console.log('preWrapper length:', code.substring(0, wrapperIdx).length);
