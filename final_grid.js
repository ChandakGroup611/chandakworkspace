const fs = require('fs');
let code = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');

const tagsLabelIdx = code.indexOf('Tags & Labels');
const tagsStartIdx = code.lastIndexOf('<div className="space-y-1.5 mt-5">', tagsLabelIdx);
const s4StartIdx = code.indexOf('{/* Section 4: Tasks & Assets */}');
const extPropsStartIdx = code.indexOf('{/* Section 5: Extended Properties */}');
const endDivIdx = code.lastIndexOf('</EnterpriseWizardShell>');

// Tags & Labels: starts at tagsStartIdx. Where does it end?
// It ends right before the closing divs of Section 3.
// We can just extract it up to s4StartIdx, and manually strip 5 closing divs from the end.
const tagsBlockRaw = code.substring(tagsStartIdx, s4StartIdx);
let tagsBlockInner = tagsBlockRaw;
for (let i = 0; i < 5; i++) {
  tagsBlockInner = tagsBlockInner.substring(0, tagsBlockInner.lastIndexOf('</div>')).trim();
}
// Strip the outer wrapper label
tagsBlockInner = tagsBlockInner.replace('<div className="space-y-1.5 mt-5">', '<div className="space-y-1.5">').replace(new RegExp('<label[\\\\s\\\\S]*?</label>', 'g'), '');

// Checklist:
const s4BlockRaw = code.substring(s4StartIdx, extPropsStartIdx);
const checklistStartIdx = s4BlockRaw.indexOf('{/* Checklist */}');
const attachmentsStartIdx = s4BlockRaw.indexOf('{/* Attachments */}');
const checklistInner = s4BlockRaw.substring(checklistStartIdx, attachmentsStartIdx).trim();

// Attachments:
const attachmentsRaw = s4BlockRaw.substring(attachmentsStartIdx);
let attachmentsInner = attachmentsRaw;
for (let i = 0; i < 2; i++) {
  attachmentsInner = attachmentsInner.substring(0, attachmentsInner.lastIndexOf('</div>')).trim();
}
attachmentsInner = attachmentsInner.replace('{/* Attachments */}', '').trim();
// Fix extra div in Attachments
attachmentsInner = attachmentsInner.replace('<div>\\n              <div className="flex items-center justify-between mb-3">', '<div className="flex items-center justify-between mb-3">');


// Extended Properties:
const s5BlockRaw = code.substring(extPropsStartIdx, endDivIdx);
let s5Clean = s5BlockRaw;
// Strip 4 closing divs from Section 5 container wrapper
for (let i = 0; i < 4; i++) {
  s5Clean = s5Clean.substring(0, s5Clean.lastIndexOf('</div>')).trim();
}

const gridJsx = `
          </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            
            {/* Top Left: Tags & Labels */}
            <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-purple-100 text-purple-600" : "bg-purple-500/20 text-purple-400"}\`}>
                  <LayoutList className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Tags & Labels</h3>
              </div>
              __TAGS__
            </div>

            {/* Top Right: Tasks & Assets (Checklist) */}
            <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-6">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-blue-100 text-blue-600" : "bg-blue-500/20 text-blue-400"}\`}>
                  <LayoutList className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Tasks & Assets</h3>
              </div>
              __CHECKLIST__
            </div>

            {/* Bottom Left: Attachments */}
            <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center gap-2 mb-6">
                <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-rose-100 text-rose-600" : "bg-rose-500/20 text-rose-400"}\`}>
                  <Paperclip className="h-4 w-4" />
                </div>
                <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Attachments</h3>
              </div>
              __ATTACHMENTS__
            </div>

            {/* Bottom Right: Extended Properties */}
            __EXTENDED_PROPERTIES__

          </div>
        </div>
`;

let finalGridJsx = gridJsx;
finalGridJsx = finalGridJsx.replace('__TAGS__', tagsBlockInner);
finalGridJsx = finalGridJsx.replace('__CHECKLIST__', checklistInner);
finalGridJsx = finalGridJsx.replace('__ATTACHMENTS__', attachmentsInner);
finalGridJsx = finalGridJsx.replace('__EXTENDED_PROPERTIES__', s5Clean);

code = code.substring(0, tagsStartIdx) + finalGridJsx + '\\n    </EnterpriseWizardShell>\\n  );\\n}\\n';
fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', code);
console.log('Fixed Grid Layout perfectly without breaking Divs!');
