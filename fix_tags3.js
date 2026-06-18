const fs = require('fs');
const path = 'd:\\adios\\components\\tasks\\TaskCreationWizard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `        </div>


    </EnterpriseWizardShell>`;

const replacement = `        </div>
      </div>
    </EnterpriseWizardShell>`;

content = content.replace(target, replacement);

fs.writeFileSync(path, content);
