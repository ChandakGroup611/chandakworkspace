const fs = require('fs');

let code = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');

const s3Start = code.indexOf('{/* Section 3: Assignment & Execution */}');
const endDiv = code.lastIndexOf('</EnterpriseWizardShell>');

const bottom_jsx = code.substring(s3Start, endDiv);

// Extract Section 3
const tagsColStart = bottom_jsx.indexOf('<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">');
const s3Block = bottom_jsx.substring(0, tagsColStart);

// Extract Tags
const tagsStart = bottom_jsx.indexOf('{/* Left Column: Tags & Labels */}');
const tasksColStart = bottom_jsx.indexOf('{/* Right Column: Tasks & Assets */}');
const tagsBlock = bottom_jsx.substring(tagsStart, tasksColStart).trim();

// Extract Tasks
const s4Start = bottom_jsx.indexOf('{/* Section 4: Tasks & Assets */}');
const checklistStart = bottom_jsx.indexOf('{/* Checklist */}');
const attachmentsStart = bottom_jsx.indexOf('{/* Attachments */}');
const extPropsWrapperStart = bottom_jsx.indexOf('<div className="mt-6">');

// We reconstruct the Tasks (Checklist) block.
// It was inside the Tasks & Assets container. We'll just extract the inner checklist HTML.
const checklistBlockInner = bottom_jsx.substring(checklistStart, attachmentsStart).trim();
const tasksBlock = `
            {/* Top Right: Tasks & Action Items */}
            <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-6">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-blue-100 text-blue-600" : "bg-blue-500/20 text-blue-400"}\`}>
                  <LayoutList className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Tasks & Assets</h3>
              </div>
              ${checklistBlockInner}
            </div>
`;

// Extract Attachments
// It ends where the tasks container ends
const s4End = bottom_jsx.indexOf('</div>\n          </div>\n\n          <div className="mt-6">');
const attachmentsBlockInner = bottom_jsx.substring(attachmentsStart, s4End).trim();
const attachmentsBlock = `
            {/* Bottom Left: Attachments */}
            <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-6">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-rose-100 text-rose-600" : "bg-rose-500/20 text-rose-400"}\`}>
                  <Paperclip className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Attachments</h3>
              </div>
              ${attachmentsBlockInner.replace('{/* Attachments */}', '').replace(/<div className="flex items-center justify-between mb-3">[\s\S]*?<\/div>\s*<div className="mb-3">/, '<div className="mb-3">')}
            </div>
`;

// Extract Extended Properties
const extPropsStartIdx = bottom_jsx.indexOf('{/* Section 5: Extended Properties */}');
const extPropsBlock = bottom_jsx.substring(extPropsStartIdx).replace('</div>\n        </div>', '').trim();

// Now assemble them into a 2x2 grid!
const newBottomJsx = `
${s3Block.trim()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            ${tagsBlock}

            ${tasksBlock.trim()}

            ${attachmentsBlock.trim()}

            ${extPropsBlock.trim()}
          </div>
        </div>
`;

code = code.substring(0, s3Start) + newBottomJsx + '\n    </EnterpriseWizardShell>\n  );\n}\n';

fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', code);
console.log('Restructured 2x2 perfectly!');
