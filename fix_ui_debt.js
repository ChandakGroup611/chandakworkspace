const fs = require('fs');
const path = require('path');

const uiIssuesPath = path.join(__dirname, 'ui_issues.txt');
if (!fs.existsSync(uiIssuesPath)) {
  console.error("ui_issues.txt not found");
  process.exit(1);
}

const lines = fs.readFileSync(uiIssuesPath, 'utf8').split('\n');

const filesToUpdate = new Set();
const fileIssues = {};

for (const line of lines) {
  if (!line.trim()) continue;
  const match = line.match(/^(.*\.tsx) uses raw <(.*)> instead of <(.*)>/);
  if (match) {
    const file = match[1].trim();
    const rawTag = match[2];
    const newTag = match[3];
    filesToUpdate.add(file);
    if (!fileIssues[file]) fileIssues[file] = new Set();
    fileIssues[file].add(rawTag);
  } else if (line.includes("hardcoded modal backdrop instead of standard component")) {
    const file = line.split(" uses raw")[0].trim();
    filesToUpdate.add(file);
    if (!fileIssues[file]) fileIssues[file] = new Set();
    fileIssues[file].add("modal");
  }
}

console.log(`Found ${filesToUpdate.size} files to fix.`);

for (const file of filesToUpdate) {
  if (!fs.existsSync(file)) {
    console.warn(`File not found: ${file}`);
    continue;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  const issues = fileIssues[file];

  // 1. Fix Buttons
  if (issues.has('button')) {
    const before = content;
    content = content.replace(/<button(\s|>)/g, '<AppButton$1');
    content = content.replace(/<\/button>/g, '</AppButton>');
    
    if (before !== content) {
      changed = true;
      if (!content.includes('import { AppButton }') && !content.includes('import {AppButton}')) {
        // Insert after first import
        content = content.replace(/^(import .*)$/m, "$1\nimport { AppButton } from '@/components/ui/AppButton';");
      }
    }
  }

  // 2. Fix Tables
  if (issues.has('table')) {
    const before = content;
    content = content.replace(/<table(\s|>)/g, '<AppTableContainer><AppTable$1');
    content = content.replace(/<\/table>/g, '</AppTable></AppTableContainer>');
    
    content = content.replace(/<thead(\s|>)/g, '<AppTableHeader$1');
    content = content.replace(/<\/thead>/g, '</AppTableHeader>');
    
    content = content.replace(/<tbody(\s|>)/g, '<AppTableBody$1');
    content = content.replace(/<\/tbody>/g, '</AppTableBody>');
    
    content = content.replace(/<tr(\s|>)/g, '<AppTableRow$1');
    content = content.replace(/<\/tr>/g, '</AppTableRow>');
    
    content = content.replace(/<th(\s|>)/g, '<AppTableHead$1');
    content = content.replace(/<\/th>/g, '</AppTableHead>');
    
    content = content.replace(/<td(\s|>)/g, '<AppTableCell$1');
    content = content.replace(/<\/td>/g, '</AppTableCell>');

    if (before !== content) {
      changed = true;
      if (!content.includes('AppTableContainer')) {
        content = content.replace(/^(import .*)$/m, "$1\nimport { AppTableContainer, AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from '@/components/ui/AppTable';");
      }
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}

console.log("Done.");
