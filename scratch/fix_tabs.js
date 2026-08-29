const fs = require('fs');
const path = require('path');

const filesToFix = [
  'd:/adios/app/amc/page.tsx',
  'd:/adios/app/compliance/DataRetentionClient.tsx',
  'd:/adios/app/masters/page.tsx',
  'd:/adios/app/requirements/[id]/page.tsx',
  'd:/adios/app/sla/holidays/page.tsx',
  'd:/adios/app/tickets/automations/page.tsx',
  'd:/adios/components/dashboard/DashboardCommandCenter.tsx',
  'd:/adios/components/dashboard/engine/CustomizeDashboardModal.tsx',
  'd:/adios/components/dashboard/performance/UserPerformanceWorkingSheetModal.tsx',
  'd:/adios/components/requirements/EditRequirementModal.tsx',
  'd:/adios/components/requirements/RequirementDetailDrawer.tsx',
  'd:/adios/components/settings/communication/TemplateDesigner.tsx',
  'd:/adios/components/settings/CustomFieldsConfigurator.tsx',
  'd:/adios/components/tasks/TaskDetailDrawer.tsx',
  'd:/adios/components/tasks/TaskExecutionController.tsx',
  'd:/adios/components/tasks/TaskListViewClient.tsx',
  'd:/adios/components/tickets/TicketInspector.tsx',
  'd:/adios/components/tickets/TicketRightPanel.tsx'
];

let filesModified = [];

filesToFix.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // We want to replace <AppButton (and anything before >) with <AppButton variant="ghost" 
  // ONLY if it contains isActive or activeTab AND DOES NOT contain variant=
  
  const regex = /<AppButton([\s\S]*?)>/g;
  
  const newContent = content.replace(regex, (match, p1) => {
    if ((p1.includes('isActive') || p1.includes('activeTab') || p1.includes('active ===') || p1.includes('activeMenu')) && !p1.includes('variant=')) {
      // It's a tab button without a variant! Inject variant="ghost"
      return '<AppButton variant="ghost"' + p1 + '>';
    }
    return match;
  });
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    filesModified.push(file.replace('d:/adios/', ''));
  }
});

console.log('Modified files:', filesModified);
