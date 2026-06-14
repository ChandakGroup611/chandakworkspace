const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');

// Replace isLightMode ternaries with just the false branch value
content = content.replace(/\$\{isLightMode \? "[^"]*" : "([^"]*)"\}/g, '$1');
content = content.replace(/\$\{isLightMode\?"[^"]*":"([^"]*)"\}/g, '$1');

// Replace masters usages
content = content.replace(/masters\?\.priority/g, '({} as any)?.priority');
content = content.replace(/masters\?\.modules/g, '({} as any)?.modules');
content = content.replace(/masters\?\.submodules/g, '({} as any)?.submodules');
content = content.replace(/masters\?\.issue_subs/g, '({} as any)?.issue_subs');

// Fix redeclarations if they happened
const regexPrio = /const prioId = r\.custom_fields\?\.priority_id;\n\s*const prioName = \(\{\} as any\)\?\.priority\?\.find\(\(x: any\) => x\.id === prioId\)\?\.name \|\| "-";/g;
let matches = content.match(regexPrio);
if (matches && matches.length > 1) {
  content = content.replace(regexPrio, (match, offset) => offset === content.indexOf(match) ? match : '');
}

fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);
