const fs = require('fs');
let code = fs.readFileSync('temp_TaskCreationWizard.tsx', 'utf8');
let currentCode = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');

// Extract exactly from temp
let tagsStart = code.indexOf('<div className="space-y-1.5 mt-3">');
let tagsEnd = code.indexOf('</div>\n            </div>\n          </div>\n\n          {/* Section 4: Tasks & Assets */}');
let tagsContent = code.substring(tagsStart, tagsEnd);
tagsContent = tagsContent.replace('<div className="space-y-1.5 mt-3">', '<div className="space-y-1.5">');

let checklistStart = code.indexOf('{/* Checklist */}');
let checklistEnd = code.indexOf('{/* Attachments */}');
let checklistContent = code.substring(checklistStart, checklistEnd);

let attachmentsStart = code.indexOf('{/* Attachments */}');
let attachmentsEnd = code.indexOf('</div>\n          </div>\n\n          {/* Section 5: Extended Properties */}');
let attachmentsContent = code.substring(attachmentsStart, attachmentsEnd);

let customFieldsStart = code.indexOf('{/* Section 5: Extended Properties */}');
let customFieldsEnd = code.indexOf('            </div>\n          </div>\n\n        </div>\n\n\n    </EnterpriseWizardShell>');
let customFieldsContent = code.substring(customFieldsStart, customFieldsEnd);

let customFieldsInner = customFieldsContent;
let cfInnerMatch = customFieldsContent.match(/<div className={`p-3\.5 rounded-xl border[^>]+>([\s\S]+?)<\/div>\s*$/);
if (cfInnerMatch) {
    customFieldsInner = cfInnerMatch[1];
} else {
    customFieldsInner = customFieldsContent.replace(/\{\/\* Section 5: Extended Properties \*\/\}/, '')
        .replace(/<div className={`p-3\.5 rounded-xl border [^>]+>/, '');
}

// Now replace the bad placeholders in currentCode
currentCode = currentCode.replace(/\$\{tagsContent\}/, tagsContent);
currentCode = currentCode.replace(/\$\{checklistContent\}/, checklistContent);
currentCode = currentCode.replace(/\$\{attachmentsContent\}/, attachmentsContent);
currentCode = currentCode.replace(/\$\{customFieldsInner\}/, customFieldsInner);

fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', currentCode);
console.log('Done');
