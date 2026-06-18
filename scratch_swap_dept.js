const fs = require('fs');

const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Imports
content = content.replace(
  'import { fetchCustomFields, createCustomField } from "@/lib/actions/tasks";',
  'import { fetchCustomFields, createCustomField, getDepartments } from "@/lib/actions/tasks";'
);

// 2. State
content = content.replace(
  '  const [templateId, setTemplateId] = useState("");\n  const [templates, setTemplates] = useState<any[]>([]);\n  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);',
  '  const [departmentId, setDepartmentId] = useState("");\n  const [departments, setDepartments] = useState<any[]>([]);'
);

// 3. initData Promises
content = content.replace(
  'const [fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, templateList] = await Promise.all([\n        fetchCustomFields(workspaceId),\n        fetchPriorities(\'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3\'),\n        fetchTasksByWorkspace(workspaceId),\n        fetchStatusesByScope(\'TASK\', \'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3\'),\n        m.fetchWorkspaceStakeholders(workspaceId),\n        m.fetchSprints(workspaceId),\n        m.fetchTaskTemplates(workspaceId)\n      ]);',
  'const [fields, priorityList, existingTasks, statusList, workspaceStakeholders, sprintList, departmentList] = await Promise.all([\n        fetchCustomFields(workspaceId),\n        fetchPriorities(\'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3\'),\n        fetchTasksByWorkspace(workspaceId),\n        fetchStatusesByScope(\'TASK\', \'e3f8e8e8-e3e3-4e3e-a3e3-e3e3e3e3e3e3\'),\n        m.fetchWorkspaceStakeholders(workspaceId),\n        m.fetchSprints(workspaceId),\n        getDepartments()\n      ]);'
);

// 4. initData set state
content = content.replace(
  'setTemplates(templateList);',
  'setDepartments(departmentList || []);'
);

// 5. Template selection effect (remove it)
const templateEffect = `  // Handle Template Selection
  useEffect(() => {
    if (templateId && templates.length > 0) {
      const tmpl = templates.find(t => t.id === templateId);
      if (tmpl) {
        setTitle(tmpl.subject || "");
        setDescription(tmpl.description || "");
        if (tmpl.default_priority_id) setPriorityId(tmpl.default_priority_id);
        if (tmpl.default_tags && Array.isArray(tmpl.default_tags)) setTags(tmpl.default_tags);
      }
    }
  }, [templateId, templates]);`;

content = content.replace(templateEffect, '');

// 6. handleSubmit payload
content = content.replace(
  'template_id: templateId || null,',
  'department_id: departmentId || null,'
);

// 7. JSX Dropdown
const templateDropdown = `<div className="flex items-center gap-2">
                <select
                  className={\`p-1.5 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer \${
                    isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                  }\`}
                  value={templateId}
                  onChange={e => setTemplateId(e.target.value)}
                >
                  <option value="">-- Apply a Task Template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.template_name}</option>
                  ))}
                </select>
                <AppButton variant="ghost" className="p-1.5 h-auto text-xs" onClick={() => setIsTemplateManagerOpen(true)}>
                  Manage Templates
                </AppButton>
              </div>`;

const deptDropdown = `<div className="flex items-center gap-2">
                <select
                  className={\`p-1.5 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors cursor-pointer \${
                    isLightMode ? "bg-white border-gray-200 text-gray-900" : "bg-black/30 border-white/10 text-white"
                  }\`}
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} {d.code ? \`(\${d.code})\` : ''}</option>
                  ))}
                </select>
              </div>`;

content = content.replace(templateDropdown, deptDropdown);

// 8. Remove TemplateManager component render
const templateManagerRender = `{isTemplateManagerOpen && (
        <TemplateManager workspaceId={workspaceId} onClose={() => setIsTemplateManagerOpen(false)} />
      )}`;

content = content.replace(templateManagerRender, '');

fs.writeFileSync(path, content);
console.log('Swapped Template with Department');
