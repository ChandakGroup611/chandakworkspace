const fs = require('fs');
let c = fs.readFileSync('d:/adios/components/tasks/TaskListViewClient.tsx', 'utf8');

const l = c.split('\n');
const s = l.findIndex(x => x.includes('const columnOptions = useMemo(() => {'));
const d = l.findIndex((x, i) => i > s && x.includes('  }, [tasks, visibleColumns, departments, masterStatuses, allWorkspaces, masterPriorities, masterAssignees]);'));

if (s !== -1 && d !== -1) {
  const block = l.slice(s, d + 1);
  l.splice(s, d - s + 1); // remove it
  
  const target = l.findIndex(x => x.includes('const [allWorkspaces, setAllWorkspaces] = useState<any[]>([]);'));
  
  if (target !== -1) {
    l.splice(target + 1, 0, '', ...block);
    fs.writeFileSync('d:/adios/components/tasks/TaskListViewClient.tsx', l.join('\n'));
    console.log('Successfully moved columnOptions below allWorkspaces');
  } else {
    console.log('Could not find allWorkspaces state declaration');
  }
} else {
  console.log('Could not find columnOptions block');
}
