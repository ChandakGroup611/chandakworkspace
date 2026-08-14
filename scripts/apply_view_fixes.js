const fs = require('fs');
const pageFile = 'd:/adios/app/requirements/[id]/page.tsx';
let p = fs.readFileSync(pageFile, 'utf8');

// 1. Add Users to lucide-react import
p = p.replace(/import \{ Plus, RefreshCw/, 'import { Users, Plus, RefreshCw');

// 2. Add Business Impact
p = p.replace(
  /<div className="grid grid-cols-1 md:grid-cols-3 gap-3\.5">/,
  '<div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">'
);

p = p.replace(
  /<span className="theme-data-value text-foreground break-all">\s*\{requirement\.business_value\?\.name \|\| requirement\.custom_fields\?\.business_value \|\| 'Cost Optimization & Efficiency'\}\s*<\/span>\s*<\/div>/,
  `<span className="theme-data-value text-foreground break-all">
                      {requirement.business_value?.name || requirement.custom_fields?.business_value || 'Cost Optimization & Efficiency'}
                    </span>
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60 hover:border-border transition-all duration-200">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-fuchsia-500" /> Business Impact
                    </span>
                    <span className="theme-data-value text-foreground break-all">
                      {requirement.business_impact || requirement.custom_fields?.business_impact || 'No immediate impact details provided.'}
                    </span>
                  </div>`
);

// 3. Separate Functional Scope from Requirement Details
p = p.replace(
  /\{requirement\.requirement_details \|\| requirement\.functional_scope \|\| requirement\.technical_scope \|\| 'Functional & Technical details of the requirement workflow\.'\}/,
  "{requirement.requirement_details || requirement.custom_fields?.requirement_details || 'Detailed requirement workflow description.'}"
);

// Add Functional Scope to Technical & Execution Scope card
p = p.replace(
  /<div className="p-5">\s*<div className="flex flex-col p-4 rounded-xl bg-surface\/60 dark:bg-elevated\/30 border border-border\/60 hover:border-border transition-all duration-200">/,
  `<div className="p-5 space-y-4">
                <div className="flex flex-col p-4 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60 hover:border-border transition-all duration-200">
                  <span className="theme-label mb-2 text-muted flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" /> Functional Scope <span className="text-red-500">*</span>
                  </span>
                  <div className="theme-data-value text-foreground whitespace-pre-wrap leading-relaxed break-words">
                    {requirement.functional_scope || requirement.custom_fields?.functional_scope || 'Functional breakdown of the requirement.'}
                  </div>
                </div>

                <div className="flex flex-col p-4 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60 hover:border-border transition-all duration-200">`
);

// 4. Add Estimated Resources to Timelines
p = p.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3\.5">/,
  '<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">'
);

