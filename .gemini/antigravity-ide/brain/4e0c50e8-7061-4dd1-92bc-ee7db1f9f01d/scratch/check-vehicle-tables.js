const fs = require('fs');

const code = fs.readFileSync('D:/adios/lib/actions/vehicle.ts', 'utf8');
const tableMatches = code.match(/\.from\(['"][a-zA-Z0-9_]+['"]\)/g);
const uniqueTables = [...new Set(tableMatches ? tableMatches.map(t => t.slice(7, -2)) : [])];
console.log('Tables accessed in lib/actions/vehicle.ts:\n', uniqueTables);
