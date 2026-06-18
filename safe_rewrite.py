import re

with open('components/tasks/TaskCreationWizard.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Imports
code = code.replace(
    'import { fetchCustomFields, createCustomField } from "@/lib/actions/tasks";',
    'import { fetchCustomFields, createCustomField, getDepartments } from "@/lib/actions/tasks";'
)

# 2. Add Department state
code = code.replace(
    'const [priorityId, setPriorityId] = useState("");',
    'const [priorityId, setPriorityId] = useState("");\n  const [departmentId, setDepartmentId] = useState("");'
)
code = code.replace(
    'const [priorities, setPriorities] = useState<any[]>([]);',
    'const [priorities, setPriorities] = useState<any[]>([]);\n  const [departments, setDepartments] = useState<any[]>([]);'
)

# 3. Update initData
code = code.replace(
    'const [fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, templateList] = await Promise.all([',
    'const [fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, departmentList] = await Promise.all(['
)
code = code.replace(
    'm.fetchTaskTemplates(workspaceId)',
    'getDepartments(workspaceId)'
)
code = code.replace(
    'setTemplates(templateList);',
    'setDepartments(departmentList);'
)

# 4. Update submission payload
code = code.replace(
    'priority_id: priorityId || null,',
    'priority_id: priorityId || null,\n        department_id: departmentId || null,'
)

# 5. Remove Templates & add Department Field
code = code.replace('import TemplateManager from "@/components/tasks/TemplateManager";\n', '')
code = re.sub(r'\s*const \[templateId, setTemplateId\] = useState\(""\);', '', code)
code = re.sub(r'\s*const \[templates, setTemplates\] = useState<any\[\]>\(\[\]\);', '', code)
code = re.sub(r'\s*const \[isTemplateManagerOpen, setIsTemplateManagerOpen\] = useState\(false\);', '', code)
code = re.sub(r'\s*// Handle Template Selection[\s\S]*?\}, \[templateId, templates\]\);', '', code)
code = re.sub(r'\s*template_id: templateId \|\| null,', '', code)
code = re.sub(r'\s*\{isTemplateManagerOpen && \([\s\S]*?<TemplateManager[\s\S]*?/>\s*\)\}', '', code)
code = re.sub(r'\s*<div className="flex items-center gap-2">\s*<select[\s\S]*?<option value="">-- Apply a Task Template --</option>[\s\S]*?</select>[\s\S]*?Manage Templates\s*</AppButton>\s*</div>', '', code)

# 6. Top Half UI Restructure
# Extract Parent Task & Sprint
sprint_block_match = re.search(r'\s*<div className="grid grid-cols-2 gap-5 mt-5">[\s\S]*?<option value="">-- Backlog \(No Sprint\) --</option>[\s\S]*?</select>\s*</div>\s*</div>', code)
if sprint_block_match:
    sprint_block = sprint_block_match.group(0)
    code = code.replace(sprint_block, '')
    
    # We replace "department select" implicitly by changing the core details structure to insert department, sprint, parent task.
    # Actually, we will just insert it after the "Priority" dropdown in Core Details!
    # Or just replace the "External Link" section with the sprint_block + external link later.
    
# Find External Link
ext_link_match = re.search(r'\s*<div className="mt-5 space-y-1.5">\s*<label className="text-xs font-bold text-gray-500 uppercase tracking-wider">External Link \(Optional\)</label>[\s\S]*?</div>', code)
if ext_link_match:
    ext_link_block = ext_link_match.group(0)
    code = code.replace(ext_link_block, '')
    
    # Put it next to Start Date / Target Due Date
    # Find the Date grid
    code = code.replace(
        '<div className="grid grid-cols-2 gap-5 mb-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date',
        '<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date'
    )
    # The end of that grid block is a `</div>\n            </div>` (closing the endDate div and the grid div)
    # Let's just insert ext_link_block right before the closing `</div>` of the grid.
    # The grid ends right before `          {/* Section 3: Assignment & Execution */}`
    code = code.replace('                  className={"bg-surface"} \n                />\n              </div>\n            </div>',
    '                  className={"bg-surface"} \n                />\n              </div>\n' + ext_link_block + '\n            </div>')

# Find Execution Notes
exec_notes_match = re.search(r'\s*<div className="space-y-1.5">\s*<label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">\s*<AlignLeft className="h-3 w-3" /> Execution Notes \(Rich Text\)[^]*?</textarea>\s*</div>', code)
if exec_notes_match:
    exec_notes_block = exec_notes_match.group(0)
    code = code.replace(exec_notes_block, '')
    
# Now, place Sprint/Parent Task and Department into Core Details!
# And Execution Notes after Core Details!
core_details_end_str = '                  ))}\n                </select>\n              </div>\n            </div>'
if sprint_block_match:
    code = code.replace(core_details_end_str, core_details_end_str + sprint_block_match.group(0))

if exec_notes_match:
    code = code.replace(core_details_end_str + (sprint_block_match.group(0) if sprint_block_match else ''), core_details_end_str + (sprint_block_match.group(0) if sprint_block_match else '') + '\n\n            <div className="space-y-1.5 mt-5">' + exec_notes_block.split('<div className="space-y-1.5">')[1])

# Replace priority grid to include Department
dept_jsx = """
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3" /> Department
                </label>
                <select 
                  className={`w-full h-10 px-3 rounded-xl text-sm border focus:outline-none cursor-pointer ${isLightMode ? "bg-white border-gray-200" : "bg-black/30 border-white/10 text-white"}`}
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                >
                  <option value="">-- No Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>"""

code = code.replace(
    '<div className="grid grid-cols-2 gap-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>',
    '<div className="grid grid-cols-3 gap-5">\n              <div className="space-y-1.5">\n                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>'
)
code = code.replace(
    '                  ))}\n                </select>\n              </div>\n            </div>',
    '                  ))}\n                </select>\n              </div>\n' + dept_jsx + '\n            </div>', 1
)

with open('components/tasks/TaskCreationWizard.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Steps 1-6 applied successfully using safe Python script.")
