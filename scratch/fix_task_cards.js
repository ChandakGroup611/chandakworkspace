const fs = require('fs');
const path = require('path');

const filePath = 'd:\\\\adios\\\\components\\\\tasks\\\\TaskExecutionController.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /className="flex flex-col (space-y-1 p-3 rounded-xl) bg-[a-zA-Z0-9-\/]+ dark:bg-[a-zA-Z0-9-\/]+ border border-[a-zA-Z0-9-\/]+ dark:border-[a-zA-Z0-9-\/]+ hover:[a-zA-Z0-9-\/]+ transition-all duration-200 (min-h-\[76px\] [a-zA-Z0-9-\s]*?)"/g;

content = content.replace(regex, (match, p1, p2) => {
    return `className="flex flex-col ${p1} bg-surface/80 dark:bg-elevated/40 border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 ${p2}"`;
});

const regex2 = /className="flex flex-col (space-y-1 p-3 rounded-xl) bg-[a-zA-Z0-9-\/]+ dark:bg-[a-zA-Z0-9-\/]+ border border-[a-zA-Z0-9-\/]+ hover:[a-zA-Z0-9-\/]+ transition-all duration-200 (min-h-\[76px\] [a-zA-Z0-9-\s]*?)"/g;
content = content.replace(regex2, (match, p1, p2) => {
    return `className="flex flex-col ${p1} bg-surface/80 dark:bg-elevated/40 border border-border/50 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 ${p2}"`;
});

fs.writeFileSync(filePath, content);
console.log('Replaced heavily colored background cards.');
