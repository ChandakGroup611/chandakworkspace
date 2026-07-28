const fs = require('fs');
let content = fs.readFileSync('d:/adios/components/tasks/TaskExecutionController.tsx', 'utf8');

content = content.replace(/className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4"/g, 'className="flex flex-col gap-6 mt-4"');
content = content.replace(/className="grid grid-cols-1 lg:grid-cols-2 gap-5"/g, 'className="flex flex-col gap-6 mt-4"');

content = content.replace(/className={`bg-white dark:bg-\[#101214\] border border-\[#dfe1e6\] dark:border-\[#283447\] rounded-sm shadow-sm p-4 rounded-sm  space-y-4`}/g, 'className="space-y-4"');

content = content.replace(/<AppCard className="p-5 relative overflow-hidden group">/g, '<div className="space-y-4">');
content = content.replace(/<AppCard className="p-5">/g, '<div className="space-y-4">');
content = content.replace(/<\/AppCard>/g, '</div>');

fs.writeFileSync('d:/adios/components/tasks/TaskExecutionController.tsx', content, 'utf8');
console.log('Flattened cards!');
