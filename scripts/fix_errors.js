const fs = require('fs');
let c = fs.readFileSync('app/requirements/[id]/page.tsx', 'utf8');

c = c.replace(/toast\.error\(e\.message(?: \|\| [^)]+)?\)/g, 'toast.error(sanitizeErrorMessage(e))');
c = c.replace(/toast\.error\(err\.message(?: \|\| [^)]+)?\)/g, 'toast.error(sanitizeErrorMessage(err))');
c = c.replace(/toast\.error\("Error: " \+ e\.message\)/g, 'toast.error(sanitizeErrorMessage(e))');
c = c.replace(/setError\(err\.message(?: \|\| [^)]+)?\)/g, 'setError(sanitizeErrorMessage(err))');
c = c.replace(/toast\.error\(`Failed to \$\{action\} attachment: ` \+ \(e\.message \|\| "Unknown error"\)\)/g, 'toast.error(`Failed to ${action} attachment: ` + sanitizeErrorMessage(e))');
c = c.replace(/toast\.error\("Failed to add master: " \+ e\.message\)/g, 'toast.error("Failed to add master: " + sanitizeErrorMessage(e))');

fs.writeFileSync('app/requirements/[id]/page.tsx', c);
console.log("Replaced successfully!");
