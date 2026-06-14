const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');

content = content.replace(
  /import RequirementDraftModal from "@\/components\/requirements\/RequirementDraftModal";\n?/g,
  ''
);

content = content.replace(
  /\{isCreating && activeWorkspaceId && \([\s\S]*?<RequirementDraftModal[\s\S]*?<\/>[\s\S]*?\)\}/g,
  ''
);

content = content.replace(
  /\{isCreating && activeWorkspaceId && \([\s\S]*?<RequirementDraftModal[\s\S]*?\/>[\s\S]*?\)\}/g,
  ''
);

fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);
