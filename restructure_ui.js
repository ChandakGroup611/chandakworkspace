const fs = require('fs');
const filename = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(filename, 'utf8');

const tLabelIdx = content.indexOf('Tags & Labels');
if (tLabelIdx === -1) {
    console.error('Tags & Labels text not found');
    process.exit(1);
}

const tags_start_idx = content.lastIndexOf('<div className="space-y-1.5 mt-5">', tLabelIdx);
if (tags_start_idx === -1) {
    console.error('Tags wrapper start not found');
    process.exit(1);
}

const tags_end_marker = '}}>Add Tag</AppButton>\n              </div>\n            </div>';
let tags_end_idx = content.indexOf(tags_end_marker, tLabelIdx);
if (tags_end_idx === -1) {
    const fallback_end_marker = '}}>Add Tag</AppButton>';
    const fIdx = content.indexOf(fallback_end_marker, tLabelIdx);
    tags_end_idx = content.indexOf('</div>', content.indexOf('</div>', fIdx) + 6);
}

if (tags_end_idx === -1) {
    console.error('Tags end not found');
    process.exit(1);
}

tags_end_idx += '</div>'.length; // include the last </div> if found by fallback or just use standard
let tags_content = content.substring(tags_start_idx, tags_end_idx);
tags_content = tags_content.replace('mb-2', 'mb-4');
tags_content = tags_content.replace(/<div className="space-y-1.5 mt-5">[\s\S]*?<label[\s\S]*?<\/label>/, '');

// Clean up Tags content closing divs
// It usually ends with `  </div>\n            </div>`
// We will strip the last `</div>` so it can be naturally closed by our wrapper.
let tags_inner = tags_content.trimRight();
if (tags_inner.endsWith('</div>')) {
    tags_inner = tags_inner.substring(0, tags_inner.lastIndexOf('</div>')).trimRight();
}

content = content.substring(0, tags_start_idx) + content.substring(tags_end_idx);

const ta_marker = '{/* Section 4: Tasks & Assets */}';
const ep_marker = '{/* Section 5: Extended Properties */}';
const shell_end = '</EnterpriseWizardShell>';

let ta_idx = content.indexOf(ta_marker);
let ep_idx = content.indexOf(ep_marker);
let end_idx = content.indexOf(shell_end);

if (ta_idx === -1 || ep_idx === -1) {
    console.error("Could not find sections");
    process.exit(1);
}

let ta_content = content.substring(ta_idx, ep_idx);
let ep_content = content.substring(ep_idx, end_idx);

content = content.substring(0, ta_idx);

const att_marker = '{/* Attachments */}';
let att_idx = ta_content.indexOf(att_marker);
let checklist_content = ta_content.substring(0, att_idx).trim();
checklist_content += '\n            </div>';

let att_raw = ta_content.substring(att_idx).trim();
let att_content_str = att_raw.replace(
    /<div>\s*<div className="flex items-center justify-between mb-3">\s*<h4 className={`text-\[11px\] font-bold uppercase tracking-wider \${"text-foreground"}`}>Attachments<\/h4>/,
    `{/* Attachments Box */}
            <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-cyan-100 text-cyan-600" : "bg-cyan-500/20 text-cyan-400"}\`}>
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Attachments</h3>
                </div>`
);

// Extended Properties
ep_content = ep_content.trim();
ep_content = ep_content.replace(' lg:col-span-2`}>', '`}>');
ep_content = ep_content.replace('lg:grid-cols-4', 'sm:grid-cols-2');
ep_content = ep_content.replace('lg:col-span-4', 'sm:col-span-2');

ep_content = ep_content.trimRight();
ep_content = ep_content.substring(0, ep_content.lastIndexOf('</div>')).trimRight();
ep_content = ep_content.substring(0, ep_content.lastIndexOf('</div>')).trimRight();
ep_content += '\n            </div>\n            </div>';

const grid = `          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 items-start">
            {/* Left Column */}
            <div className="flex flex-col gap-6">
              {/* 1. Tags & Labels Box */}
              <div className={\`p-5 rounded-2xl border \${"bg-surface border-border shadow-[var(--shadow-ambient)]"}\`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={\`p-1.5 rounded-lg \${isLightMode ? "bg-purple-100 text-purple-600" : "bg-purple-500/20 text-purple-400"}\`}>
                    <LayoutTemplate className="h-4 w-4" />
                  </div>
                  <h3 className={\`text-sm font-bold tracking-wide \${"text-foreground"}\`}>Tags & Labels</h3>
                </div>
${tags_inner}
              </div>

              ${ep_content}
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6">
              ${checklist_content}

              ${att_content_str}
            </div>
          </div>
`;

content = content + grid + '    </EnterpriseWizardShell>\n  );\n}\n';

fs.writeFileSync(filename, content, 'utf8');
console.log("Done building grid");
