const fs = require('fs');
let c = fs.readFileSync('d:/adios/components/tasks/TaskListViewClient.tsx', 'utf8');

c = c.replace(
  'const [departments, setDepartments] = useState<any[]>([]);',
  'const [departments, setDepartments] = useState<any[]>([]);\n  const [masterPriorities, setMasterPriorities] = useState<any[]>([]);\n  const [masterAssignees, setMasterAssignees] = useState<any[]>([]);'
);

c = c.replace(
  'getDepartments().then(setDepartments).catch(console.error);\n    getAllReportCustomFields().then(setDynamicFields).catch(console.error);\n  }, []);',
  `getDepartments().then(setDepartments).catch(console.error);
    getAllReportCustomFields().then(setDynamicFields).catch(console.error);
    import('@/lib/actions/workspaces').then(({ fetchPriorities }) => fetchPriorities().then(setMasterPriorities).catch(console.error));
    import('@/lib/actions/users').then(({ fetchAssignees }) => fetchAssignees().then(setMasterAssignees).catch(console.error));
  }, []);`
);

const l = c.split('\n');
const s = l.findIndex(x => x.includes('const columnOptions = useMemo(() => {'));
const d = l.findIndex((x, i) => i > s && x.includes('}, [tasks, visibleColumns, departments, masterStatuses]'));

const newOpt = `  const columnOptions = useMemo(() => {
    const optionsMap: Record<string, {label: string, value: string}[]> = {};
    
    visibleColumns.forEach(col => {
      const key = col.field_key;
      const fieldId = col.field_id || key;
      if (key === "actions") return;

      if (key === "department" && departments.length > 0) {
        optionsMap[fieldId] = [...departments]
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          .map(d => ({ label: d.name, value: d.name }));
        return;
      }
      
      if (key === "status" && masterStatuses.length > 0) {
        optionsMap[fieldId] = [...masterStatuses]
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          .map(s => ({ label: s.name, value: s.name }));
        return;
      }

      if (key === "workspace" && allWorkspaces.length > 0) {
        optionsMap[fieldId] = [...allWorkspaces]
          .sort((a, b) => (a.name || a.code || "").localeCompare(b.name || b.code || ""))
          .map(w => ({ label: w.name || w.code, value: w.name || w.code }));
        return;
      }

      if (key === "priority" && masterPriorities.length > 0) {
        optionsMap[fieldId] = [...masterPriorities]
          .sort((a, b) => (a.priority_name || a.name || "").localeCompare(b.priority_name || b.name || ""))
          .map(p => ({ label: p.priority_name || p.name, value: p.priority_name || p.name }));
        return;
      }

      if ((key === "assignee" || key === "creator_name") && masterAssignees.length > 0) {
        optionsMap[fieldId] = [...masterAssignees]
          .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""))
          .map(u => ({ label: u.full_name, value: u.full_name }));
        return;
      }

      const uniqueVals = new Set<string>();

      tasks.forEach(t => {
        let val = undefined;
        if (key === "department") val = t.department?.name;
        else if (key === "priority") val = t.priority?.name;
        else if (key === "status") val = t.status?.name;
        else if (key === "workspace") val = t.workspace?.name || t.workspace?.code;
        else if (key === "sub_workspace") val = t.sub_workspace?.name || t.sub_workspace?.code;
        else if (key === "assignee") {
            const a = Array.isArray(t.assignee) ? t.assignee[0] : t.assignee;
            val = a?.full_name;
        }
        else if (key === "creator_name") val = t.creator?.full_name;
        else if (key === "title_description") val = t.title;
        else if (key === "code") val = t.code;
        else if (t.custom_fields && t.custom_fields[key] !== undefined) val = t.custom_fields[key];
        else val = t[key];

        if (val !== undefined && val !== null && val !== "") {
          uniqueVals.add(String(val));
        }
      });

      optionsMap[fieldId] = Array.from(uniqueVals)
        .sort((a, b) => a.localeCompare(b))
        .map(v => ({ label: v, value: v }));
    });

    return optionsMap;
  }, [tasks, visibleColumns, departments, masterStatuses, allWorkspaces, masterPriorities, masterAssignees]);`;

l.splice(s, d - s + 1, newOpt);
fs.writeFileSync('d:/adios/components/tasks/TaskListViewClient.tsx', l.join('\n'));
