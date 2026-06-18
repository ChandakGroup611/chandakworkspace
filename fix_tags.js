const fs = require('fs');
const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

// The file has too many tags at the bottom.
const match = content.indexOf('          </div>\n          </div>');
if (match !== -1) {
    content = content.substring(0, match);
    content += `          </div>
        </div>
    </EnterpriseWizardShell>
  );
}`;
    fs.writeFileSync(path, content);
}
