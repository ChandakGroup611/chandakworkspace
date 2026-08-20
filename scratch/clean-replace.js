const fs = require('fs');
const path = 'd:/adios/app/requirements/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// TAB 1
content = content.replace(
  `{activeTab === 'details' && (
          <div className="flex flex-col space-y-6 pb-12 animate-in fade-in duration-300">
            {/* DEDICATED CARD: Business Classification */}
            <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 p-0 mb-4">`,
  `{activeTab === 'details' && (
          <div className="pb-12 animate-in fade-in duration-300">
            <AppCard className="flex flex-col overflow-hidden border border-border/50 shadow-md bg-surface/40 p-0 mb-8">
              {/* SECTION: Business Classification */}
              <div className="border-b border-border/50 dark:border-border/80">`
);

content = content.replace(
  `                  </div>
                </div>
              </div>
            </AppCard>

            {/* DEDICATED CARD: Scope & Classification Grid */}
            <AppCard className="overflow-hidden border border-border/60 shadow-md p-5 mb-4">`,
  `                  </div>
                </div>
              </div>
            </div>

            {/* SECTION: Scope & Classification Grid */}
            <div className="p-5 border-b border-border/50 dark:border-border/80">`
);

content = content.replace(
  `                </div>
              </div>
            </AppCard>

            {/* DEDICATED CARD: Attachments */}
            {attachments.length > 0 && (
              <AppCard className="overflow-hidden border border-border/60 shadow-md p-5">`,
  `                </div>
              </div>
            </div>

            {/* SECTION: Attachments */}
            {attachments.length > 0 && (
              <div className="p-5 border-b border-border/50 dark:border-border/80">`
);

content = content.replace(
  `                  ))}
                </div>
              </AppCard>
            )}

            {/* UAT Block (Conditionally visible based on status) */}`,
  `                  ))}
                </div>
              </div>
            )}
            </AppCard>

            {/* UAT Block (Conditionally visible based on status) */}`
);

// TAB 2
content = content.replace(
  `{activeTab === 'analysis' && (
          <div className="flex flex-col space-y-6 animate-in fade-in duration-300">
            {/* 1. CARD: Business Classification */}
            <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 p-0 mb-4">`,
  `{activeTab === 'analysis' && (
          <div className="animate-in fade-in duration-300">
            <AppCard className="flex flex-col overflow-hidden border border-border/50 shadow-md bg-surface/40 p-0 mb-8">
              {/* SECTION 1: Business Classification */}
              <div className="border-b border-border/50 dark:border-border/80">`
);

content = content.replace(
  `                  </div>
                </div>
              </div>
            </AppCard>

            {/* 2. CARD: Requirement Reason, Details & Technical Scope */}
            <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 p-0 mb-4">`,
  `                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Requirement Reason & Scope */}
            <div className="border-b border-border/50 dark:border-border/80">`
);

content = content.replace(
  `                  )}
                </div>
              </div>
            </AppCard>

            
            {/* IT System Conditional Render */}
            {requirement.custom_fields?.requirement_domain === 'IT & Software System' && (
              <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 p-0 mb-4 animate-in fade-in zoom-in-95 duration-300">`,
  `                  )}
                </div>
              </div>
            </div>

            {/* IT System Conditional Render */}
            {requirement.custom_fields?.requirement_domain === 'IT & Software System' && (
              <div className="border-b border-border/50 dark:border-border/80 animate-in fade-in zoom-in-95 duration-300">`
);

content = content.replace(
  `                  )}
                </div>
              </AppCard>
            )}

            {/* Infrastructure Conditional Render */}
            {requirement.custom_fields?.requirement_domain === 'Infrastructure & Hardware' && (
              <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 p-0 mb-4 animate-in fade-in zoom-in-95 duration-300">`,
  `                  )}
                </div>
              </div>
            )}

            {/* Infrastructure Conditional Render */}
            {requirement.custom_fields?.requirement_domain === 'Infrastructure & Hardware' && (
              <div className="border-b border-border/50 dark:border-border/80 animate-in fade-in zoom-in-95 duration-300">`
);

content = content.replace(
  `                  </div>
                </div>
              </AppCard>
            )}

            {/* 3. CARD: Timelines & Resources */}
            <AppCard className="overflow-hidden border border-border/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface/40 p-0 mb-4">`,
  `                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: Timelines & Resources */}
            <div className="border-b border-border/50 dark:border-border/80">`
);

content = content.replace(
  `                  </div>
                </div>
              </AppCard>
            </div>
          </div>
        )}

        {/* TAB 3: Approval Workflow */}`,
  `                  </div>
                </div>
              </div>
            </div>
            </AppCard>
          </div>
        )}

        {/* TAB 3: Approval Workflow */}`
);

fs.writeFileSync(path, content, 'utf8');
console.log("Replaced cleanly.");
