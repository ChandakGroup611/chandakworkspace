import re
import sys

filename = r'd:\adios\components\tasks\TaskCreationWizard.tsx'

with open(filename, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove Tags & Labels
tags_start = '            <div className="space-y-1.5 mt-5">\n              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">\n                Tags & Labels\n              </label>'
tags_end = '                }}>Add Tag</AppButton>\n              </div>\n            </div>'

t_idx = content.find(tags_start)
t_end_idx = content.find(tags_end, t_idx)

if t_idx == -1 or t_end_idx == -1:
    print("Could not find Tags & Labels")
    sys.exit(1)

tags_content = content[t_idx + len(tags_start):t_end_idx + len(tags_end)]
tags_content = tags_content.replace('mb-2', 'mb-4')
# Just the inner stuff of tags
tags_inner = tags_content[:-len('            </div>')].strip()

# Remove tags from original content
content = content[:t_idx] + content[t_end_idx + len(tags_end):]

# 2. Extract Tasks & Assets and Extended Properties
ta_marker = '{/* Section 4: Tasks & Assets */}'
ep_marker = '{/* Section 5: Extended Properties */}'
shell_end = '    </EnterpriseWizardShell>'

ta_idx = content.find(ta_marker)
ep_idx = content.find(ep_marker)
end_idx = content.find(shell_end)

if ta_idx == -1 or ep_idx == -1:
    print("Could not find sections")
    sys.exit(1)

ta_content = content[ta_idx:ep_idx]
ep_content = content[ep_idx:end_idx]

# Remove sections from content
content = content[:ta_idx]

# 3. Process Checklist
att_marker = '{/* Attachments */}'
att_idx = ta_content.find(att_marker)
checklist_content = ta_content[:att_idx].strip()
checklist_content += '\n            </div>'

# 4. Process Attachments
att_raw = ta_content[att_idx:].strip()

att_header = """<div>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`text-[11px] font-bold uppercase tracking-wider ${"text-foreground"}`}>Attachments</h4>"""

new_att_header = """{/* Attachments Box */}
            <div className={`p-5 rounded-2xl border ${"bg-surface border-border shadow-[var(--shadow-ambient)]"}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isLightMode ? "bg-cyan-100 text-cyan-600" : "bg-cyan-500/20 text-cyan-400"}`}>
                    <Paperclip className="h-4 w-4" />
                  </div>
                  <h3 className={`text-sm font-bold tracking-wide ${"text-foreground"}`}>Attachments</h3>
                </div>"""

att_content = att_raw.replace(att_header, new_att_header)

# 5. Process Extended Properties
ep_content = ep_content.strip()
ep_content = ep_content.replace(' lg:col-span-2`}>', '`}>')
ep_content = ep_content.replace('lg:grid-cols-4', 'sm:grid-cols-2')
ep_content = ep_content.replace('lg:col-span-4', 'sm:col-span-2')

# Trim trailing divs logic safely
ep_content = ep_content.rstrip()
ep_content = ep_content[:-len('</div>')].rstrip()
ep_content = ep_content[:-len('</div>')].rstrip()
ep_content += '\n            </div>\n            </div>'

# 6. Build the grid
grid = f"""          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 items-start">
            {{/* Left Column */}}
            <div className="flex flex-col gap-6">
              {{/* 1. Tags & Labels Box */}}
              <div className={{`p-5 rounded-2xl border ${{"bg-surface border-border shadow-[var(--shadow-ambient)]"}}`}}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={{`p-1.5 rounded-lg ${{isLightMode ? "bg-purple-100 text-purple-600" : "bg-purple-500/20 text-purple-400"}}`}}>
                    <LayoutTemplate className="h-4 w-4" />
                  </div>
                  <h3 className={{`text-sm font-bold tracking-wide ${{"text-foreground"}}`}}>Tags & Labels</h3>
                </div>
{tags_inner}
              </div>

              {ep_content}
            </div>

            {{/* Right Column */}}
            <div className="flex flex-col gap-6">
              {checklist_content}

              {att_content}
            </div>
          </div>
"""

content = content + grid + '\n    </EnterpriseWizardShell>\n  );\n}\n'

with open(filename, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done building grid")
