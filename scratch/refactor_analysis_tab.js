const fs = require('fs');

let content = fs.readFileSync('app/requirements/[id]/page.tsx', 'utf8');

const tabStart = content.indexOf('{/* TAB 2: Business Analysis */}');
const tabEnd = content.indexOf('{/* TAB 3: Approval Workflow */}');

if (tabStart === -1 || tabEnd === -1) {
  console.log('Could not find TAB 2 or TAB 3 markers');
  process.exit(1);
}

// Find the start of the card section by looking for the first card comment
const firstCardStart = content.indexOf('{/* 1. CARD: Business Classification */}', tabStart);
if (firstCardStart === -1) {
  console.log('Could not find first card');
  process.exit(1);
}

function getCard(startStr, endStr) {
  const start = content.indexOf(startStr, firstCardStart);
  if (start === -1 || start >= tabEnd) return '';
  let end = tabEnd;
  if (endStr) {
    const endMatch = content.indexOf(endStr, start);
    if (endMatch !== -1 && endMatch < tabEnd) {
      end = endMatch;
    }
  }
  return content.slice(start, end);
}

const card1 = getCard('{/* 1. CARD: Business Classification */}', '{/* 2. CARD: Requirement Reason');
const card2 = getCard('{/* 2. CARD: Requirement Reason', '{/* IT System Conditional Render */}');
const cardIT = getCard('{/* IT System Conditional Render */}', '{/* Infrastructure Conditional Render */}');
const cardInfra = getCard('{/* Infrastructure Conditional Render */}', '{/* 3. CARD: Timelines & Resources */}');
const card3 = getCard('{/* 3. CARD: Timelines & Resources */}', '{/* 4. CARD: Impacted Departments');
const card4 = getCard('{/* 4. CARD: Impacted Departments', '{/* 5. CARD: Add New Analysis Remarks');
const card5 = getCard('{/* 5. CARD: Add New Analysis Remarks', null); 

let card5Clean = card5;
const match = card5Clean.match(/<\/div>\s*\)\}\s*$/);
if (match) {
    card5Clean = card5Clean.substring(0, match.index);
}

const newTabBody = `
        {/* TAB 2: Business Analysis */}
        {activeTab === 'analysis' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-300 pb-8">
            {/* Main Content Column (Left - 2/3) */}
            <div className="xl:col-span-2 flex flex-col space-y-6">
${card2.trimEnd()}
${card4.trimEnd()}
${card5Clean.trimEnd()}
            </div>
            
            {/* Metadata Column (Right - 1/3) */}
            <div className="flex flex-col space-y-6">
${card1.trimEnd()}
${card3.trimEnd()}
${cardIT.trimEnd()}
${cardInfra.trimEnd()}
            </div>
          </div>
        )}

`;

content = content.slice(0, tabStart) + newTabBody + content.slice(tabEnd);
fs.writeFileSync('app/requirements/[id]/page.tsx', content);
console.log('Successfully reconstructed Business Analysis tab!');