p = p.replace(
  /<span className="theme-data-value text-foreground truncate">\s*\{requirement\.estimated_cost \? \`₹\$\{requirement\.estimated_cost\}\` : \(requirement\.custom_fields\?\.estimated_cost \? \`₹\$\{requirement\.custom_fields\.estimated_cost\}\` : 'Standard Budget'\)\}\s*<\/span>\s*<\/div>/,
  `<span className="theme-data-value text-foreground truncate">
                      {requirement.estimated_cost ? \`₹\${requirement.estimated_cost}\` : (requirement.custom_fields?.estimated_cost ? \`₹\${requirement.custom_fields.estimated_cost}\` : 'Standard Budget')}
                    </span>
                  </div>

                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60 hover:border-border transition-all duration-200 justify-center min-h-[76px]">
                    <span className="theme-label mb-1.5 text-muted flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-pink-500" /> Estimated Resources
                    </span>
                    <span className="theme-data-value text-foreground truncate">
                      {requirement.estimated_resources || requirement.custom_fields?.estimated_resources || 'Standard Team'}
                    </span>
                  </div>`
);

// 5. Add Collaborators & Stakeholders
const collabsBlock = `
            {/* 3.5 CARD: Collaborators & Stakeholders */}
            <AppCard className="overflow-hidden border border-border/60 shadow-md p-0 mb-4">
              <div className="bg-gradient-to-r from-blue-500/15 via-surface/90 to-surface/40 dark:from-blue-600/30 dark:via-elevated/90 dark:to-elevated/40 px-5 py-3.5 border-b border-border/80 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-4 rounded-full bg-blue-500 shadow-xs" />
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-sm tracking-wide text-foreground">Stakeholders & Collaborators</h3>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60">
                    <span className="theme-label mb-1.5 text-muted">Watchers</span>
                    <div className="theme-data-value text-foreground">
                      {(requirement.custom_fields?.watchers || []).length > 0 
                        ? (requirement.custom_fields?.watchers).join(', ') 
                        : 'No watchers assigned'}
                    </div>
                  </div>
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60">
                    <span className="theme-label mb-1.5 text-muted">Stakeholders</span>
                    <div className="theme-data-value text-foreground">
                      {(requirement.custom_fields?.stakeholders || []).length > 0 
                        ? (requirement.custom_fields?.stakeholders).join(', ') 
                        : 'No stakeholders assigned'}
                    </div>
                  </div>
                  <div className="flex flex-col p-3.5 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60">
                    <span className="theme-label mb-1.5 text-muted">CC Users</span>
                    <div className="theme-data-value text-foreground">
                      {(requirement.custom_fields?.cc_users || []).length > 0 
                        ? (requirement.custom_fields?.cc_users).join(', ') 
                        : 'No CC users assigned'}
                    </div>
                  </div>
                </div>
              </div>
            </AppCard>
`;

p = p.replace(
  /\{\/\* 4\. CARD: Impacted Departments & Define Approval Sequence \* \*\/\}/,
  collabsBlock + '\n            {/* 4. CARD: Impacted Departments & Define Approval Sequence * */}'
);

fs.writeFileSync(pageFile, p, 'utf8');

// -------- REQUIREMENT DETAIL DRAWER --------
const drawerFile = 'd:/adios/components/requirements/RequirementDetailDrawer.tsx';
let d = fs.readFileSync(drawerFile, 'utf8');

// Business Impact
d = d.replace(
  /<div className="text-sm font-semibold text-foreground">\s*\{requirement\.business_value\?\.name \|\| requirement\.custom_fields\?\.business_value \|\| 'Efficiency & Optimization'\}\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/,
  `<div className="text-sm font-semibold text-foreground">
              {requirement.business_value?.name || requirement.custom_fields?.business_value || 'Efficiency & Optimization'}
            </div>
          </div>
          <div>
            <h3 className="theme-label text-theme-icon mb-3">Business Impact</h3>
            <div className="text-sm font-semibold text-foreground">
              {requirement.business_impact || requirement.custom_fields?.business_impact || 'No immediate impact details provided.'}
            </div>
          </div>
        </div>
      </div>`
);

// Functional Scope
d = d.replace(
  /<h3 className="theme-label text-foreground">Technical Description & Scope<\/h3>/,
  `<h3 className="theme-label text-foreground mb-1">Functional Scope</h3>
          <div className="theme-data-value text-muted leading-relaxed bg-surface/20 rounded-xl p-4 border border-white/5 mb-4">
            {requirement.functional_scope || requirement.custom_fields?.functional_scope || 'Functional breakdown of the requirement.'}
          </div>
          <h3 className="theme-label text-foreground">Technical Description & Scope</h3>`
);

// Estimated Resources
d = d.replace(
  /<span className="theme-data-value font-semibold text-theme-heading mt-1">\s*\{requirement\.estimated_cost \? \`₹\$\{requirement\.estimated_cost\}\` : \(requirement\.custom_fields\?\.estimated_cost \? \`₹\$\{requirement\.custom_fields\.estimated_cost\}\` : 'Standard Budget'\)\}\s*<\/span>\s*<\/div>\s*<\/div>\s*<\/div>/,
  `<span className="theme-data-value font-semibold text-theme-heading mt-1">
              {requirement.estimated_cost ? \`₹\${requirement.estimated_cost}\` : (requirement.custom_fields?.estimated_cost ? \`₹\${requirement.custom_fields.estimated_cost}\` : 'Standard Budget')}
            </span>
          </div>
          <div>
            <span className="theme-label text-muted mb-1">Resources</span>
            <span className="theme-data-value font-semibold text-theme-heading mt-1 block">
              {requirement.estimated_resources || requirement.custom_fields?.estimated_resources || 'Standard Team'}
            </span>
          </div>
        </div>
      </div>`
);

// Watchers/Stakeholders (to the drawer)
const drawerCollabsBlock = `
      <div className="mb-6">
        <h3 className="theme-label text-foreground mb-3">Collaborators & Stakeholders</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="theme-label text-muted mb-1">Watchers</span>
            <div className="text-sm font-semibold text-theme-heading">
              {(requirement.custom_fields?.watchers || []).length > 0 ? (requirement.custom_fields?.watchers).join(', ') : 'None'}
            </div>
          </div>
          <div>
            <span className="theme-label text-muted mb-1">Stakeholders</span>
            <div className="text-sm font-semibold text-theme-heading">
              {(requirement.custom_fields?.stakeholders || []).length > 0 ? (requirement.custom_fields?.stakeholders).join(', ') : 'None'}
            </div>
          </div>
        </div>
      </div>
`;
d = d.replace(
  /<div className="mb-6">\s*<h3 className="theme-label text-foreground">Implementation Progress<\/h3>/,
  drawerCollabsBlock + '\n      <div className="mb-6">\n        <h3 className="theme-label text-foreground">Implementation Progress</h3>'
);

fs.writeFileSync(drawerFile, d, 'utf8');

console.log('Applied field modifications.');
