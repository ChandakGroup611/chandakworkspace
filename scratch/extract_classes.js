const fs = require('fs');

const files = [
  'd:/adios/app/amc/page.tsx',
  'd:/adios/app/compliance/DataRetentionClient.tsx',
  'd:/adios/app/masters/page.tsx',
  'd:/adios/app/requirements/[id]/page.tsx',
  'd:/adios/app/sla/holidays/page.tsx',
  'd:/adios/components/dashboard/performance/UserPerformanceWorkingSheetModal.tsx',
  'd:/adios/components/requirements/EditRequirementModal.tsx',
  'd:/adios/components/requirements/RequirementDetailDrawer.tsx',
  'd:/adios/components/settings/communication/TemplateDesigner.tsx',
  'd:/adios/components/tasks/TaskDetailDrawer.tsx',
  'd:/adios/components/tasks/TaskExecutionController.tsx',
  'd:/adios/components/tickets/TicketInspector.tsx'
];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  // Find className near AppButton and setActiveTab
  const lines = content.split('\n');
  for (let i=0; i<lines.length; i++) {
    if (lines[i].includes('setActiveTab') || lines[i].includes('<AppButton')) {
      // Look around for className
      for (let j = Math.max(0, i-2); j < Math.min(lines.length, i+5); j++) {
        if (lines[j].includes('className=') && lines[j].includes('px-')) {
           console.log(`[${f.split('/').pop()}] ${lines[j].trim()}`);
        }
      }
    }
  }
});
