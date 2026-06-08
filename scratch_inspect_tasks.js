const fs = require('fs');
const ts = fs.readFileSync('d:/adios/lib/types/supabase.ts', 'utf8');

// find tasks: { at exactly 6 spaces indentation
const regex = /\n      tasks: \{\n([\s\S]*?)      \}\n      task_assignees: /;
const match = ts.match(regex);
if (match) {
  const relations = match[1].match(/Relationships: \[([\s\S]*?)\]/);
  console.log(relations ? relations[1] : "No relations");
} else {
  console.log("Not found tasks:");
}
