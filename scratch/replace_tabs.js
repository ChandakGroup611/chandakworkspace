const fs = require('fs');

const replacements = [
  {
    file: 'd:/adios/app/requirements/[id]/page.tsx',
    old: 'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer select-none',
    new: 'theme-tab-standard rounded-xl'
  },
  {
    file: 'd:/adios/components/tasks/TaskExecutionController.tsx',
    old: 'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer select-none',
    new: 'theme-tab-standard rounded-xl'
  },
  {
    file: 'd:/adios/components/tasks/TaskExecutionController.tsx',
    old: 'flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2',
    new: 'theme-tab-standard rounded-t-xl border-b-2'
  },
  {
    file: 'd:/adios/app/masters/page.tsx',
    old: 'px-5 py-2 text-[13px] font-bold rounded-lg transition-all whitespace-nowrap outline-none flex items-center justify-center min-w-[120px]',
    new: 'theme-tab-standard rounded-lg min-w-[120px]'
  },
  {
    file: 'd:/adios/app/compliance/DataRetentionClient.tsx',
    old: 'flex items-center gap-2 px-5 py-2 text-[13px] font-bold rounded-lg transition-all whitespace-nowrap outline-none flex items-center justify-center min-w-[120px]',
    new: 'theme-tab-standard rounded-lg min-w-[120px]'
  },
  {
    file: 'd:/adios/components/tickets/TicketInspector.tsx',
    old: 'py-2 px-5 text-sm font-bold uppercase tracking-widest transition-all flex items-center gap-2',
    new: 'theme-tab-standard uppercase tracking-widest'
  },
  {
    file: 'd:/adios/components/tasks/TaskDetailDrawer.tsx',
    old: 'px-5 py-2 text-sm font-bold tracking-wide transition-all flex items-center gap-2',
    new: 'theme-tab-standard tracking-wide'
  },
  {
    file: 'd:/adios/components/requirements/RequirementDetailDrawer.tsx',
    old: 'px-5 py-2 text-sm font-bold tracking-wide transition-all flex items-center gap-2',
    new: 'theme-tab-standard tracking-wide'
  },
  {
    file: 'd:/adios/components/settings/communication/TemplateDesigner.tsx',
    old: 'flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors',
    new: 'theme-tab-standard border-b-2'
  },
  {
    file: 'd:/adios/components/requirements/EditRequirementModal.tsx',
    old: 'px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
    new: 'theme-tab-standard border-b-2'
  }
];

let changedCount = 0;

replacements.forEach(({ file, old, new: newStr }) => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(old)) {
      // Global replace just in case it appears multiple times (like in .map or manual multiple tabs)
      content = content.split(old).join(newStr);
      fs.writeFileSync(file, content);
      console.log(`Replaced in ${file}`);
      changedCount++;
    } else {
      console.log(`Not found in ${file}: ${old}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});

console.log(`Total replacements made: ${changedCount}`);
