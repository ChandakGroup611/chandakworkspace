const fs = require('fs');
const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

const match = content.indexOf('        </div>\n    </EnterpriseWizardShell>\n  );\n}');
if (match !== -1) {
    content = content.substring(0, match);
    content += `        </div>\n        </div>\n    </EnterpriseWizardShell>\n  );\n}`;
    fs.writeFileSync(path, content);
}
