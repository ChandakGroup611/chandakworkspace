const fs = require('fs');
const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Strip the ending to rebuild it
const ewsIndex = content.lastIndexOf('</EnterpriseWizardShell>');
content = content.substring(0, ewsIndex);

let openDivs = 0;
let match;
const divRegex = /<\/?div/g;
while ((match = divRegex.exec(content)) !== null) {
  if (match[0] === '<div') openDivs++;
  else openDivs--;
}

let closingTags = '';
for (let i = 0; i < openDivs; i++) {
  closingTags += '        </div>\n';
}

content += closingTags + `    </EnterpriseWizardShell>
  );
}
`;

fs.writeFileSync(path, content);
