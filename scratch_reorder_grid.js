const fs = require('fs');
const lines = fs.readFileSync('d:\\adios\\components\\tasks\\TaskCreationWizard.tsx', 'utf8').split('\n');

const gridStart = lines.findIndex(l => l.includes('<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 items-start">'));
const shellEnd = lines.findIndex(l => l.includes('</EnterpriseWizardShell>'));

const tagsBoxHeader = lines.findIndex(l => l.includes('{/* 1. Tags & Labels Box */}'));
const extBoxHeader = lines.findIndex(l => l.includes('{/* Section 5: Extended Properties */}'));
const tasksBoxHeader = lines.findIndex(l => l.includes('{/* Section 4: Tasks & Assets */}'));
const attBoxHeader = lines.findIndex(l => l.includes('{/* Attachments Box */}'));

let tagsEnd = extBoxHeader - 1;
while(tagsEnd > 0 && !lines[tagsEnd].includes('</div>')) tagsEnd--;

let extEnd = lines.findIndex((l, i) => i > extBoxHeader && l.includes('{/* Right Column */}')) - 1;
while(extEnd > 0 && !lines[extEnd].includes('</div>')) extEnd--;
extEnd--; // skip Left Column closing
while(extEnd > 0 && !lines[extEnd].includes('</div>')) extEnd--;

let tasksEnd = attBoxHeader - 1;
while(tasksEnd > 0 && !lines[tasksEnd].includes('</div>')) tasksEnd--;

let attEnd = shellEnd - 1;
while(attEnd > 0 && !lines[attEnd].includes('</div>')) attEnd--; // space-y-6
attEnd--;
while(attEnd > 0 && !lines[attEnd].includes('</div>')) attEnd--; // grid
attEnd--;
while(attEnd > 0 && !lines[attEnd].includes('</div>')) attEnd--; // Right Column
attEnd--;
while(attEnd > 0 && !lines[attEnd].includes('</div>')) attEnd--; // Attachments Box

let tagsBoxLines = lines.slice(tagsBoxHeader, tagsEnd + 1);
let extBoxLines = lines.slice(extBoxHeader, extEnd + 1);
let tasksBoxLines = lines.slice(tasksBoxHeader, tasksEnd + 1);
let attBoxLines = lines.slice(attBoxHeader, attEnd + 1);

const replaceStr = 'className={`p-5 rounded-2xl border ${"bg-surface border-border shadow-[var(--shadow-ambient)]"}`}';
const replaceWith = 'className="w-full flex flex-col gap-2"';

const processBox = (linesArr) => linesArr.map(l => l.replace(replaceStr, replaceWith));

tagsBoxLines = processBox(tagsBoxLines);
extBoxLines = processBox(extBoxLines);
tasksBoxLines = processBox(tasksBoxLines);
attBoxLines = processBox(attBoxLines);

const newGridLines = [
    '          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10 mt-6 items-start">',
    ...tagsBoxLines,
    ...tasksBoxLines,
    ...extBoxLines,
    ...attBoxLines,
    '          </div>'
];

const newLines = [
    ...lines.slice(0, gridStart),
    ...newGridLines,
    ...lines.slice(shellEnd - 1) // shellEnd - 1 is the </div> for space-y-6! Wait! 
];

fs.writeFileSync('d:\\adios\\components\\tasks\\TaskCreationWizard.tsx', newLines.join('\n'));
console.log("Grid rewritten successfully");
