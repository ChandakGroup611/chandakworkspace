const fs = require('fs');

const bottom_jsx = fs.readFileSync('bottom_jsx.txt', 'utf8');

// We need to extract the parts and rebuild them.
const assigneesBlockEnd = bottom_jsx.indexOf('<div className="space-y-1.5 mt-5">');
const assigneesBlock = bottom_jsx.substring(0, assigneesBlockEnd);
// Note: we need to close the div for assignees block.
const assigneesFixed = assigneesBlock.trim() + '\n          </div>';

const tagsStart = bottom_jsx.indexOf('<div className="space-y-1.5 mt-5">\n              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">\n                Tags & Labels');
const tagsEnd = bottom_jsx.indexOf('</div>\n          </div>\n\n          {/* Section 4: Tasks & Assets */}');
const tagsBlockInner = bottom_jsx.substring(tagsStart, tagsEnd + 6); // include closing div

const s4Start = bottom_jsx.indexOf('{/* Section 4: Tasks & Assets */}');
const s4End = bottom_jsx.indexOf('{/* Section 5: Extended Properties */}');
const s4Block = bottom_jsx.substring(s4Start, s4End);

const s5Block = bottom_jsx.substring(s4End);

const new_bottom_jsx = `${assigneesFixed}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
            {/* Left Column: Tags & Labels */}
            <div className={\`p-5 rounded-2xl border bg-surface border-border shadow-[var(--shadow-ambient)]\`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-purple-100 text-purple-600" : "bg-purple-500/20 text-purple-400"}\`}>
                  <LayoutList className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide text-foreground\`}>Tags & Labels</h3>
              </div>
              ${tagsBlockInner.replace('<div className="space-y-1.5 mt-5">', '<div className="space-y-1.5">').replace(/<label[\s\S]*?<\/label>/, '')}
            </div>

            {/* Right Column: Tasks & Assets */}
            ${s4Block.trim()}
          </div>

          <div className="mt-6">
            ${s5Block.trim()}
          </div>
`;

let code = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');
const s3_start = code.indexOf('{/* Section 3: Assignment & Execution */}');
const end_div = code.lastIndexOf('</EnterpriseWizardShell>');

code = code.substring(0, s3_start) + new_bottom_jsx + '\n\n    </EnterpriseWizardShell>\n  );\n}\n';
fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', code);
console.log('Restructured bottom section successfully');
