const fs = require('fs');

const path = 'd:/adios/app/requirements/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// For TAB 1
content = content.replace(
  /{activeTab === 'details' && \(\s*<div className="flex flex-col space-y-6 pb-12 animate-in fade-in duration-300">/,
  `{activeTab === 'details' && (
          <AppCard className="flex flex-col overflow-hidden border border-border/50 shadow-md bg-surface/40 p-0 pb-6 mb-8 animate-in fade-in duration-300">`
);

content = content.replace(
  /\{\/\* DEDICATED CARD: Business Classification \*\/\}\s*<AppCard className="overflow-hidden border border-border\/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface\/40 p-0 mb-4">/g,
  `{/* SECTION: Business Classification */}
            <div className="border-b border-border/50 dark:border-border/80 last:border-b-0 hover:bg-surface/50 transition-colors duration-300">`
);

content = content.replace(
  /\{\/\* DEDICATED CARD: Scope & Classification Grid \*\/\}\s*<AppCard className="overflow-hidden border border-border\/60 shadow-md p-5 mb-4">/g,
  `{/* SECTION: Scope & Classification Grid */}
            <div className="p-5 border-b border-border/50 dark:border-border/80 last:border-b-0 hover:bg-surface/50 transition-colors duration-300">`
);

content = content.replace(
  /\{\/\* DEDICATED CARD: Attachments \*\/\}\s*\{attachments\.length > 0 && \(\s*<AppCard className="overflow-hidden border border-border\/60 shadow-md p-5">/g,
  `{/* SECTION: Attachments */}
            {attachments.length > 0 && (
              <div className="p-5 border-b border-border/50 dark:border-border/80 last:border-b-0">`
);

// Close TAB 1 wrapper properly by replacing the closing tags before the UAT block
// Find the end of attachments map
content = content.replace(
  /<\/div>\s*<\/AppCard>\s*\)\}\s*\{\/\* UAT Block \(Conditionally visible based on status\) \*\/\}/g,
  `                </div>
              </div>
            )}
          </AppCard>

            {/* UAT Block (Conditionally visible based on status) */}`
);

// Ensure the closing of TAB 1 `</div>` is handled since we replaced it with `AppCard`
content = content.replace(
  /<\/section>\s*\)\}\s*<\/div>\s*\)\}\s*\{\/\* TAB 2: Business Analysis \*\/\}/g,
  `</section>
            )}
        )}

        {/* TAB 2: Business Analysis */}`
);

// For TAB 2
content = content.replace(
  /{activeTab === 'analysis' && \(\s*<div className="flex flex-col space-y-6 animate-in fade-in duration-300">/,
  `{activeTab === 'analysis' && (
          <AppCard className="flex flex-col overflow-hidden border border-border/50 shadow-md bg-surface/40 p-0 mb-8 animate-in fade-in duration-300">`
);

content = content.replace(
  /\{\/\* 1\. CARD: Business Classification \*\/\}\s*<AppCard className="overflow-hidden border border-border\/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface\/40 p-0 mb-4">/g,
  `{/* SECTION 1: Business Classification */}
            <div className="border-b border-border/50 dark:border-border/80 last:border-b-0 hover:bg-surface/50 transition-colors duration-300">`
);

content = content.replace(
  /\{\/\* 2\. CARD: Requirement Reason, Details & Technical Scope \*\/\}\s*<AppCard className="overflow-hidden border border-border\/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface\/40 p-0 mb-4">/g,
  `{/* SECTION 2: Requirement Reason & Scope */}
            <div className="border-b border-border/50 dark:border-border/80 last:border-b-0 hover:bg-surface/50 transition-colors duration-300">`
);

content = content.replace(
  /\{\/\* IT System Conditional Render \*\/\}\s*\{requirement\.custom_fields\?\.requirement_domain === 'IT & Software System' && \(\s*<AppCard className="overflow-hidden border border-border\/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface\/40 p-0 mb-4 animate-in fade-in zoom-in-95 duration-300">/g,
  `{/* IT System Conditional Render */}
            {requirement.custom_fields?.requirement_domain === 'IT & Software System' && (
              <div className="border-b border-border/50 dark:border-border/80 last:border-b-0 hover:bg-surface/50 transition-colors duration-300 animate-in fade-in zoom-in-95 duration-300">`
);

content = content.replace(
  /\{\/\* Infrastructure Conditional Render \*\/\}\s*\{requirement\.custom_fields\?\.requirement_domain === 'Infrastructure & Hardware' && \(\s*<AppCard className="overflow-hidden border border-border\/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface\/40 p-0 mb-4 animate-in fade-in zoom-in-95 duration-300">/g,
  `{/* Infrastructure Conditional Render */}
            {requirement.custom_fields?.requirement_domain === 'Infrastructure & Hardware' && (
              <div className="border-b border-border/50 dark:border-border/80 last:border-b-0 hover:bg-surface/50 transition-colors duration-300 animate-in fade-in zoom-in-95 duration-300">`
);

content = content.replace(
  /\{\/\* 3\. CARD: Timelines & Resources \*\/\}\s*<AppCard className="overflow-hidden border border-border\/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-500 bg-surface\/40 p-0 mb-4">/g,
  `{/* SECTION 3: Timelines & Resources */}
            <div className="border-b border-border/50 dark:border-border/80 last:border-b-0 hover:bg-surface/50 transition-colors duration-300">`
);

// Close TAB 2 wrapper properly before TAB 3
// Let's replace all closing tags of conditional inner AppCards that we turned into divs
content = content.replace(
  /<\/div>\s*<\/AppCard>\s*\)\}\s*\{\/\* Infrastructure Conditional Render \*\/\}/g,
  `              </div>
            </div>
            )}

            {/* Infrastructure Conditional Render */}`
);

content = content.replace(
  /<\/div>\s*<\/AppCard>\s*\)\}\s*\{\/\* 3\. CARD: Timelines & Resources \*\/\}/g,
  `              </div>
            </div>
            )}

            {/* 3. CARD: Timelines & Resources */}`
);

// Fix inner card closing for static inner cards (e.g., between Business Class and Requirement Reason)
content = content.replace(
  /<\/div>\s*<\/AppCard>\s*\{\/\* 2\. CARD: Requirement Reason, Details & Technical Scope \*\/\}/g,
  `              </div>
            </div>

            {/* 2. CARD: Requirement Reason, Details & Technical Scope */}`
);

content = content.replace(
  /<\/div>\s*<\/AppCard>\s*\{\/\* DEDICATED CARD: Scope & Classification Grid \*\/\}/g,
  `              </div>
            </div>

            {/* DEDICATED CARD: Scope & Classification Grid */}`
);

content = content.replace(
  /<\/div>\s*<\/AppCard>\s*\{\/\* DEDICATED CARD: Attachments \*\/\}/g,
  `              </div>
            </div>

            {/* DEDICATED CARD: Attachments */}`
);

content = content.replace(
  /<\/div>\s*<\/AppCard>\s*\{\/\* IT System Conditional Render \*\/\}/g,
  `              </div>
            </div>

            {/* IT System Conditional Render */}`
);

// Finally for Tab 2, find the end of 3. CARD to close the main AppCard wrapper
content = content.replace(
  /<\/div>\s*<\/AppCard>\s*<\/div>\s*\)\}\s*\{\/\* TAB 3: Approval Workflow \*\/\}/g,
  `              </div>
            </div>
          </AppCard>
        )}

        {/* TAB 3: Approval Workflow */}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done refactoring layout');
