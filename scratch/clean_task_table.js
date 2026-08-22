const fs = require('fs');

const file = 'd:/adios/components/tasks/TaskListViewClient.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove text-xs, text-[13px], text-[11px] from AppTableCell
content = content.replace(/<AppTableCell[^>]*>/g, (match) => {
  let newMatch = match;
  newMatch = newMatch.replace(/text-xs\s*/g, '');
  newMatch = newMatch.replace(/text-\[13px\]\s*/g, '');
  newMatch = newMatch.replace(/text-\[11px\]\s*/g, '');
  // Clean up empty classNames
  newMatch = newMatch.replace(/className="\s*"/g, '');
  newMatch = newMatch.replace(/className=''/g, '');
  return newMatch;
});

fs.writeFileSync(file, content);
console.log('TaskListViewClient.tsx cleaned up');
