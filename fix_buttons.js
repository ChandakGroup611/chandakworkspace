const fs = require('fs');
const files = [
  'app/amc/page.tsx', 
  'app/compliance/DataRetentionClient.tsx', 
  'app/requirements/[id]/page.tsx', 
  'app/sla/holidays/page.tsx', 
  'app/workspaces/WorkspacesClient.tsx', 
  'components/dashboard/performance/UserPerformanceWorkingSheetModal.tsx', 
  'components/dashboard/widgets/PerformanceWidget.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('AppButton')) {
    content = content.replace(/import React[^;]*;/, "$&\nimport { AppButton } from '@/components/ui/AppButton';");
  }
  content = content.replace(/<button/g, '<AppButton').replace(/<\/button>/g, '</AppButton>');
  fs.writeFileSync(file, content);
});
