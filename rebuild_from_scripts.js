const fs = require('fs');
const { execSync } = require('child_process');

fs.copyFileSync('d:\\adios\\temp_TaskCreationWizard.tsx', 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx');

const scripts = [
  'scratch_fix_attachments.js',
  'scratch_tweak_layout.js',
  'scratch_margins.js',
  'scratch_reduce_more.js',
  'scratch_wrap_box.js',
  'scratch_add_fetch_departments.js',
  'scratch_swap_dept.js',
  'scratch_fix_ts.js',
  'scratch_restore_mangled.js',
  'scratch_regex_fix.js',
  'scratch_move_dept.js',
  'scratch_restore_jsx2.js'
];

for (const script of scripts) {
  try {
    console.log("Running", script);
    execSync(`node ${script}`, { cwd: 'd:\\adios' });
  } catch(e) {
    console.log(script, "failed");
  }
}

console.log("Finished rebuilding file from scripts");
