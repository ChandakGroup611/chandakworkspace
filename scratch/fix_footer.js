const fs = require('fs');
let content = fs.readFileSync('app/requirements/[id]/page.tsx', 'utf8');

// 1. Change PageContainer to strict={true} and add the flex-1 wrapper
content = content.replace(
  /<PageContainer strict=\{false\} className="px-4 pb-12 pt-2 min-h-screen overflow-y-auto">/,
  `<PageContainer strict={true} className="bg-background">
      <div className="flex-1 overflow-y-auto px-4 pb-12 pt-2">`
);

// 2. We need to close the <div className="flex-1 overflow-y-auto..."> just before the closing </PageContainer>
// And place the footers in between.
const closingTagIdx = content.lastIndexOf('</PageContainer>');
if (closingTagIdx === -1) throw new Error('Could not find </PageContainer>');

// 3. Extract the Analysis footer
const analysisFooterStart = content.indexOf('{/* Analysis Action Buttons (Frozen Footer) */}');
if (analysisFooterStart === -1) throw new Error('Could not find Analysis Footer');

const analysisRegex = /\{\/\* Analysis Action Buttons \(Frozen Footer\) \*\/\}[\s\S]*?(?=<\/div>\s*\)\})/m;
const analysisMatch = content.match(analysisRegex);
if (!analysisMatch) throw new Error('Could not match Analysis Footer block');

const analysisFooter = analysisMatch[0];
content = content.replace(analysisFooter, '');

// 4. Extract the Approval footer
const approvalFooterStart = content.indexOf('{/* Approval Action Buttons (Frozen Footer) */}');
if (approvalFooterStart === -1) throw new Error('Could not find Approval Footer');

const approvalRegex = /\{\/\* Approval Action Buttons \(Frozen Footer\) \*\/\}[\s\S]*?(?=<\/div>\s*\)\})/m;
const approvalMatch = content.match(approvalRegex);
if (!approvalMatch) throw new Error('Could not match Approval Footer block');

const approvalFooter = approvalMatch[0];
content = content.replace(approvalFooter, '');

// 5. Build the new global footers block
const newFootersBlock = `
      </div> {/* End of flex-1 scrollable area */}

      {/* GLOBAL STATIC FOOTERS */}
      <div className="shrink-0 bg-background/95 dark:bg-background/90 backdrop-blur-md border-t border-border/80 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-[100] empty:hidden">
        {activeTab === 'analysis' && (
          <div className="p-4 flex items-center justify-end gap-3">
            ${analysisFooter.replace(/\{\/\*.*?Frozen Footer\).*?\*\/\}\s*/, '').replace(/\{?\(\(isSuperAdmin \&\& \!isViewMode\) \|\| isCurrentApprover\) \&\& \(\s*/, '{((isSuperAdmin && !isViewMode) || isCurrentApprover) && (').replace(/<div className="sticky bottom-0.*?">([\s\S]*?)<\/div>/m, '$1')}
          </div>
        )}
        
        {activeTab === 'approval' && (
          <div className="p-4 flex items-center justify-end gap-3">
            ${approvalFooter.replace(/\{\/\*.*?Frozen Footer\).*?\*\/\}\s*/, '').replace(/\{?isCurrentApprover \&\& \(\s*/, '{isCurrentApprover && (').replace(/<div className="sticky bottom-0.*?">([\s\S]*?)<\/div>/m, '$1')}
          </div>
        )}
      </div>
`;

// Insert the new block before </PageContainer>
content = content.slice(0, closingTagIdx) + newFootersBlock + content.slice(closingTagIdx);

fs.writeFileSync('app/requirements/[id]/page.tsx', content);
console.log("Successfully refactored footers!");
