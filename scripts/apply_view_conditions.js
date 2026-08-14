const fs = require('fs');
const viewPath = 'd:/adios/app/requirements/[id]/page.tsx';
let v = fs.readFileSync(viewPath, 'utf8');

const domainScopeBlock = `
            {/* IT System Conditional Render */}
            {requirement.custom_fields?.requirement_domain === 'IT & Software System' && (
              <AppCard className="overflow-hidden border border-border/60 shadow-md p-0 mb-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-blue-500/15 via-surface/90 to-surface/40 dark:from-blue-600/30 dark:via-elevated/90 dark:to-elevated/40 px-5 py-3.5 border-b border-border/80 flex items-center justify-between rounded-t-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-4 rounded-full bg-blue-500 shadow-xs" />
                    <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold text-sm tracking-wide text-foreground">IT & Software Scope</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60">
                      <span className="theme-label mb-1.5 text-muted">Target System / Application</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.target_system || 'Not specified'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60">
                      <span className="theme-label mb-1.5 text-muted">Data Privacy & Security</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.data_privacy || 'Not specified'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60">
                      <span className="theme-label mb-1.5 text-muted">Software License Cost</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.software_cost ? \`₹\${requirement.custom_fields.software_cost}\` : 'N/A'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60">
                      <span className="theme-label mb-1.5 text-muted">Development Cost</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.dev_cost ? \`₹\${requirement.custom_fields.dev_cost}\` : 'N/A'}</span>
                    </div>
                  </div>
                  {requirement.custom_fields?.integrations && (
                    <div className="mt-3.5 flex flex-col p-3.5 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60">
                      <span className="theme-label mb-1.5 text-muted">Integration Dependencies</span>
                      <span className="theme-data-value text-foreground whitespace-pre-wrap">{requirement.custom_fields.integrations}</span>
                    </div>
                  )}
                </div>
              </AppCard>
            )}

            {/* Infrastructure Conditional Render */}
            {requirement.custom_fields?.requirement_domain === 'Infrastructure & Hardware' && (
              <AppCard className="overflow-hidden border border-border/60 shadow-md p-0 mb-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-indigo-500/15 via-surface/90 to-surface/40 dark:from-indigo-600/30 dark:via-elevated/90 dark:to-elevated/40 px-5 py-3.5 border-b border-border/80 flex items-center justify-between rounded-t-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-4 rounded-full bg-indigo-500 shadow-xs" />
                    <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-sm tracking-wide text-foreground">Infrastructure Scope</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60">
                      <span className="theme-label mb-1.5 text-muted">Target Environment</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.target_environment || 'Not specified'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60">
                      <span className="theme-label mb-1.5 text-muted">Hardware & Capacity Needs</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.hardware_needs || 'Not specified'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60">
                      <span className="theme-label mb-1.5 text-muted">CAPEX Amount</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.capex_amount ? \`₹\${requirement.custom_fields.capex_amount}\` : 'N/A'}</span>
                    </div>
                    <div className="flex flex-col p-3.5 rounded-xl bg-surface/60 dark:bg-elevated/30 border border-border/60">
                      <span className="theme-label mb-1.5 text-muted">OPEX Amount</span>
                      <span className="theme-data-value text-foreground">{requirement.custom_fields?.opex_amount ? \`₹\${requirement.custom_fields.opex_amount}\` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </AppCard>
            )}
`;

v = v.replace(/\{\/\* 3\. CARD: Timelines & Resources \*\/\}/, domainScopeBlock + '\n            {/* 3. CARD: Timelines & Resources */}');

fs.writeFileSync(viewPath, v, 'utf8');

const drawerPath = 'd:/adios/components/requirements/RequirementDetailDrawer.tsx';
let d = fs.readFileSync(drawerPath, 'utf8');

const drawerITBlock = `
      {requirement.custom_fields?.requirement_domain === 'IT & Software System' && (
        <div className="mb-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className="theme-label text-blue-500 mb-3 flex items-center gap-1.5"><Server className="w-3.5 h-3.5"/> IT & Software Scope</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="theme-label text-muted mb-1">Target System</span>
              <span className="text-sm font-semibold text-foreground block">{requirement.custom_fields?.target_system || '-'}</span>
            </div>
            <div>
              <span className="theme-label text-muted mb-1">Data Privacy</span>
              <span className="text-sm font-semibold text-foreground block">{requirement.custom_fields?.data_privacy || '-'}</span>
            </div>
            <div>
              <span className="theme-label text-muted mb-1">Software Cost</span>
              <span className="text-sm font-semibold text-foreground block">{requirement.custom_fields?.software_cost ? \`₹\${requirement.custom_fields.software_cost}\` : '-'}</span>
            </div>
            <div>
              <span className="theme-label text-muted mb-1">Dev Cost</span>
              <span className="text-sm font-semibold text-foreground block">{requirement.custom_fields?.dev_cost ? \`₹\${requirement.custom_fields.dev_cost}\` : '-'}</span>
            </div>
          </div>
        </div>
      )}

      {requirement.custom_fields?.requirement_domain === 'Infrastructure & Hardware' && (
        <div className="mb-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className="theme-label text-indigo-500 mb-3 flex items-center gap-1.5"><Server className="w-3.5 h-3.5"/> Infrastructure Scope</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="theme-label text-muted mb-1">Environment</span>
              <span className="text-sm font-semibold text-foreground block">{requirement.custom_fields?.target_environment || '-'}</span>
            </div>
            <div>
              <span className="theme-label text-muted mb-1">Hardware Needs</span>
              <span className="text-sm font-semibold text-foreground block">{requirement.custom_fields?.hardware_needs || '-'}</span>
            </div>
            <div>
              <span className="theme-label text-muted mb-1">CAPEX Amount</span>
              <span className="text-sm font-semibold text-foreground block">{requirement.custom_fields?.capex_amount ? \`₹\${requirement.custom_fields.capex_amount}\` : '-'}</span>
            </div>
            <div>
              <span className="theme-label text-muted mb-1">OPEX Amount</span>
              <span className="text-sm font-semibold text-foreground block">{requirement.custom_fields?.opex_amount ? \`₹\${requirement.custom_fields.opex_amount}\` : '-'}</span>
            </div>
          </div>
        </div>
      )}
`;

d = d.replace(/<div className="mb-6">\s*<h3 className="theme-label text-foreground">Estimations<\/h3>/, drawerITBlock + '\n      <div className="mb-6">\n        <h3 className="theme-label text-foreground">Estimations</h3>');

fs.writeFileSync(drawerPath, d, 'utf8');
console.log('Updated view and drawer');
